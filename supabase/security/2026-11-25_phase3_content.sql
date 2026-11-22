-- PHASE 3 (part 1): paid lesson content is readable only by people who may study the course. Re-runnable.
-- Requires Phase 1 (can_study_course) and Phase 2.
-- Rollback: rollback-emergency-only/2026-11-25_phase3_content_rollback.sql
--
-- Problems (confirmed in the live snapshot):
-- 1. "Anyone can view modules of published courses" lets anyone, signed out too, read every column of every module
--    of a published course, including video_url and content, so paid lessons were free to anyone who looked.
-- 2. lesson_attachments (file_url) is readable by everyone (three duplicate "public read" policies).
--
-- After this:
-- - Visitors and the catalogue read course_outline (title, description, order, duration only).
-- - course_modules rows (with video_url / content) are visible only to enrolled students, the course's tutors and
--   admins. Admin editing is unchanged.
-- - Attachments are visible only to the same people.
-- Part 2 (signed, short-lived video links from a streaming host) follows once a host is chosen.

-- 1. Public outline: what a course page needs, nothing else ------------------------------------------------------
create or replace view public.course_outline as
  select m.id, m.course_id, m.title, m.description, m.order_index, m.duration_minutes
    from public.course_modules m
    join public.courses c on c.id = m.course_id
   where c.is_published = true;
comment on view public.course_outline is 'Public module outline of published courses: no video_url or content.';
revoke all on public.course_outline from public, anon, authenticated;
grant select on public.course_outline to anon, authenticated;

-- 2. Lesson rows only for people who may study the course ---------------------------------------------------------
drop policy if exists "Anyone can view modules of published courses" on public.course_modules;
drop policy if exists "Users can view modules of enrolled courses" on public.course_modules;
drop policy if exists "Students and tutors can view lessons" on public.course_modules;
create policy "Students and tutors can view lessons" on public.course_modules
  for select to authenticated using (public.can_study_course(course_id));
revoke all on public.course_modules from anon;

-- 3. Attachments: same rule ----------------------------------------------------------------------------------------
drop policy if exists "Students can read attachments" on public.lesson_attachments;
drop policy if exists "public read attachments" on public.lesson_attachments;
drop policy if exists "Anyone can read attachments" on public.lesson_attachments;
drop policy if exists "Students and tutors can read attachments" on public.lesson_attachments;
drop policy if exists "Admins can manage attachments" on public.lesson_attachments;
create policy "Students and tutors can read attachments" on public.lesson_attachments
  for select to authenticated
  using (exists (select 1 from public.course_modules m where m.id = lesson_attachments.lesson_id and public.can_study_course(m.course_id)));
create policy "Admins can manage attachments" on public.lesson_attachments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.lesson_attachments from anon;
