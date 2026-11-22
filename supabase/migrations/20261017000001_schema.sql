-- 「놓다」 핵심 스키마
-- 원칙: 남기지 않는다 / 목록을 보여주지 않는다 / 한 번에 하나

create extension if not exists pgcrypto;

create type public.ritual_method as enum ('discard', 'donate', 'give');
create type public.ritual_status as enum ('in_progress', 'cooling', 'released', 'kept');
create type public.ritual_step   as enum ('select', 'name', 'farewell', 'method', 'release');

create table public.rituals (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  step                public.ritual_step   not null default 'select',
  item_name           text check (item_name is null or char_length(item_name) between 1 and 30),
  feeling_text        text check (feeling_text is null or char_length(feeling_text) between 1 and 100),
  farewell_text       text check (farewell_text is null or char_length(farewell_text) <= 100),
  photo_path          text,
  method              public.ritual_method,
  status              public.ritual_status not null default 'in_progress',
  cooling_days        smallint check (cooling_days is null or cooling_days in (3, 7)),
  cooling_until       timestamptz,
  cooling_prompted_at timestamptz,
  released_at         timestamptz,
  purge_at            timestamptz,
  created_at          timestamptz not null default now(),
  constraint released_needs_times check (status <> 'released' or (released_at is not null and purge_at is not null)),
  constraint cooling_needs_until  check (status <> 'cooling'  or cooling_until is not null),
  constraint kept_needs_purge     check (status <> 'kept'     or purge_at is not null)
);

comment on table public.rituals is '진행 중·냉각 중인 의식. released/kept 행은 purge 대기용이며 클라이언트에 노출되지 않는다.';

-- 원칙 4: 한 번에 하나
create unique index rituals_one_active_per_user on public.rituals (user_id)
  where status in ('in_progress', 'cooling');

create index rituals_purge_idx on public.rituals (purge_at)
  where status in ('released', 'kept');

-- 숫자만 보관. 물건 정보와 연결되는 FK 없음
create table public.user_stats (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  released_count integer not null default 0 check (released_count >= 0),
  updated_at     timestamptz not null default now()
);

-- 테스트용 시간 단위: 'days' | 'minutes'
create table public.app_config (
  key   text primary key,
  value text not null
);
insert into public.app_config (key, value) values ('time_unit', 'days');

-- 시간 단위 1개를 interval로
create or replace function public.ritual_time_unit()
returns interval
language sql
stable
security definer
set search_path = public
as $$
  select case (select value from public.app_config where key = 'time_unit')
    when 'minutes' then interval '1 minute'
    else interval '1 day'
  end;
$$;
revoke all on function public.ritual_time_unit() from public;
