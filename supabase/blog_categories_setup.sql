-- Blog categories setup for PharmaCourse
-- Run this in the Supabase SQL editor.
-- This keeps blog categories flexible while giving admins a clean manager
-- and a consistent source for public blog filter tabs.

begin;

create table if not exists public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists blog_categories_slug_idx
  on public.blog_categories (slug);

create index if not exists blog_categories_active_idx
  on public.blog_categories (is_active, name);

alter table public.blog_categories enable row level security;

grant select on public.blog_categories to anon, authenticated;
grant insert, update, delete on public.blog_categories to authenticated;

drop policy if exists "Public can view active blog categories" on public.blog_categories;
create policy "Public can view active blog categories"
on public.blog_categories
for select
to public
using (is_active = true);

drop policy if exists "Admins can manage blog categories" on public.blog_categories;
create policy "Admins can manage blog categories"
on public.blog_categories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

comment on table public.blog_categories is
'Admin-managed blog categories used for normalized labels and public filter tabs.';

commit;
