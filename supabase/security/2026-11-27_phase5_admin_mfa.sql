-- PHASE 5: admin powers need two-step verification. Pharmacourse project. Re-runnable.
-- Rollback: 2026-11-27_phase5_admin_mfa_rollback.sql
--
-- After this, is_admin() and is_super_admin() are true only for a session that passed the authenticator-app check
-- (Supabase "aal2"). A stolen admin password alone gives no admin powers, in the website or through the API.
-- The SQL editor and the service key are unaffected, so you can never be locked out.
--
-- ORDER: deploy the website first (admin pages then ask each admin to set up an authenticator app), make sure every
-- admin has done it (step 1 below), then run step 2.

-- STEP 1 (read-only): every admin should show has_authenticator = true before you run step 2.
select up.email, up.role, up.admin_role,
       exists (select 1 from auth.mfa_factors f where f.user_id = up.id and f.status = 'verified') as has_authenticator
  from public.user_profiles up
 where up.role = 'admin'
 order by has_authenticator, up.email;

-- STEP 2: enforce.
create or replace function public.session_passed_mfa()
returns boolean language sql stable as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;
grant execute on function public.session_passed_mfa() to anon, authenticated;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.session_passed_mfa()
     and exists (select 1 from public.user_profiles where id = auth.uid() and role = 'admin');
$$;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.session_passed_mfa()
     and exists (select 1 from public.user_profiles where id = auth.uid() and role = 'admin' and admin_role = 'super');
$$;
grant execute on function public.is_super_admin() to anon, authenticated;

-- Lost phone: remove that admin's authenticator here (SQL editor), then they set up a new one at their next sign-in:
--   delete from auth.mfa_factors where user_id = (select id from auth.users where email = 'admin@example.com');
