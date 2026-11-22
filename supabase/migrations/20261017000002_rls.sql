-- RLS: 본인 데이터만, 그것도 진행 중·냉각 중인 행만 읽을 수 있다.
-- 쓰기 정책은 두지 않는다 → 모든 상태 전이는 SECURITY DEFINER RPC로만 가능.

alter table public.rituals    enable row level security;
alter table public.user_stats enable row level security;
alter table public.app_config enable row level security;

create policy "rituals: owner reads active only"
  on public.rituals for select
  to authenticated
  using (user_id = (select auth.uid()) and status in ('in_progress', 'cooling'));

create policy "user_stats: owner reads own"
  on public.user_stats for select
  to authenticated
  using (user_id = (select auth.uid()));

-- app_config: 정책 없음 (service role 및 definer 함수만 접근)

revoke all on public.rituals    from anon, authenticated;
revoke all on public.user_stats from anon, authenticated;
revoke all on public.app_config from anon, authenticated;
grant select on public.rituals    to authenticated;
grant select on public.user_stats to authenticated;
