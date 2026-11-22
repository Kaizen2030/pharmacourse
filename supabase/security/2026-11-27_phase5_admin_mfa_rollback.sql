-- ROLLBACK for 2026-11-27_phase5_admin_mfa.sql: admin powers no longer need two-step verification.
-- Admin pages in the website still ask for the code; only the database check is removed.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_profiles where id = auth.uid() and role = 'admin');
$$;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_profiles where id = auth.uid() and role = 'admin' and admin_role = 'super');
$$;
grant execute on function public.is_super_admin() to anon, authenticated;

-- Kept (harmless): public.session_passed_mfa().
