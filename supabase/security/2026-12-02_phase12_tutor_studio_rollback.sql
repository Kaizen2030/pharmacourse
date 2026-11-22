-- ROLLBACK for 2026-12-02_phase12_tutor_studio.sql: tutors lose studio access; admins keep everything.
-- The review columns on courses are kept (harmless).
begin;
drop function if exists public.admin_review_course(uuid, text, text);
drop function if exists public.tutor_course_students(uuid);
drop function if exists public.tutor_my_courses();
drop trigger if exists guard_course_tutor_fields on public.courses;
drop function if exists public.guard_course_tutor_fields();
drop policy if exists "Tutors read own courses" on public.courses;
drop policy if exists "Tutors create own courses" on public.courses;
drop policy if exists "Tutors edit own courses" on public.courses;
drop policy if exists "Tutors read own lessons" on public.course_modules;
drop policy if exists "Tutors add own lessons" on public.course_modules;
drop policy if exists "Tutors edit own lessons" on public.course_modules;
drop policy if exists "Tutors delete lessons of draft courses" on public.course_modules;
drop policy if exists "Tutors manage own quizzes" on public.lesson_quizzes;
drop policy if exists "Tutors manage own questions" on public.quiz_questions;
drop policy if exists "Tutors manage own attachments" on public.lesson_attachments;
drop function if exists public.tutor_owns_lesson(uuid);
drop function if exists public.tutor_owns_course(uuid);
drop function if exists public.my_instructor_id();
commit;
