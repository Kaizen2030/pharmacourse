begin;

create table if not exists public.leaderboard_reset_state (
  id integer primary key default 1 check (id = 1),
  last_reset_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.leaderboard_reset_state (id, last_reset_at)
values (1, null)
on conflict (id) do nothing;

alter table public.leaderboard_reset_state enable row level security;

grant select on public.leaderboard_reset_state to authenticated;
grant insert, update on public.leaderboard_reset_state to authenticated;

drop policy if exists "Admins can read leaderboard reset state" on public.leaderboard_reset_state;
create policy "Admins can read leaderboard reset state"
on public.leaderboard_reset_state
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can manage leaderboard reset state" on public.leaderboard_reset_state;
create policy "Admins can manage leaderboard reset state"
on public.leaderboard_reset_state
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.reset_monthly_leaderboard()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_super_admin boolean;
  reset_time timestamptz := now();
begin
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and role = 'admin'
      and admin_role = 'super'
  )
  into caller_is_super_admin;

  if not caller_is_super_admin then
    raise exception 'Only super admins can reset the monthly leaderboard.';
  end if;

  insert into public.leaderboard_reset_state (id, last_reset_at, updated_at)
  values (1, reset_time, reset_time)
  on conflict (id) do update
    set last_reset_at = excluded.last_reset_at,
        updated_at = excluded.updated_at;

  return reset_time;
end;
$$;

grant execute on function public.reset_monthly_leaderboard() to authenticated;

comment on table public.leaderboard_reset_state is
'Stores the last time the monthly leaderboard was reset by a super admin.';

commit;
