# 「놓다」 프로젝트 컨텍스트

## 개요
물건 하나를 버리는 의식으로 감정을 함께 보내는 서비스. 철학: "마음은 다스리는 것이 아니라 버리는 것이다."
절대 원칙: 남기지 않는다(7일 후 하드 삭제) / 목록 없음(숫자만) / 혼자(소셜 없음) / 한 번에 하나 / 서두르지 않음.

## 스택 · 실행
Next 15.5 App Router · React 19 · TypeScript 5 · Tailwind 4 · Supabase(매직링크, Postgres, Storage, pg_cron+pg_net → Edge Function) · Serwist PWA
- 실행은 Docker: `pnpm db:start`(Supabase CLI) + `docker compose up -d --build`(Next, http://localhost:3100). 상세는 README.md
- 로컬은 시간 단위 분(`app_config.time_unit=minutes`, `RITUAL_TIME_UNIT=minutes`)
- 로컬 cron Vault 등록: `scripts/setup-local-cron.sh`

## 현재 상태 (2026-10-17)
- **MVP 구현 완료.** git 미초기화, 커밋 없음.
- 테스트: unit 14 / integration 15 통과. 프로덕션 빌드 통과. Lighthouse 모바일 접근성 100(4페이지).
- 브라우저 수동 검증 완료: 로그인 → 5단계 → 냉각 → 다시 묻기 → 보내기 → purge.
- 설계·변경 기록: `docs/DESIGN.md` (§6 결정 사항, §7 구현 결과)

## 구조 요약
- `supabase/migrations/` 0001 스키마 · 0002 RLS(select만, 쓰기는 RPC) · 0003 상태 전이 RPC · 0004 Storage 버킷 · 0005 purge RPC · 0006 pg_cron · 0007 사진 경로 고정(`{uid}/{ritual_id}.jpg`, 미제출 업로드 고아 사진도 purge/keep 시 삭제)
- `supabase/functions/purge-expired/` 만료 행 + 사진 하드 삭제 (service role 전용)
- `lib/ritual/` actions(서버 액션) · queries(활성 의식 1건만) · steps(가드) · schema(zod)
- `lib/safety/` + `config/safety-keywords.json` 유품·위기 키워드 감지
- `app/ritual/{select,name,farewell,method,release,cooling}` 의식 화면, `app/account` 계정 삭제

## 알려진 한계 · 다음 후보
- Supabase DB 일일 백업에는 텍스트가 보존 기간 동안 남을 수 있음(사진은 해당 없음). PITR 끄기 권장. 완전 해결은 crypto-shredding(후속).
- 사진 업로드 브라우저 E2E 미실시(integration으로 Storage 검증).
- 배포(Vercel + Supabase 프로젝트) 미실시. 절차는 README "배포 메모".
