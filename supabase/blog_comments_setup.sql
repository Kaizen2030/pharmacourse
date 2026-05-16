-- Blog comments setup for PharmaCourse
-- Run this in the Supabase SQL editor after blog_posts_setup.sql.

begin;

create table if not exists public.blog_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  commenter_name text not null,
  content text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_comments_content_check check (char_length(btrim(content)) > 0),
  constraint blog_comments_name_check check (char_length(btrim(commenter_name)) > 0)
);

create index if not exists blog_comments_post_created_idx
  on public.blog_comments (post_id, created_at asc);

create index if not exists blog_comments_user_idx
  on public.blog_comments (user_id, created_at desc);

create or replace function public.touch_blog_comment_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists blog_comments_touch_updated_at on public.blog_comments;
create trigger blog_comments_touch_updated_at
before update on public.blog_comments
for each row execute function public.touch_blog_comment_updated_at();

alter table public.blog_comments enable row level security;

grant select on public.blog_comments to anon, authenticated;
grant insert, update, delete on public.blog_comments to authenticated;

drop policy if exists "Public can view visible blog comments" on public.blog_comments;
create policy "Public can view visible blog comments"
on public.blog_comments
for select
to public
using (
  is_hidden = false
  and exists (
    select 1
    from public.blog_posts
    where blog_posts.id = blog_comments.post_id
      and blog_posts.is_published = true
  )
);

drop policy if exists "Authenticated users can add blog comments" on public.blog_comments;
create policy "Authenticated users can add blog comments"
on public.blog_comments
for insert
to authenticated
with check (
  user_id = auth.uid()
  and is_hidden = false
  and exists (
    select 1
    from public.blog_posts
    where blog_posts.id = blog_comments.post_id
      and blog_posts.is_published = true
  )
);

drop policy if exists "Users can update own blog comments" on public.blog_comments;
create policy "Users can update own blog comments"
on public.blog_comments
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own blog comments" on public.blog_comments;
create policy "Users can delete own blog comments"
on public.blog_comments
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins can manage blog comments" on public.blog_comments;
create policy "Admins can manage blog comments"
on public.blog_comments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

comment on table public.blog_comments is
'Logged-in reader comments left on published PharmaCourse blog posts.';

commit;
