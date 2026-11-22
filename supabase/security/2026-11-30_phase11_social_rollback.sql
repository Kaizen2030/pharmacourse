-- ROLLBACK for 2026-11-30_phase11_social.sql
-- Removes the scheduler function and the storage policies. The tables are kept (they hold your posts and links);
-- drop them by hand if you are sure:  drop table public.social_posts, public.site_social_links;
-- Uploaded files stay in the "social-media" bucket until you delete them in Supabase > Storage.

begin;
drop function if exists public.due_social_posts();
do $$
begin
  if to_regclass('storage.objects') is null then return; end if;
  execute 'drop policy if exists "Social media is public" on storage.objects';
  execute 'drop policy if exists "Admins upload social media" on storage.objects';
  execute 'drop policy if exists "Admins change social media" on storage.objects';
  execute 'drop policy if exists "Admins delete social media" on storage.objects';
end $$;
-- Close write access to the tables (admins keep it only through the policies, which stay).
revoke insert, update, delete on public.social_posts from authenticated;
commit;
