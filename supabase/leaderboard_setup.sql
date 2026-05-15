begin;

alter table public.course_enrollments
add column if not exists completed_at timestamptz;

create table if not exists public.leaderboard_reset_state (
  id integer primary key default 1 check (id = 1),
  last_reset_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.leaderboard_reset_state (id, last_reset_at)
values (1, null)
on conflict (id) do nothing;

update public.course_enrollments ce
set completed_at = progress.latest_completed_at
from (
  select
    cp.user_id,
    cp.course_id,
    max(cp.completed_at) as latest_completed_at
  from public.course_progress cp
  where cp.completed = true
    and cp.completed_at is not null
  group by cp.user_id, cp.course_id
) progress
where ce.user_id = progress.user_id
  and ce.course_id = progress.course_id
  and ce.completed_at is null
  and coalesce(ce.status, 'enrolled') = 'completed';

create or replace function public.get_leaderboard(time_scope text default 'all')
returns table (
  user_id uuid,
  display_name text,
  completed_courses bigint,
  total_cpd_hours numeric,
  certificates_issued bigint,
  latest_completed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with reset_state as (
    select coalesce(last_reset_at, date_trunc('month', now())) as last_reset_at
    from public.leaderboard_reset_state
    where id = 1
  ),
  completed_enrollments as (
    select
      ce.user_id,
      ce.course_id,
      max(ce.completed_at) as completed_at,
      max(coalesce(c.cpd_hours, 2)) as cpd_hours
    from public.course_enrollments ce
    left join public.courses c on c.id = ce.course_id
    where coalesce(ce.status, 'enrolled') = 'completed'
      and ce.completed_at is not null
    group by ce.user_id, ce.course_id
  ),
  filtered_enrollments as (
    select *
    from completed_enrollments
    where case
      when lower(coalesce(time_scope, 'all')) in ('month', 'this_month')
        then completed_at >= coalesce((select last_reset_at from reset_state), date_trunc('month', now()))
      else true
    end
  ),
  certificate_counts as (
    select
      fe.user_id,
      count(distinct cert.id)::bigint as certificates_issued
    from filtered_enrollments fe
    left join public.certificates cert
      on cert.user_id = fe.user_id
     and cert.course_id = fe.course_id
    group by fe.user_id
  )
  select
    fe.user_id,
    coalesce(nullif(up.full_name, ''), 'PharmaCourse Learner') as display_name,
    count(distinct fe.course_id)::bigint as completed_courses,
    coalesce(sum(fe.cpd_hours), 0)::numeric as total_cpd_hours,
    coalesce(cc.certificates_issued, 0)::bigint as certificates_issued,
    max(fe.completed_at) as latest_completed_at
  from filtered_enrollments fe
  join public.user_profiles up on up.id = fe.user_id
  left join certificate_counts cc on cc.user_id = fe.user_id
  group by fe.user_id, up.full_name, cc.certificates_issued
  order by
    completed_courses desc,
    total_cpd_hours desc,
    certificates_issued desc,
    latest_completed_at desc
  limit 20;
$$;

grant execute on function public.get_leaderboard(text) to authenticated;

commit;
