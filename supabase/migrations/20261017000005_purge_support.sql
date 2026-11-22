-- purge 지원: Edge Function(service role)이 호출하는 보조 함수.
-- 만료 행 조회 → (함수가 Storage 삭제) → 성공한 행만 삭제.

create or replace function public.expired_rituals(p_limit integer default 200)
returns table (id uuid, photo_path text)
language sql
security definer
set search_path = public
as $$
  select id, photo_path from public.rituals
  where status in ('released', 'kept') and purge_at <= now()
  order by purge_at
  limit p_limit;
$$;

create or replace function public.purge_rituals(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  delete from public.rituals
   where id = any(p_ids) and status in ('released', 'kept');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expired_rituals(integer) from public, anon, authenticated;
revoke all on function public.purge_rituals(uuid[])    from public, anon, authenticated;
grant execute on function public.expired_rituals(integer) to service_role;
grant execute on function public.purge_rituals(uuid[])    to service_role;
