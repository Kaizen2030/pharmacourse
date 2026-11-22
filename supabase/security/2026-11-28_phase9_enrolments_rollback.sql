-- ROLLBACK for 2026-11-28_phase9_enrolments.sql
-- Removes the admin enrolment functions and the guard trigger, and restores the Phase 1 access rule.
-- The new columns (payment, expiry, note) are kept so no recorded payment information is lost.

begin;

drop function if exists public.admin_learning_stats(integer, uuid);
drop function if exists public.admin_learner_detail(uuid);
drop function if exists public.admin_list_enrolments(text, uuid, text, integer, integer);
drop function if exists public.admin_update_enrolment(uuid, text, timestamptz, text, text, text, numeric);
drop function if exists public.admin_enrol_learner(text, uuid, text, text, text, numeric, timestamptz, text);
drop function if exists public.write_admin_audit(text, uuid, jsonb, jsonb);
drop function if exists public.require_admin();

drop trigger if exists guard_enrollment_admin_fields on public.course_enrollments;
drop function if exists public.guard_enrollment_admin_fields();

create or replace function public.can_study_course(p_course uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    public.is_admin()
    or exists (select 1 from public.course_enrollments e where e.user_id = auth.uid() and e.course_id = p_course
                 and coalesce(e.status, 'enrolled') in ('enrolled', 'completed', 'active'))
    or exists (select 1 from public.courses c left join public.instructors i on i.id = c.instructor_id
                where c.id = p_course and (c.instructor_id = auth.uid() or i.linked_user_id = auth.uid()))
  );
$$;
revoke all on function public.can_study_course(uuid) from public, anon;
grant execute on function public.can_study_course(uuid) to authenticated;

commit;
