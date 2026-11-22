-- pg_cron + pg_net: 5분마다 purge-expired Edge Function 호출.
-- 함수 URL과 service key는 Vault에 둔다 (seed 또는 운영 시 수동 등록).
--   select vault.create_secret('http://host:54321/functions/v1/purge-expired', 'purge_fn_url');
--   select vault.create_secret('<service_role_key>', 'purge_fn_key');

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net  with schema extensions;

create or replace function public.invoke_purge_expired()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'purge_fn_url';
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'purge_fn_key';
  if v_url is null or v_key is null then
    raise notice 'purge secrets missing; skipping';
    return;
  end if;
  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    body    := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$$;
revoke all on function public.invoke_purge_expired() from public, anon, authenticated;

select cron.schedule('purge-expired-rituals', '*/5 * * * *', $$select public.invoke_purge_expired()$$);
