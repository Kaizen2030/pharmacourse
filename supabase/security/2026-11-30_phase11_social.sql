-- PHASE 11: social channels and social posts (posters and videos). Pharmacourse project. Re-runnable.
-- Rollback: rollback-emergency-only/2026-11-30_phase11_social_rollback.sql      Needs Phase 2 (is_admin) and Phase 9 (require_admin).
--
-- 1. site_social_links: your channel links, shown as icons in the site footer (public read, admins edit).
-- 2. social_posts: posts written in Admin > Blog & site > Social. Admins only. The social-publish Edge Function
--    sends a post to your publishing service (Ayrshare, or a Make/Zapier webhook) and records the result per network.
-- 3. Storage bucket "social-media" for posters and videos: anyone can view (they are public posts), admins upload.

begin;

create table if not exists public.site_social_links (
  network text primary key check (network in ('facebook', 'instagram', 'tiktok', 'linkedin', 'x', 'youtube', 'whatsapp')),
  url text check (url is null or url ~* '^https://'),
  show_in_footer boolean not null default true,
  display_order integer not null default 100,
  updated_at timestamptz not null default now()
);
insert into public.site_social_links (network, display_order) values
  ('facebook', 1), ('instagram', 2), ('tiktok', 3), ('linkedin', 4), ('x', 5), ('youtube', 6), ('whatsapp', 7)
on conflict (network) do nothing;
alter table public.site_social_links enable row level security;
revoke all on public.site_social_links from anon, authenticated;
grant select on public.site_social_links to anon, authenticated;
grant update on public.site_social_links to authenticated;
drop policy if exists "Anyone reads social links" on public.site_social_links;
create policy "Anyone reads social links" on public.site_social_links for select to anon, authenticated using (true);
drop policy if exists "Admins edit social links" on public.site_social_links;
create policy "Admins edit social links" on public.site_social_links for update to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  caption text not null default '' check (char_length(caption) <= 5000),
  link_url text check (link_url is null or link_url ~* '^https://'),
  media_url text check (media_url is null or media_url ~* '^https://'),
  media_type text check (media_type is null or media_type in ('image', 'video')),
  networks text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'publishing', 'published', 'partial', 'failed')),
  scheduled_for timestamptz,
  results jsonb not null default '{}'::jsonb,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  check (networks <@ array['facebook', 'instagram', 'tiktok', 'linkedin', 'x', 'youtube']::text[])
);
create index if not exists social_posts_created_idx on public.social_posts (created_at desc);
create index if not exists social_posts_due_idx on public.social_posts (scheduled_for) where status = 'scheduled';
alter table public.social_posts enable row level security;
revoke all on public.social_posts from anon, authenticated;
grant select, insert, update, delete on public.social_posts to authenticated;
drop policy if exists "Admins manage social posts" on public.social_posts;
create policy "Admins manage social posts" on public.social_posts for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Posts that are due (used by the scheduler; server key or admin only).
create or replace function public.due_social_posts()
returns setof public.social_posts language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.request_is_trusted_backend() or public.is_admin()) then raise exception 'Admins only.'; end if;
  return query select * from public.social_posts where status = 'scheduled' and scheduled_for <= now() order by scheduled_for limit 20;
end $$;
revoke all on function public.due_social_posts() from public, anon;
grant execute on function public.due_social_posts() to authenticated;

-- Storage for posters and videos (skipped where the storage schema is absent, e.g. local tests).
do $$
begin
  if to_regclass('storage.buckets') is null then return; end if;
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('social-media', 'social-media', true, 104857600,
          array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm'])
  on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

  execute 'drop policy if exists "Social media is public" on storage.objects';
  execute 'create policy "Social media is public" on storage.objects for select to anon, authenticated using (bucket_id = ''social-media'')';
  execute 'drop policy if exists "Admins upload social media" on storage.objects';
  execute 'create policy "Admins upload social media" on storage.objects for insert to authenticated with check (bucket_id = ''social-media'' and public.is_admin())';
  execute 'drop policy if exists "Admins change social media" on storage.objects';
  execute 'create policy "Admins change social media" on storage.objects for update to authenticated using (bucket_id = ''social-media'' and public.is_admin())';
  execute 'drop policy if exists "Admins delete social media" on storage.objects';
  execute 'create policy "Admins delete social media" on storage.objects for delete to authenticated using (bucket_id = ''social-media'' and public.is_admin())';
end $$;

commit;
