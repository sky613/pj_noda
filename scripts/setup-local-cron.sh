#!/usr/bin/env bash
# 로컬 Supabase에서 pg_cron이 purge-expired Edge Function을 호출할 수 있게 Vault 비밀을 등록한다.
# DB 컨테이너 → Kong 게이트웨이(내부 네트워크) 경로를 사용한다.
set -euo pipefail
cd "$(dirname "$0")/.."
eval "$(pnpm supabase status -o env 2>/dev/null | grep -E '^SERVICE_ROLE_KEY=')"
PROJECT_ID=$(grep -E '^project_id' supabase/config.toml | sed -E 's/.*"(.*)"/\1/')
FN_URL="http://supabase_kong_${PROJECT_ID}:8000/functions/v1/purge-expired"
docker exec "supabase_db_${PROJECT_ID}" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -Atc "
delete from vault.secrets where name in ('purge_fn_url', 'purge_fn_key');
select vault.create_secret('${FN_URL}', 'purge_fn_url');
select vault.create_secret('${SERVICE_ROLE_KEY}', 'purge_fn_key');
select 'vault ok: ' || count(*) from vault.secrets where name in ('purge_fn_url', 'purge_fn_key');
"
