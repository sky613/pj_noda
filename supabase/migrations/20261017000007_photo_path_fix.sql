-- 사진 경로를 {user_id}/{ritual_id}.jpg 하나로 고정한다.
-- PhotoPicker는 파일 선택 즉시 업로드하므로, 폼 제출 전에 이탈하면 photo_path가 null인 채로 파일만 남는다.
-- 경로가 결정적이므로 삭제 시 photo_path가 없어도 그 경로를 지워 고아 사진을 막는다.

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
    -- photo_path는 이 의식의 고정 경로만 허용한다
    if p_payload ? 'photo_path' and p_payload->>'photo_path' is not null
       and p_payload->>'photo_path' <> v_row.user_id::text || '/' || v_id::text || '.jpg' then
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

  if p_step = 'select' and (p_payload->>'item_name') is null then
    raise exception 'item_name required' using errcode = 'P0004';
  end if;
  if p_step = 'name' and (p_payload->>'feeling_text') is null then
    raise exception 'feeling_text required' using errcode = 'P0004';
  end if;
end;
$$;

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
     returning r.id, coalesce(r.photo_path, r.user_id::text || '/' || r.id::text || '.jpg');
end;
$$;

create or replace function public.expired_rituals(p_limit integer default 200)
returns table (id uuid, photo_path text)
language sql
security definer
set search_path = public
as $$
  select id, coalesce(photo_path, user_id::text || '/' || id::text || '.jpg') from public.rituals
  where status in ('released', 'kept') and purge_at <= now()
  order by purge_at
  limit p_limit;
$$;
