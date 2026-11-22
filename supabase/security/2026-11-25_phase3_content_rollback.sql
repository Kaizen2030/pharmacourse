-- ROLLBACK for 2026-11-25_phase3_content.sql. Restores the live rules of 2026-11-23.
-- Warning: this makes paid lesson videos and attachments public again.

drop policy if exists "Students and tutors can view lessons" on public.course_modules;
drop policy if exists "Anyone can view modules of published courses" on public.course_modules;
drop policy if exists "Users can view modules of enrolled courses" on public.course_modules;
create policy "Anyone can view modules of published courses" on public.course_modules for select to public
  using (exists (select 1 from public.courses where courses.id = course_modules.course_id and courses.is_published = true));
create policy "Users can view modules of enrolled courses" on public.course_modules for select to authenticated
  using ((course_id in (select ce.course_id from public.course_enrollments ce where ce.user_id = auth.uid()))
         or (course_id in (select c.id from public.courses c where c.instructor_id = auth.uid()))
         or is_admin());
grant select on public.course_modules to anon;

drop policy if exists "Students and tutors can read attachments" on public.lesson_attachments;
drop policy if exists "Admins can manage attachments" on public.lesson_attachments;
create policy "Students can read attachments" on public.lesson_attachments for select to public using (true);
create policy "public read attachments" on public.lesson_attachments for select to public using (true);
create policy "Anyone can read attachments" on public.lesson_attachments for select to public using (true);
grant select on public.lesson_attachments to anon;

-- The course_outline view is harmless and is kept; the website reads it. To remove it too:
--   drop view if exists public.course_outline;
