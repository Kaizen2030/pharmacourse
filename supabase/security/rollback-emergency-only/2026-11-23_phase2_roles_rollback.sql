-- ROLLBACK for 2026-11-23_phase2_roles.sql. Restores the policies exactly as they were (live snapshot 2026-11-23).
-- Warning: this re-opens the privilege-escalation hole. Use only if Phase 2 broke something, then fix forward.

drop trigger if exists guard_user_profile_privileges on public.user_profiles;
drop function if exists public.guard_user_profile_privileges();
drop function if exists public.admin_set_role(uuid, text);

drop policy if exists "Super admins can update all profiles" on public.user_profiles;
drop policy if exists "Admins can update all profiles" on public.user_profiles;
create policy "Admins can update all profiles" on public.user_profiles
  for update to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "Instructors can create own profile" on public.instructors;
create policy "Instructors can create own profile" on public.instructors
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "Instructors can manage own courses" on public.courses;
create policy "Instructors can manage own courses" on public.courses
  for all to authenticated using (instructor_id = auth.uid()) with check (instructor_id = auth.uid());

drop policy if exists "Instructors can manage own course modules" on public.course_modules;
create policy "Instructors can manage own course modules" on public.course_modules
  for all to authenticated
  using (exists (select 1 from courses c where c.id = course_modules.course_id and c.instructor_id = auth.uid()))
  with check (exists (select 1 from courses c where c.id = course_modules.course_id and c.instructor_id = auth.uid()));

grant select, insert, update, delete, references, trigger, truncate on public.simulation_responses to anon;

-- Kept on purpose (harmless, holds history): admin_audit_log, is_super_admin(), request_is_trusted_backend().
-- To remove them too:
--   drop table if exists public.admin_audit_log;
--   drop function if exists public.is_super_admin();
--   drop function if exists public.request_is_trusted_backend();
