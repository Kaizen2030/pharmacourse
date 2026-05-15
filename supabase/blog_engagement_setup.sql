-- Blog engagement setup for PharmaCourse
-- Run this in the Supabase SQL editor after blog_posts_setup.sql.

begin;

alter table public.blog_posts
  add column if not exists view_count bigint not null default 0,
  add column if not exists like_count bigint not null default 0;

create table if not exists public.blog_post_likes (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  visitor_key text not null,
  created_at timestamptz not null default now(),
  unique (post_id, visitor_key)
);

create index if not exists blog_post_likes_post_idx
  on public.blog_post_likes (post_id, created_at desc);

alter table public.blog_post_likes enable row level security;

drop function if exists public.get_blog_post_engagement(text, text);
create or replace function public.get_blog_post_engagement(post_slug text, visitor_key text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_post public.blog_posts%rowtype;
  normalized_visitor_key text := nullif(btrim(visitor_key), '');
  viewer_liked boolean := false;
begin
  select *
  into target_post
  from public.blog_posts
  where slug = post_slug
    and is_published = true
  limit 1;

  if target_post.id is null then
    return jsonb_build_object(
      'view_count', 0,
      'like_count', 0,
      'viewer_liked', false
    );
  end if;

  if normalized_visitor_key is not null then
    select exists (
      select 1
      from public.blog_post_likes
      where post_id = target_post.id
        and public.blog_post_likes.visitor_key = normalized_visitor_key
    )
    into viewer_liked;
  end if;

  return jsonb_build_object(
    'view_count', coalesce(target_post.view_count, 0),
    'like_count', coalesce(target_post.like_count, 0),
    'viewer_liked', viewer_liked
  );
end;
$$;

drop function if exists public.record_blog_post_view(text);
create or replace function public.record_blog_post_view(post_slug text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_view_count bigint := 0;
begin
  update public.blog_posts
  set view_count = coalesce(view_count, 0) + 1
  where slug = post_slug
    and is_published = true
  returning view_count into updated_view_count;

  return coalesce(updated_view_count, 0);
end;
$$;

drop function if exists public.toggle_blog_post_like(text, text);
create or replace function public.toggle_blog_post_like(post_slug text, visitor_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_post_id uuid;
  normalized_visitor_key text := nullif(btrim(visitor_key), '');
  inserted_like boolean := false;
  updated_like_count bigint := 0;
  viewer_liked boolean := false;
begin
  if normalized_visitor_key is null then
    return jsonb_build_object(
      'like_count', 0,
      'viewer_liked', false
    );
  end if;

  select id
  into target_post_id
  from public.blog_posts
  where slug = post_slug
    and is_published = true
  limit 1;

  if target_post_id is null then
    return jsonb_build_object(
      'like_count', 0,
      'viewer_liked', false
    );
  end if;

  begin
    insert into public.blog_post_likes (post_id, visitor_key)
    values (target_post_id, normalized_visitor_key);
    inserted_like := true;
  exception
    when unique_violation then
      inserted_like := false;
  end;

  if inserted_like then
    viewer_liked := true;
  else
    delete from public.blog_post_likes
    where post_id = target_post_id
      and public.blog_post_likes.visitor_key = normalized_visitor_key;

    viewer_liked := false;
  end if;

  select count(*)
  into updated_like_count
  from public.blog_post_likes
  where post_id = target_post_id;

  update public.blog_posts
  set like_count = updated_like_count
  where id = target_post_id;

  return jsonb_build_object(
    'like_count', coalesce(updated_like_count, 0),
    'viewer_liked', viewer_liked
  );
end;
$$;

grant execute on function public.get_blog_post_engagement(text, text) to anon, authenticated;
grant execute on function public.record_blog_post_view(text) to anon, authenticated;
grant execute on function public.toggle_blog_post_like(text, text) to anon, authenticated;

comment on table public.blog_post_likes is
'Anonymous or signed-out blog likes tracked per browser visitor key.';

comment on function public.record_blog_post_view(text) is
'Increments the public view counter for a published blog post.';

comment on function public.toggle_blog_post_like(text, text) is
'Toggles a public like for a published blog post using a visitor key stored in the browser.';

commit;
