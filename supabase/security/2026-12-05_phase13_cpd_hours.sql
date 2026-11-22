-- PHASE 13: real CPD hours per course. Re-runnable.
-- Pharmacourse project. Rollback: rollback-emergency-only/2026-12-05_phase13_cpd_hours_rollback.sql
--
-- Problem: an old setup file (supabase/courses_cpd_hours_setup.sql) gave every course 2 CPD hours by default, and the
-- admin course editor had no CPD box, so every course showed "2 CPD hours".
-- Fix: no default; a course shows CPD hours only when an admin or tutor sets them (Admin > Courses > Edit > CPD hours).
-- Courses still on the automatic 2 are cleared once (a marker table makes sure this happens only on the first run,
-- so hours you set later are never wiped by running this file again). The leaderboard no longer counts 2 hours for
-- courses without CPD hours.

begin;

do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'courses' and column_name = 'cpd_hours') then
    alter table public.courses add column cpd_hours numeric(5, 2);
  end if;
end $$;
alter table public.courses alter column cpd_hours drop default;
alter table public.courses alter column cpd_hours drop not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'courses_cpd_hours_range') then
    alter table public.courses add constraint courses_cpd_hours_range check (cpd_hours is null or (cpd_hours > 0 and cpd_hours <= 500)) not valid;
  end if;
end $$;
comment on column public.courses.cpd_hours is 'CPD hours awarded on completion. Empty = no CPD hours shown.';

-- One-time clean-up of the automatic 2.
create table if not exists public.schema_markers (name text primary key, applied_at timestamptz not null default now());
alter table public.schema_markers enable row level security;
revoke all on public.schema_markers from anon, authenticated;
do $$ begin
  if not exists (select 1 from public.schema_markers where name = 'phase13_cpd_default_cleared') then
    update public.courses set cpd_hours = null where cpd_hours = 2 or cpd_hours <= 0;
    insert into public.schema_markers (name) values ('phase13_cpd_default_cleared');
  end if;
end $$;
alter table public.courses validate constraint courses_cpd_hours_range;

-- Leaderboard: a course without CPD hours adds 0, not 2 (only if the leaderboard is installed).
do $lb$ begin
  if to_regprocedure('public.get_leaderboard(text)') is null then return; end if;
  execute $f$
create or replace function public.get_leaderboard(time_scope text default 'all')
returns table (user_id uuid, display_name text, completed_courses bigint, total_cpd_hours numeric, certificates_issued bigint, latest_completed_at timestamptz)
language sql stable security definer set search_path = public as $q$
  with reset_state as (
    select coalesce(last_reset_at, date_trunc('month', now())) as last_reset_at from public.leaderboard_reset_state where id = 1
  ),
  completed_enrollments as (
    select ce.user_id, ce.course_id, max(ce.completed_at) as completed_at, max(coalesce(c.cpd_hours, 0)) as cpd_hours
      from public.course_enrollments ce left join public.courses c on c.id = ce.course_id
     where coalesce(ce.status, 'enrolled') = 'completed' and ce.completed_at is not null
     group by ce.user_id, ce.course_id
  ),
  filtered_enrollments as (
    select * from completed_enrollments
     where case when lower(coalesce(time_scope, 'all')) in ('month', 'this_month')
                then completed_at >= coalesce((select last_reset_at from reset_state), date_trunc('month', now()))
                else true end
  ),
  certificate_counts as (
    select fe.user_id, count(distinct cert.id)::bigint as certificates_issued
      from filtered_enrollments fe left join public.certificates cert on cert.user_id = fe.user_id and cert.course_id = fe.course_id
     group by fe.user_id
  )
  select fe.user_id, coalesce(nullif(up.full_name, ''), 'PharmaCourse Learner'), count(distinct fe.course_id)::bigint,
         coalesce(sum(fe.cpd_hours), 0)::numeric, coalesce(cc.certificates_issued, 0)::bigint, max(fe.completed_at)
    from filtered_enrollments fe join public.user_profiles up on up.id = fe.user_id left join certificate_counts cc on cc.user_id = fe.user_id
   group by fe.user_id, up.full_name, cc.certificates_issued
   order by 3 desc, 4 desc, 5 desc, 6 desc
   limit 20;
$q$;
  $f$;
end $lb$;

commit;
