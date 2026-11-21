-- ROLLBACK for 2026-11-24_phase1_quizzes_completion.sql. Restores the live rules of 2026-11-23.
-- Warning: this makes quiz answers public again and lets students mark modules complete themselves.

drop trigger if exists guard_certificate_issue on public.certificates;
drop function if exists public.guard_certificate_issue();
drop trigger if exists guard_course_progress_completion on public.course_progress;
drop function if exists public.guard_course_progress_completion();
drop function if exists public.complete_module(uuid, uuid);
drop function if exists public.record_watch_heartbeat(uuid, uuid, numeric);
drop function if exists public.submit_quiz(uuid, jsonb);
drop function if exists public.quiz_answer_is_correct(public.quiz_questions, text);
drop function if exists public.get_lesson_quiz(uuid);
drop function if exists public.quiz_public_options(jsonb);
drop function if exists public.module_required_watch_seconds(uuid);
drop function if exists public.can_study_course(uuid);

drop policy if exists "Admins can read questions" on public.quiz_questions;
drop policy if exists "Students can read questions" on public.quiz_questions;
drop policy if exists "public read questions" on public.quiz_questions;
drop policy if exists "Anyone can read questions" on public.quiz_questions;
create policy "Students can read questions" on public.quiz_questions for select to public using (true);
create policy "public read questions" on public.quiz_questions for select to public using (true);
create policy "Anyone can read questions" on public.quiz_questions for select to public using (true);
grant select on public.quiz_questions to anon;

drop policy if exists "Users read their attempts" on public.user_quiz_attempts;
drop policy if exists "Admins read attempts" on public.user_quiz_attempts;
drop policy if exists "Users own their attempts" on public.user_quiz_attempts;
drop policy if exists "Users insert their attempts" on public.user_quiz_attempts;
drop policy if exists "users manage attempts" on public.user_quiz_attempts;
drop policy if exists "Users can manage their attempts" on public.user_quiz_attempts;
create policy "Users own their attempts" on public.user_quiz_attempts for all to public using (auth.uid() = user_id);
create policy "Users insert their attempts" on public.user_quiz_attempts for insert to public with check (auth.uid() = user_id);
create policy "users manage attempts" on public.user_quiz_attempts for all to public using (auth.uid() = user_id);
create policy "Users can manage their attempts" on public.user_quiz_attempts for all to public using (auth.uid() = user_id);
grant select, insert, update, delete, references, trigger, truncate on public.user_quiz_attempts to authenticated;

grant select on public.course_progress to anon;

-- Kept on purpose (holds watch history): public.module_watch_progress. To remove it too:
--   drop table if exists public.module_watch_progress;
