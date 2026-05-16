-- Course categories setup for PharmaCourse
-- Run this in the Supabase SQL editor.
-- This gives admins a reusable category manager for courses
-- and a consistent source for course filter tabs.

begin;

create table if not exists public.course_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists course_categories_slug_idx
  on public.course_categories (slug);

create index if not exists course_categories_active_idx
  on public.course_categories (is_active, name);

alter table public.course_categories enable row level security;

grant select on public.course_categories to anon, authenticated;
grant insert, update, delete on public.course_categories to authenticated;

drop policy if exists "Public can view active course categories" on public.course_categories;
create policy "Public can view active course categories"
on public.course_categories
for select
to public
using (is_active = true);

drop policy if exists "Admins can manage course categories" on public.course_categories;
create policy "Admins can manage course categories"
on public.course_categories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

comment on table public.course_categories is
'Admin-managed course categories used for normalized labels and public filter tabs.';

commit;
