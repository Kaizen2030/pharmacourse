-- PHASE 1: server-enforced quizzes, module completion and certificates. Pharmacourse project. Re-runnable.
-- Requires Phase 2 (is_super_admin, request_is_trusted_backend, admin_audit_log).
-- Rollback: 2026-11-24_phase1_quizzes_completion_rollback.sql
--
-- Problems (confirmed in the live snapshot and the course player code):
-- 1. quiz_questions (including correct_answer and options[].is_correct) is readable by everyone, signed out too.
-- 2. Quizzes are graded in the browser with a hard-coded 70% pass mark; user_quiz_attempts accepts any score.
-- 3. Students can write completed = true to course_progress directly, so every module can be "finished".
-- 4. Certificates are issued once every module is marked completed, which (3) made forgeable.
--
-- After this:
-- - Students get quiz questions only through get_lesson_quiz() (answers removed), only for courses they are in.
-- - submit_quiz() grades on the server with the quiz's own pass mark and records the attempt.
-- - complete_module() is the only way to mark a module complete: enrolled, quiz passed (if any), watch time met.
-- - Watch time is credited by record_watch_heartbeat() using server time, so it cannot be sped up.

-- 0. Helpers ----------------------------------------------------------------------------------------------------
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

-- Seconds of viewing required before a module can be completed: 80% of its stated duration.
-- Modules with a video but no duration need 60 seconds; modules without video need none.
create or replace function public.module_required_watch_seconds(p_module uuid)
returns integer language sql stable security definer set search_path = public as $$
  select case
           when coalesce(m.duration_minutes, 0) > 0 then floor(m.duration_minutes * 60 * 0.8)::integer
           when nullif(btrim(coalesce(m.video_url, '')), '') is not null then 60
           else 0
         end
    from public.course_modules m where m.id = p_module;
$$;
revoke all on function public.module_required_watch_seconds(uuid) from public, anon;
grant execute on function public.module_required_watch_seconds(uuid) to authenticated;

-- 1. Quiz answers are not readable by students -------------------------------------------------------------------
drop policy if exists "Students can read questions" on public.quiz_questions;
drop policy if exists "public read questions" on public.quiz_questions;
drop policy if exists "Anyone can read questions" on public.quiz_questions;
drop policy if exists "Admins can read questions" on public.quiz_questions;
create policy "Admins can read questions" on public.quiz_questions
  for select to authenticated using (public.is_admin());
revoke all on public.quiz_questions from anon;

-- Removes every "this option is correct" marker from an options value.
create or replace function public.quiz_public_options(p_options jsonb)
returns jsonb language sql immutable as $$
  select case
    when jsonb_typeof(p_options) = 'array' then coalesce((
      select jsonb_agg(case when jsonb_typeof(o) = 'object'
                            then o - 'is_correct' - 'isCorrect' - 'correct' - 'is_answer' - 'answer'
                            else o end order by ord)
        from jsonb_array_elements(p_options) with ordinality as t(o, ord)), '[]'::jsonb)
    else '[]'::jsonb
  end
$$;

create or replace function public.get_lesson_quiz(p_lesson uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_quiz public.lesson_quizzes%rowtype;
  v_course uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in to take this quiz.' using errcode = '42501'; end if;
  select * into v_quiz from public.lesson_quizzes where lesson_id = p_lesson order by created_at limit 1;
  if not found then return null; end if;
  select coalesce(v_quiz.course_id, m.course_id) into v_course from public.course_modules m where m.id = p_lesson;
  if v_course is null or not public.can_study_course(v_course) then
    raise exception 'Enrol in this course to take its quizzes.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'id', v_quiz.id,
    'lesson_id', v_quiz.lesson_id,
    'title', v_quiz.title,
    'passing_score', coalesce(v_quiz.passing_score, v_quiz.pass_score, 70),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', q.id, 'question_text', q.question_text, 'question_type', q.question_type,
               'options', public.quiz_public_options(q.options), 'points', q.points, 'order_index', q.order_index)
             order by q.order_index nulls last, q.created_at)
        from public.quiz_questions q where q.quiz_id = v_quiz.id), '[]'::jsonb));
end $$;
revoke all on function public.get_lesson_quiz(uuid) from public, anon;
grant execute on function public.get_lesson_quiz(uuid) to authenticated;

-- 2. Server-side grading -----------------------------------------------------------------------------------------
-- Same matching as the old browser code: the chosen option text equals correct_answer, or (when there is no
-- correct_answer) the chosen option is marked correct in options.
create or replace function public.quiz_answer_is_correct(p_question public.quiz_questions, p_answer text)
returns boolean language sql immutable as $$
  select case
    when nullif(btrim(coalesce(p_question.correct_answer, '')), '') is not null
      then btrim(coalesce(p_answer, '')) = btrim(p_question.correct_answer)
    when jsonb_typeof(p_question.options) = 'array' then exists (
      select 1 from jsonb_array_elements(p_question.options) o
       where jsonb_typeof(o) = 'object'
         and btrim(coalesce(o ->> 'text', o ->> 'label', o ->> 'value', '')) = btrim(coalesce(p_answer, ''))
         and lower(coalesce(o ->> 'is_correct', o ->> 'isCorrect', o ->> 'correct', 'false')) in ('true', 't', '1', 'yes'))
    else false
  end
$$;

create or replace function public.submit_quiz(p_quiz uuid, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_quiz public.lesson_quizzes%rowtype;
  v_course uuid;
  v_total integer;
  v_correct integer;
  v_score integer;
  v_pass integer;
  v_passed boolean;
  v_recent integer;
  v_last timestamptz;
begin
  if v_uid is null then raise exception 'Please sign in to submit this quiz.' using errcode = '42501'; end if;
  if jsonb_typeof(coalesce(p_answers, 'null'::jsonb)) <> 'object' then raise exception 'Answers are missing.'; end if;
  select * into v_quiz from public.lesson_quizzes where id = p_quiz;
  if not found then raise exception 'That quiz was not found.'; end if;
  select coalesce(v_quiz.course_id, m.course_id) into v_course from public.course_modules m where m.id = v_quiz.lesson_id;
  if v_course is null or not public.can_study_course(v_course) then
    raise exception 'Enrol in this course to take its quizzes.' using errcode = '42501';
  end if;

  -- Stops guessing the answer key by brute force.
  select count(*), max(created_at) into v_recent, v_last
    from public.user_quiz_attempts where user_id = v_uid and quiz_id = p_quiz and created_at > now() - interval '1 hour';
  if not public.is_admin() then
    if v_last is not null and v_last > now() - interval '15 seconds' then
      raise exception 'Please wait a few seconds before trying again.';
    end if;
    if v_recent >= 10 then raise exception 'Too many attempts. Review the lesson and try again in an hour.'; end if;
  end if;

  select count(*), count(*) filter (where public.quiz_answer_is_correct(q, p_answers ->> q.id::text))
    into v_total, v_correct
    from public.quiz_questions q where q.quiz_id = p_quiz;
  if v_total = 0 then raise exception 'This quiz has no questions yet.'; end if;
  if (select count(*) from public.quiz_questions q where q.quiz_id = p_quiz and nullif(btrim(coalesce(p_answers ->> q.id::text, '')), '') is null) > 0 then
    raise exception 'Please answer all questions before submitting the quiz.';
  end if;

  v_score := round(v_correct * 100.0 / v_total);
  v_pass := coalesce(v_quiz.passing_score, v_quiz.pass_score, 70);
  v_passed := v_score >= v_pass;
  insert into public.user_quiz_attempts (user_id, quiz_id, score, passed, answers, started_at, completed_at)
  values (v_uid, p_quiz, v_score, v_passed, p_answers, now(), now());
  return jsonb_build_object('score', v_score, 'passed', v_passed, 'passing_score', v_pass);
end $$;
revoke all on function public.submit_quiz(uuid, jsonb) from public, anon;
grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;

-- Attempts are written only by submit_quiz.
drop policy if exists "Users own their attempts" on public.user_quiz_attempts;
drop policy if exists "Users insert their attempts" on public.user_quiz_attempts;
drop policy if exists "users manage attempts" on public.user_quiz_attempts;
drop policy if exists "Users can manage their attempts" on public.user_quiz_attempts;
drop policy if exists "Users read their attempts" on public.user_quiz_attempts;
drop policy if exists "Admins read attempts" on public.user_quiz_attempts;
create policy "Users read their attempts" on public.user_quiz_attempts for select to authenticated using (user_id = auth.uid());
create policy "Admins read attempts" on public.user_quiz_attempts for select to authenticated using (public.is_admin());
revoke all on public.user_quiz_attempts from anon, authenticated;
grant select on public.user_quiz_attempts to authenticated;

-- 3. Watch time, credited with server time ----------------------------------------------------------------------
create table if not exists public.module_watch_progress (
  user_id uuid not null,
  module_id uuid not null,
  course_id uuid not null,
  watched_seconds integer not null default 0,
  last_beat_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, module_id)
);
alter table public.module_watch_progress enable row level security;
revoke all on public.module_watch_progress from anon, authenticated;
grant select on public.module_watch_progress to authenticated;
drop policy if exists "Users read own watch progress" on public.module_watch_progress;
create policy "Users read own watch progress" on public.module_watch_progress for select to authenticated using (user_id = auth.uid());

-- Called every ~15 s while the lesson video plays. Credits the real time since the previous beat, at most 20 s,
-- so playing faster or calling this in a loop cannot earn time faster than the clock. Also saves the resume point.
create or replace function public.record_watch_heartbeat(p_course uuid, p_module uuid, p_position numeric default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_row public.module_watch_progress%rowtype;
  v_credit integer := 0;
  v_position integer := greatest(floor(coalesce(p_position, 0)), 0);
begin
  if v_uid is null then raise exception 'Please sign in.' using errcode = '42501'; end if;
  if not exists (select 1 from public.course_modules m where m.id = p_module and m.course_id = p_course) then
    raise exception 'That lesson is not part of this course.';
  end if;
  if not public.can_study_course(p_course) then raise exception 'Enrol in this course first.' using errcode = '42501'; end if;

  select * into v_row from public.module_watch_progress where user_id = v_uid and module_id = p_module for update;
  if found then
    if v_row.last_beat_at is not null and v_row.last_beat_at > now() - interval '2 minutes' then
      v_credit := least(greatest(extract(epoch from now() - v_row.last_beat_at)::integer, 0), 20);
    end if;
    update public.module_watch_progress
       set watched_seconds = watched_seconds + v_credit, last_beat_at = now(), updated_at = now()
     where user_id = v_uid and module_id = p_module
     returning * into v_row;
  else
    insert into public.module_watch_progress (user_id, module_id, course_id, watched_seconds, last_beat_at)
    values (v_uid, p_module, p_course, 0, now()) returning * into v_row;
  end if;

  if v_position > 0 then
    perform set_config('app.course_progress_rpc', 'on', true);
    update public.course_progress set last_position = v_position, last_accessed_at = now()
     where user_id = v_uid and course_id = p_course and module_id = p_module;
    if not found then
      insert into public.course_progress (user_id, course_id, module_id, completed, last_position, last_accessed_at)
      values (v_uid, p_course, p_module, false, v_position, now());
    end if;
    perform set_config('app.course_progress_rpc', 'off', true);
  end if;

  return jsonb_build_object('watched_seconds', v_row.watched_seconds, 'required_seconds', public.module_required_watch_seconds(p_module));
end $$;
revoke all on function public.record_watch_heartbeat(uuid, uuid, numeric) from public, anon;
grant execute on function public.record_watch_heartbeat(uuid, uuid, numeric) to authenticated;

-- 4. Completion only through complete_module ---------------------------------------------------------------------
create or replace function public.complete_module(p_course uuid, p_module uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean := public.is_admin();
  v_quiz uuid;
  v_watched integer;
  v_required integer;
begin
  if v_uid is null then raise exception 'Please sign in.' using errcode = '42501'; end if;
  if not exists (select 1 from public.course_modules m where m.id = p_module and m.course_id = p_course) then
    raise exception 'That lesson is not part of this course.';
  end if;
  if not public.can_study_course(p_course) then raise exception 'Enrol in this course first.' using errcode = '42501'; end if;

  if not v_admin then
    select q.id into v_quiz from public.lesson_quizzes q
     where q.lesson_id = p_module and exists (select 1 from public.quiz_questions qq where qq.quiz_id = q.id)
     order by q.created_at limit 1;
    if v_quiz is not null and not exists (select 1 from public.user_quiz_attempts a where a.user_id = v_uid and a.quiz_id = v_quiz and a.passed) then
      raise exception 'Pass the lesson quiz before completing this module.';
    end if;
    v_required := public.module_required_watch_seconds(p_module);
    select coalesce(watched_seconds, 0) into v_watched from public.module_watch_progress where user_id = v_uid and module_id = p_module;
    v_watched := coalesce(v_watched, 0);
    if v_watched < v_required then
      raise exception 'Keep watching: about % more minute(s) of this lesson are needed before it can be completed.',
        greatest(ceil((v_required - v_watched) / 60.0), 1);
    end if;
  end if;

  perform set_config('app.course_progress_rpc', 'on', true);
  update public.course_progress set completed = true, completed_at = coalesce(completed_at, now()), last_accessed_at = now()
   where user_id = v_uid and course_id = p_course and module_id = p_module;
  if not found then
    insert into public.course_progress (user_id, course_id, module_id, completed, completed_at, last_position, last_accessed_at)
    values (v_uid, p_course, p_module, true, now(), 0, now());
  end if;
  perform set_config('app.course_progress_rpc', 'off', true);
  return jsonb_build_object('completed', true);
end $$;
revoke all on function public.complete_module(uuid, uuid) from public, anon;
grant execute on function public.complete_module(uuid, uuid) to authenticated;

-- Students can still create their own progress rows and save the resume point, but not completion.
create or replace function public.guard_course_progress_completion()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.request_is_trusted_backend() or public.is_admin()
     or coalesce(current_setting('app.course_progress_rpc', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.completed := false;
    new.completed_at := null;
    return new;
  end if;
  if new.completed is distinct from old.completed or new.completed_at is distinct from old.completed_at
     or new.user_id is distinct from old.user_id or new.course_id is distinct from old.course_id or new.module_id is distinct from old.module_id then
    raise exception 'Module completion is recorded by the course player, not edited directly.' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.guard_course_progress_completion() from public, anon, authenticated;
drop trigger if exists guard_course_progress_completion on public.course_progress;
create trigger guard_course_progress_completion before insert or update on public.course_progress
  for each row execute function public.guard_course_progress_completion();
revoke all on public.course_progress from anon;

-- 5. Certificates -----------------------------------------------------------------------------------------------
-- Eligibility (enrolled + every module completed) is the existing insert policy; completion is now trustworthy.
-- Students cannot set the score or verification link; certificates issued by admins are logged.
create or replace function public.guard_certificate_issue()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.request_is_trusted_backend() then return new; end if;
  if public.is_admin() then
    insert into public.admin_audit_log (actor_id, actor_email, action, target_user_id, new_value)
    values (auth.uid(), (select u.email from auth.users u where u.id = auth.uid()), 'certificate_issued_by_admin', new.user_id,
            jsonb_build_object('course_id', new.course_id,
              'modules_completed', (select count(*) from public.course_progress p where p.user_id = new.user_id and p.course_id = new.course_id and p.completed),
              'modules_total', (select count(*) from public.course_modules m where m.course_id = new.course_id)));
    return new;
  end if;
  new.score := (select round(avg(best))::numeric from (
                  select max(a.score) as best from public.user_quiz_attempts a
                    join public.lesson_quizzes q on q.id = a.quiz_id
                    join public.course_modules m on m.id = q.lesson_id
                   where a.user_id = new.user_id and m.course_id = new.course_id
                   group by a.quiz_id) s);
  new.verification_url := null;
  new.issued_date := coalesce(new.issued_date, now());
  return new;
end $$;
revoke all on function public.guard_certificate_issue() from public, anon, authenticated;
drop trigger if exists guard_certificate_issue on public.certificates;
create trigger guard_certificate_issue before insert on public.certificates
  for each row execute function public.guard_certificate_issue();
revoke insert, update, delete, truncate, references, trigger on public.certificates from anon;
