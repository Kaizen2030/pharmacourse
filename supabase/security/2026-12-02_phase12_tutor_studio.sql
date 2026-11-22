-- PHASE 12: Tutor studio. Tutors manage only their own courses; admins approve publishing. Re-runnable.
-- Pharmacourse project. Needs Phase 1, 2, 3 and 9. Rollback: rollback-emergency-only/2026-12-02_phase12_tutor_studio_rollback.sql
--
-- A tutor is a signed-in user linked to an instructor profile (Admin > Tutors > "Linked account").
-- Tutors CAN:    create courses (always as drafts, owned by themselves), edit their own courses, lessons, quizzes and
--                attachments, submit a course for review, see their own students' names and progress.
-- Tutors CANNOT: publish or unpublish, move a course to another tutor, change the price of a live course, delete
--                lessons of a live course, touch other tutors' courses, see emails, phones, payments or admin pages.
-- Admins approve (publish) or request changes; every review is written to the audit log.

begin;

alter table public.courses
  add column if not exists review_status text,
  add column if not exists review_note text,
  add column if not exists submitted_at timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'courses_review_status_check') then
    alter table public.courses add constraint courses_review_status_check
      check (review_status is null or review_status in ('draft', 'in_review', 'changes_requested', 'approved'));
  end if;
end $$;

-- Who am I as a tutor?
create or replace function public.my_instructor_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.instructors where linked_user_id = auth.uid() and auth.uid() is not null order by created_at limit 1;
$$;
revoke all on function public.my_instructor_id() from public, anon;
grant execute on function public.my_instructor_id() to authenticated;

create or replace function public.tutor_owns_course(p_course uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.courses c join public.instructors i on i.id = c.instructor_id
     where c.id = p_course and i.linked_user_id = auth.uid());
$$;
revoke all on function public.tutor_owns_course(uuid) from public, anon;
grant execute on function public.tutor_owns_course(uuid) to authenticated;

create or replace function public.tutor_owns_lesson(p_lesson uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.course_modules m where m.id = p_lesson and public.tutor_owns_course(m.course_id));
$$;
revoke all on function public.tutor_owns_lesson(uuid) from public, anon;
grant execute on function public.tutor_owns_lesson(uuid) to authenticated;

-- Courses ----------------------------------------------------------------------------------------------------------
drop policy if exists "Tutors read own courses" on public.courses;
-- Compare the owner column directly (a lookup by id cannot see a row that is still being inserted).
create policy "Tutors read own courses" on public.courses for select to authenticated
  using (instructor_id is not null and instructor_id = public.my_instructor_id());
drop policy if exists "Tutors create own courses" on public.courses;
create policy "Tutors create own courses" on public.courses for insert to authenticated
  with check (public.my_instructor_id() is not null and instructor_id = public.my_instructor_id());
drop policy if exists "Tutors edit own courses" on public.courses;
create policy "Tutors edit own courses" on public.courses for update to authenticated
  using (instructor_id is not null and instructor_id = public.my_instructor_id()) with check (instructor_id = public.my_instructor_id());

create or replace function public.guard_course_tutor_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or public.request_is_trusted_backend() then return new; end if;
  if tg_op = 'INSERT' then
    if public.my_instructor_id() is null then raise exception 'Only linked tutors can create courses.'; end if;
    new.instructor_id := public.my_instructor_id();
    new.is_published := false;
    new.review_status := 'draft';
    new.review_note := null;
    new.submitted_at := null;
    return new;
  end if;
  if new.instructor_id is distinct from old.instructor_id then raise exception 'A course cannot be moved to another tutor.'; end if;
  if new.is_published is distinct from old.is_published then raise exception 'Publishing is done by an administrator after review.'; end if;
  if coalesce(old.is_published, false) and (new.price is distinct from old.price or new.is_free is distinct from old.is_free) then
    raise exception 'The price of a live course is changed by an administrator.';
  end if;
  if new.review_status is distinct from old.review_status then
    if new.review_status = 'in_review' and coalesce(old.review_status, 'draft') in ('draft', 'changes_requested', 'approved') then
      new.submitted_at := now();
    elsif new.review_status = 'draft' and old.review_status = 'in_review' then
      null; -- tutor withdrew the submission
    else
      raise exception 'Only an administrator can approve a course or request changes.';
    end if;
  end if;
  if new.review_note is distinct from old.review_note then new.review_note := old.review_note; end if;
  return new;
end $$;
revoke all on function public.guard_course_tutor_fields() from public, anon, authenticated;
drop trigger if exists guard_course_tutor_fields on public.courses;
create trigger guard_course_tutor_fields before insert or update on public.courses for each row execute function public.guard_course_tutor_fields();

-- Lessons (course_modules) -----------------------------------------------------------------------------------------
drop policy if exists "Tutors read own lessons" on public.course_modules;
create policy "Tutors read own lessons" on public.course_modules for select to authenticated using (public.tutor_owns_course(course_id));
drop policy if exists "Tutors add own lessons" on public.course_modules;
create policy "Tutors add own lessons" on public.course_modules for insert to authenticated with check (public.tutor_owns_course(course_id));
drop policy if exists "Tutors edit own lessons" on public.course_modules;
create policy "Tutors edit own lessons" on public.course_modules for update to authenticated
  using (public.tutor_owns_course(course_id)) with check (public.tutor_owns_course(course_id));
drop policy if exists "Tutors delete lessons of draft courses" on public.course_modules;
create policy "Tutors delete lessons of draft courses" on public.course_modules for delete to authenticated
  using (public.tutor_owns_course(course_id) and not exists (select 1 from public.courses c where c.id = course_id and coalesce(c.is_published, false)));
grant select, insert, update, delete on public.course_modules to authenticated;

-- Quizzes, questions, attachments ---------------------------------------------------------------------------------
drop policy if exists "Tutors manage own quizzes" on public.lesson_quizzes;
create policy "Tutors manage own quizzes" on public.lesson_quizzes for all to authenticated
  using (public.tutor_owns_lesson(lesson_id)) with check (public.tutor_owns_lesson(lesson_id));
drop policy if exists "Tutors manage own questions" on public.quiz_questions;
create policy "Tutors manage own questions" on public.quiz_questions for all to authenticated
  using (exists (select 1 from public.lesson_quizzes q where q.id = quiz_id and public.tutor_owns_lesson(q.lesson_id)))
  with check (exists (select 1 from public.lesson_quizzes q where q.id = quiz_id and public.tutor_owns_lesson(q.lesson_id)));
drop policy if exists "Tutors manage own attachments" on public.lesson_attachments;
create policy "Tutors manage own attachments" on public.lesson_attachments for all to authenticated
  using (public.tutor_owns_lesson(lesson_id)) with check (public.tutor_owns_lesson(lesson_id));
grant select, insert, update, delete on public.lesson_quizzes, public.quiz_questions to authenticated;
grant select, insert, update, delete on public.lesson_attachments to authenticated;

-- Tutor dashboard: own courses with counts (no learner contact details) ----------------------------------------------
drop function if exists public.tutor_my_courses();
create function public.tutor_my_courses()
returns table (id uuid, title text, slug text, is_published boolean, review_status text, review_note text, price numeric, is_free boolean,
               lessons bigint, enrolments bigint, completions bigint, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, c.title, c.slug, coalesce(c.is_published, false), coalesce(c.review_status, case when c.is_published then 'approved' else 'draft' end),
         c.review_note, c.price, c.is_free,
         (select count(*) from public.course_modules m where m.course_id = c.id),
         (select count(*) from public.course_enrollments e where e.course_id = c.id and coalesce(e.status, 'enrolled') not in ('revoked', 'awaiting_payment')),
         (select count(*) from public.course_enrollments e where e.course_id = c.id and (e.status = 'completed' or e.completion_date is not null or e.completed_at is not null)),
         c.updated_at
    from public.courses c join public.instructors i on i.id = c.instructor_id
   where i.linked_user_id = auth.uid() and auth.uid() is not null
   order by c.updated_at desc nulls last;
$$;
revoke all on function public.tutor_my_courses() from public, anon;
grant execute on function public.tutor_my_courses() to authenticated;

drop function if exists public.tutor_course_students(uuid);
create function public.tutor_course_students(p_course uuid)
returns table (learner text, enrolled_at timestamptz, status text, progress_pct integer, last_active timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.tutor_owns_course(p_course) or public.is_admin()) then raise exception 'You can only see students of your own courses.'; end if;
  return query
  select coalesce(nullif(btrim(up.full_name), ''), 'Learner'), coalesce(e.enrollment_date, e.created_at),
         case when e.status = 'completed' or e.completion_date is not null or e.completed_at is not null then 'completed' else 'learning' end,
         coalesce((select round(100.0 * count(*) filter (where cp.completed) / nullif((select count(*) from public.course_modules m where m.course_id = p_course), 0))::int
                     from public.course_progress cp where cp.user_id = e.user_id and cp.course_id = p_course), 0),
         (select max(coalesce(cp.last_accessed_at, cp.updated_at)) from public.course_progress cp where cp.user_id = e.user_id and cp.course_id = p_course)
    from public.course_enrollments e left join public.user_profiles up on up.id = e.user_id
   where e.course_id = p_course and coalesce(e.status, 'enrolled') not in ('revoked', 'awaiting_payment')
   order by coalesce(e.enrollment_date, e.created_at) desc
   limit 500;
end $$;
revoke all on function public.tutor_course_students(uuid) from public, anon;
grant execute on function public.tutor_course_students(uuid) to authenticated;

-- Admin review --------------------------------------------------------------------------------------------------
drop function if exists public.admin_review_course(uuid, text, text);
create function public.admin_review_course(p_course uuid, p_action text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.courses;
begin
  perform public.require_admin();
  select * into c from public.courses where id = p_course;
  if c.id is null then raise exception 'That course was not found.'; end if;
  if p_action = 'approve' then
    update public.courses set review_status = 'approved', is_published = true, review_note = nullif(btrim(coalesce(p_note, '')), '') where id = p_course;
  elsif p_action = 'request_changes' then
    if nullif(btrim(coalesce(p_note, '')), '') is null then raise exception 'Tell the tutor what to change.'; end if;
    update public.courses set review_status = 'changes_requested', is_published = false, review_note = btrim(p_note) where id = p_course;
  elsif p_action = 'unpublish' then
    update public.courses set review_status = 'draft', is_published = false, review_note = nullif(btrim(coalesce(p_note, '')), '') where id = p_course;
  else
    raise exception 'Unknown action.';
  end if;
  insert into public.admin_audit_log (actor_id, actor_email, action, target_user_id, old_value, new_value)
  values (auth.uid(), (select email from public.user_profiles where id = auth.uid()), 'course.' || p_action,
          (select linked_user_id from public.instructors where id = c.instructor_id),
          jsonb_build_object('course', c.id, 'title', c.title, 'was_published', c.is_published), jsonb_build_object('note', p_note));
  return jsonb_build_object('id', p_course, 'action', p_action);
end $$;
revoke all on function public.admin_review_course(uuid, text, text) from public, anon;
grant execute on function public.admin_review_course(uuid, text, text) to authenticated;

commit;
