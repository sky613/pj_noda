-- 상태 전이 RPC. 모두 auth.uid() 기준, SECURITY DEFINER.

-- 현재 사용자의 활성 의식 1건 (없으면 null)
create or replace function public.active_ritual_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.rituals
  where user_id = auth.uid() and status in ('in_progress', 'cooling')
  limit 1;
$$;

-- 1. 시작
create or replace function public.start_ritual()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if public.active_ritual_id() is not null then
    raise exception 'ritual already in progress' using errcode = 'P0001';
  end if;
  insert into public.rituals (user_id) values (v_uid) returning id into v_id;
  return v_id;
end;
$$;

-- 2. 단계 저장. p_payload: {item_name} | {feeling_text} | {farewell_text, photo_path}
create or replace function public.save_ritual_step(p_step public.ritual_step, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := public.active_ritual_id();
  v_row public.rituals%rowtype;
begin
  if v_id is null then raise exception 'no active ritual' using errcode = 'P0002'; end if;
  select * into v_row from public.rituals where id = v_id for update;
  if v_row.status <> 'in_progress' then
    raise exception 'ritual is not editable' using errcode = 'P0003';
  end if;

  if p_step = 'select' then
    update public.rituals
       set item_name = nullif(btrim(p_payload->>'item_name'), ''),
           step = 'name'
     where id = v_id;
  elsif p_step = 'name' then
    if v_row.item_name is null then raise exception 'item_name required first' using errcode = 'P0004'; end if;
    update public.rituals
       set feeling_text = nullif(btrim(p_payload->>'feeling_text'), ''),
           step = 'farewell'
     where id = v_id;
  elsif p_step = 'farewell' then
    if v_row.feeling_text is null then raise exception 'feeling_text required first' using errcode = 'P0004'; end if;
    -- photo_path는 본인 폴더 안이어야 한다
    if p_payload ? 'photo_path' and p_payload->>'photo_path' is not null
       and position(auth.uid()::text || '/' in p_payload->>'photo_path') <> 1 then
      raise exception 'invalid photo_path' using errcode = 'P0005';
    end if;
    update public.rituals
       set farewell_text = nullif(btrim(p_payload->>'farewell_text'), ''),
           photo_path    = case when p_payload ? 'photo_path' then p_payload->>'photo_path' else photo_path end,
           step = 'method'
     where id = v_id;
  else
    raise exception 'unsupported step' using errcode = 'P0006';
  end if;

  -- 필수값 누락 시 check 제약과 별개로 명시적으로 거부
  if p_step = 'select' and (p_payload->>'item_name') is null then
    raise exception 'item_name required' using errcode = 'P0004';
  end if;
  if p_step = 'name' and (p_payload->>'feeling_text') is null then
    raise exception 'feeling_text required' using errcode = 'P0004';
  end if;
end;
$$;

-- 4. 보내는 방법 + 냉각 옵션. p_cooling_days: null(바로) | 3 | 7
create or replace function public.set_ritual_method(p_method public.ritual_method, p_cooling_days smallint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := public.active_ritual_id();
  v_row public.rituals%rowtype;
begin
  if v_id is null then raise exception 'no active ritual' using errcode = 'P0002'; end if;
  select * into v_row from public.rituals where id = v_id for update;
  if v_row.status <> 'in_progress' or v_row.feeling_text is null then
    raise exception 'ritual not ready for method' using errcode = 'P0003';
  end if;

  if p_cooling_days is null then
    update public.rituals
       set method = p_method, cooling_days = null, cooling_until = null, step = 'release'
     where id = v_id;
  else
    update public.rituals
       set method        = p_method,
           cooling_days  = p_cooling_days,
           cooling_until = now() + p_cooling_days * public.ritual_time_unit(),
           status        = 'cooling',
           step          = 'release'
     where id = v_id;
  end if;
end;
$$;

-- 냉각 종료 알림 1회 기록
create or replace function public.mark_cooling_prompted()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid := public.active_ritual_id();
begin
  if v_id is null then raise exception 'no active ritual' using errcode = 'P0002'; end if;
  update public.rituals
     set cooling_prompted_at = coalesce(cooling_prompted_at, now())
   where id = v_id and status = 'cooling';
end;
$$;

-- 5. 보냈어요. released_at 기록, purge_at = +7 단위, 카운트 +1 (단일 트랜잭션)
create or replace function public.release_ritual()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id  uuid := public.active_ritual_id();
  v_uid uuid := auth.uid();
  v_row public.rituals%rowtype;
  v_now timestamptz := now();
begin
  if v_id is null then raise exception 'no active ritual' using errcode = 'P0002'; end if;
  select * into v_row from public.rituals where id = v_id for update;
  if v_row.method is null then raise exception 'method required' using errcode = 'P0003'; end if;
  if v_row.status = 'cooling' and v_row.cooling_until > v_now then
    raise exception 'still cooling' using errcode = 'P0007';
  end if;

  update public.rituals
     set status = 'released', released_at = v_now, purge_at = v_now + 7 * public.ritual_time_unit()
   where id = v_id;

  insert into public.user_stats (user_id, released_count, updated_at)
  values (v_uid, 1, v_now)
  on conflict (user_id) do update
    set released_count = public.user_stats.released_count + 1, updated_at = v_now;
end;
$$;

-- 다시 간직하기. 즉시 purge 대상(kept)으로 전환하고 id·사진 경로를 돌려준다. 카운트 변화 없음.
create or replace function public.keep_ritual()
returns table (id uuid, photo_path text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := public.active_ritual_id();
begin
  if v_id is null then raise exception 'no active ritual' using errcode = 'P0002'; end if;
  return query
    update public.rituals r
       set status = 'kept', purge_at = now()
     where r.id = v_id
     returning r.id, r.photo_path;
end;
$$;

-- 홈 하단 숫자
create or replace function public.released_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select released_count from public.user_stats where user_id = auth.uid()), 0);
$$;

revoke all on function public.active_ritual_id()                                             from public;
revoke all on function public.start_ritual()                                                 from public;
revoke all on function public.save_ritual_step(public.ritual_step, jsonb)                    from public;
revoke all on function public.set_ritual_method(public.ritual_method, smallint)              from public;
revoke all on function public.mark_cooling_prompted()                                        from public;
revoke all on function public.release_ritual()                                               from public;
revoke all on function public.keep_ritual()                                                  from public;
revoke all on function public.released_count()                                               from public;

grant execute on function public.start_ritual()                                    to authenticated;
grant execute on function public.save_ritual_step(public.ritual_step, jsonb)       to authenticated;
grant execute on function public.set_ritual_method(public.ritual_method, smallint) to authenticated;
grant execute on function public.mark_cooling_prompted()                           to authenticated;
grant execute on function public.release_ritual()                                  to authenticated;
grant execute on function public.keep_ritual()                                     to authenticated;
grant execute on function public.released_count()                                  to authenticated;
