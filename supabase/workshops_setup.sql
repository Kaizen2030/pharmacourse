-- Workshops table setup for PharmaCourse
-- Run this in the Supabase SQL editor after your base auth/RLS scripts.

begin;

create table if not exists public.workshops (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  date date,
  time time,
  duration_minutes integer,
  host_name text,
  host_title text,
  is_free boolean not null default true,
  price numeric(10, 2) not null default 0,
  whatsapp_link text,
  is_upcoming boolean not null default true,
  cover_image_url text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workshops_price_non_negative check (price >= 0)
);

create index if not exists workshops_upcoming_date_idx
  on public.workshops (is_upcoming, date, time);

alter table public.workshops enable row level security;

grant select on public.workshops to anon, authenticated;
grant insert, update, delete on public.workshops to authenticated;

drop policy if exists "Public can view workshops" on public.workshops;
create policy "Public can view workshops"
on public.workshops
for select
to public
using (true);

drop policy if exists "Admins can manage workshops" on public.workshops;
create policy "Admins can manage workshops"
on public.workshops
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

comment on table public.workshops is
'Live workshop and webinar listings for the public workshops page.';

comment on column public.workshops.tags is
'Use tags like Recording Available, Webinar, CPD, or Operations. The workshops page uses the tags array to show the recording badge for past sessions.';

commit;
