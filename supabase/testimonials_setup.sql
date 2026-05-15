-- Testimonials table setup for PharmaCourse
-- Run this in the Supabase SQL editor.

begin;

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  author_title text,
  author_photo_url text,
  rating integer not null default 5 check (rating between 1 and 5),
  review_text text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists testimonials_published_created_idx
  on public.testimonials (is_published, created_at desc);

alter table public.testimonials enable row level security;

grant select on public.testimonials to anon, authenticated;
grant insert, update, delete on public.testimonials to authenticated;

drop policy if exists "Public can view published testimonials" on public.testimonials;
create policy "Public can view published testimonials"
on public.testimonials
for select
to public
using (is_published = true);

drop policy if exists "Admins can manage testimonials" on public.testimonials;
create policy "Admins can manage testimonials"
on public.testimonials
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

comment on table public.testimonials is
'Learner and customer testimonials shown on the home page.';

commit;
