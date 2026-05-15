-- Blog posts table setup for PharmaCourse
-- Run this in the Supabase SQL editor.

begin;

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  content text not null,
  content_sections jsonb not null default '[]'::jsonb,
  cover_image_url text,
  author_name text,
  author_title text,
  category text,
  tags text[] not null default '{}',
  is_published boolean not null default false,
  published_at timestamptz,
  view_count bigint not null default 0,
  like_count bigint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.blog_posts
  add column if not exists content_sections jsonb not null default '[]'::jsonb,
  add column if not exists view_count bigint not null default 0,
  add column if not exists like_count bigint not null default 0;

create index if not exists blog_posts_published_idx
  on public.blog_posts (is_published, published_at desc);

create index if not exists blog_posts_slug_idx
  on public.blog_posts (slug);

alter table public.blog_posts enable row level security;

grant select on public.blog_posts to anon, authenticated;
grant insert, update, delete on public.blog_posts to authenticated;

drop policy if exists "Public can view published blog posts" on public.blog_posts;
create policy "Public can view published blog posts"
on public.blog_posts
for select
to public
using (is_published = true);

drop policy if exists "Admins can manage blog posts" on public.blog_posts;
create policy "Admins can manage blog posts"
on public.blog_posts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

comment on table public.blog_posts is
'Published editorial articles and blog posts for the PharmaCourse website.';

comment on column public.blog_posts.content_sections is
'Optional structured blog subsections. Each item can include a title, body, and image_url for richer article layouts.';

commit;
