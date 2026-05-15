-- PharmaCourse / RemedaCare auth + RLS baseline
-- Run this in the Supabase SQL editor.
-- Assumes case_simulations uses creator_id. If your table uses created_by instead,
-- replace creator_id below before running.

begin;

alter table public.user_profiles
add column if not exists professional_id text;

alter table public.course_enrollments
add column if not exists status text default 'enrolled';

create table if not exists public.certificate_settings (
  id integer primary key default 1 check (id = 1),
  organization_name text not null default 'PHARMACOURSE',
  organization_subtitle text not null default 'Professional Pharmacy CPD Platform - Kenya',
  certificate_label text not null default 'Certificate of Completion',
  certificate_title text not null default 'Academic Achievement',
  certifies_text text not null default 'This is to certify that',
  completion_text text not null default 'has successfully completed the course',
  signature_name text not null default 'Julius Wanjau',
  signature_role text not null default 'Director, PharmaCourse',
  footer_text text not null default 'PharmaCourse - Professional Pharmacy CPD Platform - www.pharmacourse.co.ke',
  signature_image_url text,
  left_badge_title text not null default 'CPD',
  left_badge_subtitle text not null default 'Certified',
  left_vertical_text text not null default 'PharmaCourse Kenya',
  updated_at timestamptz not null default now()
);

insert into public.certificate_settings (id)
values (1)
on conflict (id) do nothing;

update public.course_enrollments
set status = 'enrolled'
where status is null;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated, anon;

create or replace function public.verify_certificate(cert_id uuid)
returns table (
  certificate_id uuid,
  issued_date timestamptz,
  learner_name text,
  professional_id text,
  course_title text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id as certificate_id,
    c.issued_date,
    up.full_name as learner_name,
    up.professional_id,
    co.title as course_title
  from public.certificates c
  join public.user_profiles up on up.id = c.user_id
  join public.courses co on co.id = c.course_id
  where c.id = cert_id
  limit 1;
$$;

grant execute on function public.verify_certificate(uuid) to authenticated, anon;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (
    id,
    email,
    full_name,
    professional_id,
    role
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'professional_id', ''),
    'student'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.user_profiles (id, email, full_name, professional_id, role)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', ''),
  coalesce(u.raw_user_meta_data ->> 'professional_id', ''),
  'student'
from auth.users u
left join public.user_profiles p on p.id = u.id
where p.id is null;

alter table public.user_profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.case_simulations enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.course_progress enable row level security;
alter table public.certificates enable row level security;
alter table public.simulation_responses enable row level security;
alter table public.certificate_settings enable row level security;

grant usage on schema public to anon, authenticated;

grant select, insert, update on public.user_profiles to authenticated;
grant select on public.user_profiles to anon;

do $$
declare pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'user_profiles',
        'courses',
        'course_modules',
        'case_simulations',
        'course_enrollments',
        'course_progress',
        'certificates',
        'simulation_responses',
        'certificate_settings'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      pol.policyname,
      pol.schemaname,
      pol.tablename
    );
  end loop;
end
$$;

create policy "Users can read own profile"
on public.user_profiles
for select
to authenticated
using (id = auth.uid());

create policy "Users can insert own profile"
on public.user_profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "Users can update own profile"
on public.user_profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Admins can read all profiles"
on public.user_profiles
for select
to authenticated
using (public.is_admin());

create policy "Admins can update all profiles"
on public.user_profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read certificate settings"
on public.certificate_settings
for select
to public
using (true);

create policy "Admins can manage certificate settings"
on public.certificate_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can view published courses"
on public.courses
for select
to public
using (is_published = true);

create policy "Instructors can view own courses"
on public.courses
for select
to authenticated
using (instructor_id = auth.uid());

create policy "Instructors can manage own courses"
on public.courses
for all
to authenticated
using (instructor_id = auth.uid())
with check (instructor_id = auth.uid());

create policy "Admins can manage courses"
on public.courses
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Anyone can view modules of published courses"
on public.course_modules
for select
to public
using (
  exists (
    select 1
    from public.courses
    where courses.id = course_modules.course_id
      and courses.is_published = true
  )
);

create policy "Users can view modules of enrolled courses"
on public.course_modules
for select
to authenticated
using (
  course_id in (
    select ce.course_id
    from public.course_enrollments ce
    where ce.user_id = auth.uid()
  )
  or course_id in (
    select c.id
    from public.courses c
    where c.instructor_id = auth.uid()
  )
  or public.is_admin()
);

create policy "Instructors can manage own course modules"
on public.course_modules
for all
to authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_modules.course_id
      and c.instructor_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.courses c
    where c.id = course_modules.course_id
      and c.instructor_id = auth.uid()
  )
);

create policy "Admins can manage course modules"
on public.course_modules
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can view published case simulations"
on public.case_simulations
for select
to public
using (
  is_published = true
  or creator_id = auth.uid()
  or public.is_admin()
);

create policy "Creators can manage own case simulations"
on public.case_simulations
for all
to authenticated
using (creator_id = auth.uid())
with check (creator_id = auth.uid());

create policy "Admins can manage case simulations"
on public.case_simulations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Users can read own enrollments"
on public.course_enrollments
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can create own enrollments"
on public.course_enrollments
for insert
to authenticated
with check (
  user_id = auth.uid()
  and coalesce(status, 'enrolled') = 'enrolled'
  and (
    exists (
      select 1
      from public.courses c
      where c.id = course_enrollments.course_id
        and c.is_published = true
    )
    or public.is_admin()
  )
);

create policy "Instructors can read enrollments for own courses"
on public.course_enrollments
for select
to authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_enrollments.course_id
      and c.instructor_id = auth.uid()
  )
);

create policy "Admins can manage enrollments"
on public.course_enrollments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Users can read own progress"
on public.course_progress
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can insert own progress"
on public.course_progress
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    exists (
      select 1
      from public.course_enrollments ce
      where ce.user_id = auth.uid()
        and ce.course_id = course_progress.course_id
    )
    or exists (
      select 1
      from public.courses c
      where c.id = course_progress.course_id
        and c.instructor_id = auth.uid()
    )
    or public.is_admin()
  )
);

create policy "Users can update own progress"
on public.course_progress
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    exists (
      select 1
      from public.course_enrollments ce
      where ce.user_id = auth.uid()
        and ce.course_id = course_progress.course_id
    )
    or exists (
      select 1
      from public.courses c
      where c.id = course_progress.course_id
        and c.instructor_id = auth.uid()
    )
    or public.is_admin()
  )
);

create policy "Admins can manage progress"
on public.course_progress
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Users can read own certificates"
on public.certificates
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can create own certificates"
on public.certificates
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.course_enrollments ce
    where ce.user_id = auth.uid()
      and ce.course_id = certificates.course_id
      and coalesce(ce.status, 'enrolled') = 'enrolled'
  )
  and (
    select count(*)
    from public.course_modules cm
    where cm.course_id = certificates.course_id
  ) > 0
  and (
    select count(*)
    from public.course_progress cp
    where cp.user_id = auth.uid()
      and cp.course_id = certificates.course_id
      and cp.completed = true
  ) >= (
    select count(*)
    from public.course_modules cm
    where cm.course_id = certificates.course_id
  )
);

create policy "Admins can manage certificates"
on public.certificates
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Users can read own simulation responses"
on public.simulation_responses
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can create own simulation responses"
on public.simulation_responses
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.case_simulations cs
    where cs.id = simulation_responses.simulation_id
      and (
        cs.is_published = true
        or cs.creator_id = auth.uid()
        or public.is_admin()
      )
      and (
        cs.course_id is null
        or exists (
          select 1
          from public.course_enrollments ce
          where ce.user_id = auth.uid()
            and ce.course_id = cs.course_id
        )
        or cs.creator_id = auth.uid()
        or public.is_admin()
      )
  )
);

create policy "Admins can manage simulation responses"
on public.simulation_responses
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

commit;
