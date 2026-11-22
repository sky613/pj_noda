# 「놓다」 MVP 설계안 (확인용)

> 상태: 구현 완료 (2026-10-17, MVP). 아래 설계대로 구현했고, 구현 중 바뀐 점은 §7에 적었다.
> 원칙 충돌 시 원칙(남기지 않는다 / 목록 없음 / 혼자 / 한 번에 하나 / 서두르지 않음)을 따른다.

## 1. 폴더 구조

```
pj_noda/
├── app/
│   ├── layout.tsx                  # 폰트(Pretendard), 테마(dark), PWA 메타, 페이드 래퍼
│   ├── page.tsx                    # 홈 (/)
│   ├── manifest.ts                 # PWA manifest
│   ├── globals.css
│   ├── auth/
│   │   ├── page.tsx                # 이메일 입력 (매직링크)
│   │   ├── sent/page.tsx           # "메일을 보냈어요"
│   │   └── callback/route.ts       # code → session 교환
│   ├── ritual/
│   │   ├── layout.tsx              # 단계 가드(step 리다이렉트) + 위기 안내 하단바
│   │   ├── select/page.tsx         # 1 고르기
│   │   ├── name/page.tsx           # 2 이름 붙이기
│   │   ├── farewell/page.tsx       # 3 작별
│   │   ├── method/page.tsx         # 4 보내는 방법 (+냉각 옵션, 폐기 안내, 무거운 물건 안내)
│   │   ├── release/page.tsx        # 5 보내기 확인 → 비워지는 애니메이션 → "보냈습니다."
│   │   └── cooling/page.tsx        # 냉각 상자 (보관 중 / 기간 종료 시 다시 묻기)
│   └── account/page.tsx            # 로그아웃 · 계정 삭제 (최소 화면)
├── components/
│   ├── ui/                         # Button, TextField, TextArea, FadeIn, VisuallyHidden
│   ├── ritual/                     # StepShell, PhotoPicker, MethodPicker, DisposalGuide,
│   │                               # CoolingPicker, GentleNotice, CrisisFooter, EmptyingScreen
│   └── home/                       # StartButton, ContinueButton, CoolingHint, ReleasedCount
├── lib/
│   ├── supabase/                   # client.ts(browser) server.ts(RSC/actions) admin.ts(service role, 서버 전용)
│   ├── ritual/
│   │   ├── actions.ts              # Server Actions: start/saveStep/setMethod/release/keep/deleteAccount
│   │   ├── queries.ts              # getActiveRitual(): 진행 중·냉각 중 1건만. 목록 조회 함수 없음
│   │   ├── steps.ts                # 단계 순서, 가드, 다음 경로 계산
│   │   └── schema.ts               # zod 입력 검증 (30자/100자 등)
│   ├── safety/
│   │   ├── detect.ts               # heavy / crisis 감지 (순수 함수, 로그 금지)
│   │   └── keywords.ts             # config/safety-keywords.json 로더
│   ├── image/resize.ts             # Canvas 리사이즈(1200px) → JPEG 재인코딩 = EXIF 제거
│   ├── content/disposal-guide.ts   # 폐기 안내 정적 콘텐츠
│   ├── time.ts                     # RITUAL_TIME_UNIT(days|minutes) 기반 표시 문구
│   └── env.ts                      # 환경변수 검증
├── config/
│   └── safety-keywords.json        # { heavy: [...], crisis: [...] } — 수정 가능
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 0001_schema.sql         # enum, rituals, user_stats, app_config, 인덱스
│   │   ├── 0002_rls.sql            # RLS 정책
│   │   ├── 0003_functions.sql      # start/save/set_method/release/keep RPC
│   │   ├── 0004_storage.sql        # ritual-photos 버킷 + 정책
│   │   └── 0005_cron.sql           # pg_cron → pg_net → purge-expired 스케줄
│   ├── functions/
│   │   └── purge-expired/index.ts  # 만료 행 + Storage 사진 하드 삭제 (Edge Function)
│   └── seed.sql                    # app_config.time_unit = 'minutes' (로컬/테스트)
├── tests/
│   ├── unit/                       # detect.test.ts, steps.test.ts, schema.test.ts
│   └── integration/                # purge.test.ts, cooling.test.ts, rls.test.ts (로컬 Supabase 대상)
├── public/icons/                   # PWA 아이콘
├── middleware.ts                    # 미인증 → /auth
├── .env.example
└── docs/DESIGN.md
```

## 2. DB 스키마 (마이그레이션 초안)

### 0001_schema.sql
```sql
create extension if not exists pgcrypto;

create type ritual_method as enum ('discard', 'donate', 'give');
create type ritual_status as enum ('in_progress', 'cooling', 'released', 'kept');
create type ritual_step   as enum ('select', 'name', 'farewell', 'method', 'release');

create table rituals (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  step                ritual_step   not null default 'select',
  item_name           text check (char_length(item_name) between 1 and 30),
  feeling_text        text check (char_length(feeling_text) between 1 and 100),
  farewell_text       text check (char_length(farewell_text) <= 100),
  photo_path          text,                       -- '{user_id}/{ritual_id}.jpg'
  method              ritual_method,
  status              ritual_status not null default 'in_progress',
  cooling_days        smallint check (cooling_days in (3, 7)),
  cooling_until       timestamptz,
  cooling_prompted_at timestamptz,                -- "아직 보내고 싶으신가요?" 1회 노출 기록
  released_at         timestamptz,
  purge_at            timestamptz,                -- released_at + 7일 (kept는 now())
  created_at          timestamptz not null default now(),
  constraint released_needs_times check (status <> 'released' or (released_at is not null and purge_at is not null)),
  constraint cooling_needs_until  check (status <> 'cooling'  or cooling_until is not null)
);

-- 원칙 4: 한 번에 하나
create unique index rituals_one_active_per_user on rituals (user_id)
  where status in ('in_progress', 'cooling');
create index rituals_purge_idx on rituals (purge_at) where status in ('released', 'kept');

-- 숫자만. 물건 정보와 연결되는 FK 없음
create table user_stats (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  released_count integer not null default 0 check (released_count >= 0),
  updated_at     timestamptz not null default now()
);

-- 테스트용 시간 단위 (days | minutes). 클라이언트 접근 불가
create table app_config (key text primary key, value text not null);
insert into app_config values ('time_unit', 'days');
```

### 0002_rls.sql (요지)
- `rituals`: **select** 본인 행 중 `status in ('in_progress','cooling')`만. insert/update/delete 정책 **없음** → 모든 쓰기는 RPC로만.
  - released/kept 행은 본인조차 API로 읽을 수 없다 → "목록 없음"을 DB 레벨에서 보장.
- `user_stats`: select 본인만. 쓰기 정책 없음(함수가 처리).
- `app_config`: 정책 없음(service role · SECURITY DEFINER 함수만 접근).

### 0003_functions.sql (SECURITY DEFINER, `auth.uid()` 기준)
| RPC | 동작 |
|---|---|
| `start_ritual()` | 활성 의식 없을 때만 insert (unique index가 2중 방어) |
| `save_ritual_step(p_step, p_payload jsonb)` | 길이 검증 후 해당 컬럼 저장, `step` 전진 |
| `set_ritual_method(p_method, p_cooling_days)` | `null` → `step='release'` / 3·7 → `status='cooling'`, `cooling_until = now() + N × unit` |
| `mark_cooling_prompted()` | `cooling_prompted_at = now()` (1회 알림 기록) |
| `release_ritual()` | `status='released'`, `released_at=now()`, `purge_at = released_at + 7 × unit`, `user_stats.released_count += 1` (단일 트랜잭션) |
| `keep_ritual()` | `status='kept'`, `purge_at=now()`, `photo_path` 반환 → 서버 액션이 즉시 사진·행 삭제. 카운트 변화 없음 |

`unit`은 `app_config.time_unit`에 따라 `interval '1 day'` 또는 `interval '1 minute'`.

### 0004_storage.sql
- 버킷 `ritual-photos` (private). 경로 `{auth.uid()}/{ritual_id}.jpg`.
- 정책: 본인 폴더에 insert/select/delete. 미리보기는 짧은 signed URL(60초).

### 0005_cron.sql + Edge Function `purge-expired`
- `pg_cron` 5분마다 `pg_net`으로 Edge Function 호출(키는 Vault).
- 함수: `status in ('released','kept') and purge_at <= now()` 행을 최대 200건 조회 → **사진 먼저 삭제**(Storage API) → 성공한 행만 `delete`. 실패 행은 다음 주기 재시도.
- SQL만으로 `storage.objects`를 지우면 실제 파일이 남으므로 Edge Function 필수.

### 계정 삭제
서버 액션(admin client): Storage `{uid}/` 전체 remove → `auth.admin.deleteUser(uid)` → `on delete cascade`로 rituals·user_stats 즉시 삭제.

## 3. 화면 목록

| 경로 | 화면 | 핵심 요소 |
|---|---|---|
| `/` | 홈 | 활성 의식 없음: "보낼 것이 있나요?" + 시작 / in_progress: 이어하기 / cooling: "보관 중인 물건이 하나 있어요" / 하단 "지금까지 보낸 물건 N개" |
| `/auth` `/auth/sent` | 로그인 | 이메일 입력 → 매직링크 안내 |
| `/ritual/select` | 1 고르기 | 물건 이름 (필수, 30자) |
| `/ritual/name` | 2 이름 붙이기 | 감정 문장 (필수, 100자) |
| `/ritual/farewell` | 3 작별 | 사진 1장(선택, 1200px 리사이즈·EXIF 제거) + 마지막 한 마디(선택, 100자) |
| `/ritual/method` | 4 보내는 방법 | 버리기/기부/나눠주기, 바로 보내기 / 3일 / 7일, 버리기 시 폐기 안내, heavy 감지 시 부드러운 안내 + 기본 7일 |
| `/ritual/release` | 5 보내기 확인 | "보냈어요" → 2.5초 비워짐 → "보냈습니다." → 홈으로 |
| `/ritual/cooling` | 냉각 상자 | 기간 중: 이름은 탭해야 표시 / 종료 후: "아직 보내고 싶으신가요?" → 보내기 · 다시 간직하기 |
| `/account` | 계정 | 로그아웃, 계정 삭제(확인 1회) |

- `/ritual/*`는 layout에서 서버 측 가드: 활성 의식의 `step`/`status`에 맞는 경로로 리다이렉트. 활성 의식 없으면 홈으로.
- 위기 키워드 감지 시 `/ritual/*` 하단에 상담 연락처(109, 1577-0199) 고정 노출.
- 전환: 400~600ms 페이드. 버튼 문구: 이어서 / 보내기 / 다시 간직하기 / 조금 더 두기.

## 4. 안전장치
- `config/safety-keywords.json`: `heavy`(유품·사별), `crisis`(자해·자살) 두 목록.
- 감지는 클라이언트(입력 즉시 UI)와 서버(RPC 호출 전 기본값 결정) 양쪽에서 같은 순수 함수 사용. 결과를 로그·분석 도구에 보내지 않는다.
- heavy: method 단계 냉각 기본값 7일 + 안내 1회. crisis: CrisisFooter 노출, 흐름은 계속.

## 5. 테스트 · 완료 조건 매핑
| 완료 조건 | 검증 방법 |
|---|---|
| 1~5단계 끝까지 진행 | Playwright e2e (로컬 Supabase, Inbucket 메일) |
| 냉각 3일/7일 | `time_unit='minutes'`로 integration 테스트 |
| purge 후 행·파일 삭제 | integration: release → `purge_at` 과거로 조정 → 함수 호출 → 행 0건 + Storage 404 |
| 과거 의식 조회 API 없음 | rls.test: owner로 released 행 select → 0건. RPC 목록에 조회용 함수 없음(코드 리뷰 체크리스트) |
| 키워드 안전장치 문구 | unit + e2e |
| Lighthouse 접근성 ≥ 90 | Lighthouse CI(모바일) |

## 6. 결정 사항 · 확인 필요 항목
1. **스키마 추가 컬럼**: `step`, `cooling_days`, `cooling_prompted_at` (기획에 없음, 이어하기·1회 알림 구현에 필요).
2. **쓰기 전부 RPC**: 클라이언트 테이블 쓰기 금지. 상태 전이·카운트·purge_at 계산을 DB가 책임.
3. **`kept` 상태**: 즉시 삭제 원칙이므로 영구 저장되지 않음. 서버 액션 즉시 삭제 + cron 스위퍼 2중 처리용 과도 상태로만 사용.
4. **백업 한계(원칙 1 관련)**: Supabase 플랫폼의 DB 일일 백업(최대 7일 보존)은 선택적 삭제 불가. Storage 파일은 DB 백업 대상이 아님. 텍스트 3개 컬럼은 최악의 경우 purge 후 7일 더 백업에 남을 수 있음 → MVP는 이를 문서화하고 PITR 비활성. 완전 해결(별도 키 저장소 기반 crypto-shredding)은 후속.
5. **홈 화면과 계정 삭제의 충돌**: "그 외 아무것도 두지 않는다" vs 계정 삭제 필수 → 홈 최하단 카운트 옆에 아주 작은 텍스트 링크 "계정" 하나만 둠.
6. **시간 단위**: DB `app_config.time_unit` + Next `RITUAL_TIME_UNIT`(문구용) 두 곳. 로컬 seed는 minutes, 프로덕션은 days.
7. **패키지**: `@supabase/supabase-js`, `@supabase/ssr`(인증 쿠키), `zod`(입력 검증), `@serwist/next`(PWA 서비스워커·설치 가능성), `vitest`, `@playwright/test`. Pretendard는 jsDelivr CDN 가변 폰트(패키지 없음).
8. **분석 도구**: MVP에서는 미연동. 넣을 경우 Vercel Analytics 커스텀 이벤트 이름만(`ritual_step_view:{step}`), 속성 없음.

## 7. 구현 결과 · 설계와 달라진 점 (2026-10-17)

- **실행 환경**: Docker. Supabase 로컬 스택은 Supabase CLI(`supabase` npm 패키지)가 Docker로 띄우고, Next는 `docker-compose.yml`의 `web` 서비스로 띄운다. 포트 3000을 다른 프로젝트가 쓰고 있어 **3100** 사용.
- **`keep_ritual()`**은 `photo_path`만이 아니라 `(id, photo_path)`를 돌려준다. 서버 액션이 사진 → 행 순서로 즉시 삭제하고, 실패 시 cron 스위퍼가 처리한다.
- **purge 전용 RPC** `expired_rituals()`, `purge_rituals()`를 추가(0005). Edge Function은 이 둘만 쓰고 service role 외에는 실행 권한이 없다.
- **로컬 cron**: `scripts/setup-local-cron.sh`가 Vault에 함수 URL(`supabase_kong_pj_noda:8000`)과 키를 넣는다. DB → pg_net → Edge Function 호출을 200으로 확인했다.
- **release 화면**: 서버 액션에서 `revalidatePath`를 하지 않는다. 하면 현재 라우트가 다시 렌더되어 layout 가드가 홈으로 보내 버려 "비워지는" 애니메이션(2.5초)과 "보냈습니다."를 볼 수 없다. 클라이언트가 애니메이션 뒤 `router.refresh()` 한다.
- **페이드 전환**: `transform` 없이 opacity만 쓴다. 조상에 transform이 있으면 `position: fixed`인 상담 연락처 바가 화면 밖으로 밀린다.
- **매직링크 흐름**: PKCE. `/auth/callback`이 code를 세션으로 교환한다. 로컬 메일은 Mailpit(54324).
- **테스트 결과**: unit 14 / integration 15 모두 통과. 브라우저(375px)로 로그인 → 5단계 → 냉각 3분 → 다시 묻기 → 보내기 → "보냈습니다." → 카운트 증가 → purge 실행(행 2건·사진 삭제, 카운트 유지)까지 확인.
- **Lighthouse 모바일 접근성**: `/auth` 100, `/` 100, `/ritual/method` 100, `/account` 100.
- **미구현/보류**: 사진 업로드의 브라우저 E2E(파일 선택 자동화 불가, integration 테스트로 Storage 경로·삭제는 검증). 분석 도구 미연동. 오프라인 전용 페이지 없음(서비스워커는 정적 자산만 캐시, RSC/API는 캐시하지 않음).
