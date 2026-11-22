# 놓다

물건 하나를 보내는 의식을 통해, 그 물건에 붙은 마음까지 함께 보내는 서비스.
설계와 결정 사항은 [docs/DESIGN.md](docs/DESIGN.md)에 있다.

## 로컬 실행 (Docker)

요구 사항: Docker Desktop, Node 22+, pnpm 10.

```bash
pnpm install
pnpm db:start                 # Supabase 로컬 스택 (Postgres·Auth·Storage·Edge Functions·Mailpit) — Docker
pnpm supabase status -o env   # ANON_KEY / SERVICE_ROLE_KEY 확인 → .env.local 에 기입 (.env.example 참고)
./scripts/setup-local-cron.sh # pg_cron → purge-expired Edge Function 호출용 Vault 비밀 등록
docker compose up -d --build  # Next.js 개발 서버 (http://localhost:3100)
```

- 앱: http://localhost:3100 (3000은 다른 프로젝트가 쓰고 있어 3100 사용)
- 매직링크 메일: http://127.0.0.1:54324 (Mailpit)
- Supabase Studio: http://127.0.0.1:54323

로컬 seed는 `app_config.time_unit = 'minutes'` 로 두어 냉각 3일/7일 → 3분/7분, 삭제 7일 → 7분으로 줄어든다.
`.env.local` 의 `RITUAL_TIME_UNIT=minutes` 는 화면 문구("3분 뒤")를 맞추기 위한 값이다. 프로덕션은 둘 다 `days`.

## 테스트

```bash
pnpm test:unit          # 키워드 감지, 단계 가드, 입력 검증
pnpm test:integration   # 로컬 Supabase 필요: 의식 흐름, RLS, 냉각, purge(행+사진 삭제), 계정 삭제
pnpm typecheck && pnpm build
```

## 절대 원칙이 코드에서 지켜지는 방식

| 원칙 | 구현 |
|---|---|
| 남기지 않는다 | `release_ritual()`이 `purge_at = released_at + 7일` 기록 → pg_cron(5분)이 Edge Function `purge-expired` 호출 → Storage 사진 삭제 후 행 하드 삭제. `kept`는 즉시 삭제 |
| 목록을 보여주지 않는다 | RLS select 정책이 `status in ('in_progress','cooling')` 행만 허용. released 행은 본인도 API로 읽을 수 없다. 조회 함수는 `getActiveRitual` 하나 |
| 혼자 하는 의식 | 소셜·피드·공유 코드 없음 |
| 한 번에 하나 | `rituals(user_id)` 부분 unique index + `start_ritual()` 검사 |
| 서두르게 하지 않는다 | 타이머·스트릭·푸시 없음. 냉각 종료 알림은 앱 내 1회(`cooling_prompted_at`) |

## 배포 메모 (Vercel + Supabase)

1. Supabase 프로젝트에 `supabase db push`, `supabase functions deploy purge-expired`.
2. Vault에 `purge_fn_url`(배포된 함수 URL), `purge_fn_key`(service role) 등록 → cron이 5분마다 호출.
3. `app_config.time_unit` 은 `days` 유지. Auth URL 설정에 `https://<domain>/auth/callback` 추가.
4. Vercel 환경변수: `.env.example` 항목. `SUPABASE_INTERNAL_URL` 은 비운다.
5. PITR(시점 복구)은 끄고, 일일 백업 보존 기간은 최소로 둔다 (docs/DESIGN.md 결정 4 참고).
# pj_noda
