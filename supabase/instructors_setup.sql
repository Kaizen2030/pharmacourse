-- Instructors table setup for PharmaCourse
-- Safe with the existing courses.instructor_id ownership model.
-- Run this in the Supabase SQL editor.

begin;

create table if not exists public.instructors (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  title text,
  bio text,
  photo_url text,
  linkedin_url text,
  years_experience integer,
  specialization text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare
  auth_fk_name text;
begin
  select conname
  into auth_fk_name
  from pg_constraint
  where conrelid = 'public.instructors'::regclass
    and confrelid = 'auth.users'::regclass
    and contype = 'f'
  limit 1;

  if auth_fk_name is not null then
    execute format('alter table public.instructors drop constraint %I', auth_fk_name);
  end if;
end
$$;

alter table public.instructors
alter column id set default gen_random_uuid();

alter table public.courses
add column if not exists instructor_id uuid;

insert into public.instructors (id, name)
select distinct
  c.instructor_id,
  coalesce(nullif(up.full_name, ''), split_part(coalesce(up.email, 'PharmaCourse Instructor'), '@', 1), 'PharmaCourse Instructor')
from public.courses c
left join public.user_profiles up on up.id = c.instructor_id
where c.instructor_id is not null
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'courses_instructor_id_fkey'
      and conrelid = 'public.courses'::regclass
  ) then
    alter table public.courses
    add constraint courses_instructor_id_fkey
    foreign key (instructor_id)
    references public.instructors(id)
    on delete set null;
  end if;
end
$$;

create index if not exists courses_instructor_id_idx
  on public.courses (instructor_id);

alter table public.instructors enable row level security;

grant select on public.instructors to anon, authenticated;
grant insert, update, delete on public.instructors to authenticated;

drop policy if exists "Public can view instructors" on public.instructors;
create policy "Public can view instructors"
on public.instructors
for select
to public
using (true);

drop policy if exists "Instructors can create own profile" on public.instructors;
create policy "Instructors can create own profile"
on public.instructors
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Instructors can update own profile" on public.instructors;
create policy "Instructors can update own profile"
on public.instructors
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Admins can manage instructors" on public.instructors;
create policy "Admins can manage instructors"
on public.instructors
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

comment on table public.instructors is
'Instructor profile records managed in Supabase and referenced by courses.instructor_id.';

commit;
