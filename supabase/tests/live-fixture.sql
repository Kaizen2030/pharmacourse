-- Supabase-shaped copy of the live Pharmacourse tables and policies these tests touch
-- (copied from the 2026-11-23 security snapshot). Column types are simplified; names and rules are exact.
create extension if not exists pgcrypto;
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant select on auth.users to anon, authenticated;

create table public.user_profiles (
  id uuid primary key, email text, full_name text, role text default 'student', organization_id uuid, avatar_url text, phone text,
  created_at timestamptz default now(), updated_at timestamptz default now(), professional_id text, admin_role text,
  whatsapp_number text, whatsapp_opted_in boolean, whatsapp_opted_in_at timestamptz);
create table public.instructors (id uuid primary key default gen_random_uuid(), name text, title text, bio text, linked_user_id uuid,
  created_at timestamptz default now(), updated_at timestamptz default now());
create table public.courses (id uuid primary key default gen_random_uuid(), title text, instructor_id uuid, is_published boolean default false,
  price numeric, is_free boolean default false, created_at timestamptz default now(), updated_at timestamptz default now());
create table public.course_modules (id uuid primary key default gen_random_uuid(), course_id uuid, title text, video_url text, content text,
  order_index int, created_at timestamptz default now(), updated_at timestamptz default now());
create table public.case_simulations (id uuid primary key default gen_random_uuid(), is_published boolean default true);
create table public.simulation_responses (id uuid primary key default gen_random_uuid(), user_id uuid, simulation_id uuid, answers jsonb);

create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_profiles where id = auth.uid() and role = 'admin');
$$;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.user_profiles enable row level security;
alter table public.instructors enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.simulation_responses enable row level security;

grant select on public.user_profiles to anon; grant insert, select, update on public.user_profiles to authenticated;
grant select on public.instructors to anon; grant select, insert, update, delete on public.instructors to authenticated;
grant select on public.courses to anon; grant select, insert, update, delete on public.courses to authenticated;
grant select on public.course_modules to anon; grant select, insert, update, delete on public.course_modules to authenticated;
grant select, insert, update, delete, references, trigger, truncate on public.simulation_responses to anon, authenticated;

create policy "Users can read own profile" on public.user_profiles for select to authenticated using (id = auth.uid());
create policy "Users can insert own profile" on public.user_profiles for insert to authenticated with check (id = auth.uid());
create policy "Users can update own profile" on public.user_profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "Admins can read all profiles" on public.user_profiles for select to authenticated using (is_admin());
create policy "Admins can update all profiles" on public.user_profiles for update to authenticated using (is_admin()) with check (is_admin());

create policy "Public can view instructors" on public.instructors for select to public using (true);
create policy "Instructors can create own profile" on public.instructors for insert to authenticated with check (id = auth.uid());
create policy "Instructors can update own profile" on public.instructors for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "Admins can manage instructors" on public.instructors for all to authenticated using (is_admin()) with check (is_admin());
create policy "Tutors update own linked instructor profile" on public.instructors for update to authenticated using (linked_user_id = auth.uid()) with check (linked_user_id = auth.uid());

create policy "Public can view published courses" on public.courses for select to public using (is_published = true);
create policy "Instructors can view own courses" on public.courses for select to authenticated using (instructor_id = auth.uid());
create policy "Instructors can manage own courses" on public.courses for all to authenticated using (instructor_id = auth.uid()) with check (instructor_id = auth.uid());
create policy "Admins can manage courses" on public.courses for all to authenticated using (is_admin()) with check (is_admin());

create policy "Anyone can view modules of published courses" on public.course_modules for select to public
  using (exists (select 1 from public.courses where courses.id = course_modules.course_id and courses.is_published = true));
create policy "Instructors can manage own course modules" on public.course_modules for all to authenticated
  using (exists (select 1 from courses c where c.id = course_modules.course_id and c.instructor_id = auth.uid()))
  with check (exists (select 1 from courses c where c.id = course_modules.course_id and c.instructor_id = auth.uid()));
create policy "Admins can manage course modules" on public.course_modules for all to authenticated using (is_admin()) with check (is_admin());

create policy "Users can read own simulation responses" on public.simulation_responses for select to authenticated using (user_id = auth.uid());
create policy "Users can create own simulation responses" on public.simulation_responses for insert to authenticated with check (user_id = auth.uid());

-- Phase 1 tables (courses, enrollments, progress, quizzes, attempts, certificates), live rules of 2026-11-23.
alter table public.course_modules add column duration_minutes numeric, add column description text;
create table public.course_enrollments (id uuid primary key default gen_random_uuid(), user_id uuid, course_id uuid,
  enrollment_date timestamptz default now(), completion_date timestamptz, status text default 'enrolled',
  created_at timestamptz default now(), completed_at timestamptz);
create table public.course_progress (id uuid primary key default gen_random_uuid(), user_id uuid, course_id uuid, module_id uuid,
  progress_percentage numeric default 0, last_accessed_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now(),
  last_position integer default 0, completed boolean default false, completed_at timestamptz, unique (user_id, course_id, module_id));
create table public.lesson_quizzes (id uuid primary key default gen_random_uuid(), lesson_id uuid, title text, passing_score integer,
  time_limit_minutes integer, created_at timestamptz default now(), course_id uuid, pass_score integer);
create table public.quiz_questions (id uuid primary key default gen_random_uuid(), quiz_id uuid, question_text text, question_type text,
  options jsonb, correct_answer text, explanation text, points integer, order_index integer, created_at timestamptz default now());
create table public.user_quiz_attempts (id uuid primary key default gen_random_uuid(), user_id uuid, quiz_id uuid, score integer, passed boolean,
  answers jsonb, started_at timestamptz, completed_at timestamptz, created_at timestamptz default now());
create table public.certificates (id uuid primary key default gen_random_uuid(), user_id uuid, course_id uuid, issued_date timestamptz default now(),
  certificate_code text, verification_url text, score numeric, created_at timestamptz default now());

do $$ declare t text; begin
  foreach t in array array['course_enrollments','course_progress','lesson_quizzes','quiz_questions','user_quiz_attempts','certificates'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
grant select on public.course_enrollments to anon; grant insert, select, update on public.course_enrollments to authenticated;
grant select on public.course_progress to anon; grant insert, select, update on public.course_progress to authenticated;
grant select on public.lesson_quizzes to anon; grant select, insert, update, delete on public.lesson_quizzes to authenticated;
grant select on public.quiz_questions to anon; grant select, insert, update, delete on public.quiz_questions to authenticated;
grant select, insert, update, delete, references, trigger, truncate on public.user_quiz_attempts to authenticated;
grant select on public.certificates to anon; grant insert, select on public.certificates to authenticated;

create policy "Users can read own enrollments" on public.course_enrollments for select to authenticated using (user_id = auth.uid());
create policy "Admins can manage enrollments" on public.course_enrollments for all to authenticated using (is_admin()) with check (is_admin());

create policy "Users can read own progress" on public.course_progress for select to authenticated using (user_id = auth.uid());
create policy "Users can insert own progress" on public.course_progress for insert to authenticated with check (
  user_id = auth.uid() and (exists (select 1 from course_enrollments ce where ce.user_id = auth.uid() and ce.course_id = course_progress.course_id)
    or exists (select 1 from courses c where c.id = course_progress.course_id and c.instructor_id = auth.uid()) or is_admin()));
create policy "Users can update own progress" on public.course_progress for update to authenticated using (user_id = auth.uid()) with check (
  user_id = auth.uid() and (exists (select 1 from course_enrollments ce where ce.user_id = auth.uid() and ce.course_id = course_progress.course_id)
    or exists (select 1 from courses c where c.id = course_progress.course_id and c.instructor_id = auth.uid()) or is_admin()));
create policy "Admins can manage progress" on public.course_progress for all to authenticated using (is_admin()) with check (is_admin());

create policy "Students can read quizzes" on public.lesson_quizzes for select to public using (true);
create policy "Admins can write quizzes" on public.lesson_quizzes for all to authenticated using (is_admin()) with check (is_admin());
create policy "Students can read questions" on public.quiz_questions for select to public using (true);
create policy "public read questions" on public.quiz_questions for select to public using (true);
create policy "Anyone can read questions" on public.quiz_questions for select to public using (true);
create policy "Admins can write questions" on public.quiz_questions for all to authenticated using (is_admin()) with check (is_admin());

create policy "Users own their attempts" on public.user_quiz_attempts for all to public using (auth.uid() = user_id);
create policy "Users insert their attempts" on public.user_quiz_attempts for insert to public with check (auth.uid() = user_id);
create policy "users manage attempts" on public.user_quiz_attempts for all to public using (auth.uid() = user_id);
create policy "Users can manage their attempts" on public.user_quiz_attempts for all to public using (auth.uid() = user_id);

create policy "Users can read own certificates" on public.certificates for select to authenticated using (user_id = auth.uid());
create policy "Users can create own certificates" on public.certificates for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from course_enrollments ce where ce.user_id = auth.uid() and ce.course_id = certificates.course_id and coalesce(ce.status, 'enrolled') = 'enrolled')
  and (select count(*) from course_modules cm where cm.course_id = certificates.course_id) > 0
  and (select count(*) from course_progress cp where cp.user_id = auth.uid() and cp.course_id = certificates.course_id and cp.completed = true)
      >= (select count(*) from course_modules cm where cm.course_id = certificates.course_id));
create policy "Admins can manage certificates" on public.certificates for all to authenticated using (is_admin()) with check (is_admin());

-- Phase 3 tables: lesson attachments, live rules of 2026-11-23 (course_modules policies are above).
create table public.lesson_attachments (id uuid primary key default gen_random_uuid(), lesson_id uuid, title text, file_url text,
  file_type text, file_size bigint, is_required boolean, order_index int, created_at timestamptz default now());
alter table public.lesson_attachments enable row level security;
grant select on public.lesson_attachments to anon, authenticated;
create policy "Students can read attachments" on public.lesson_attachments for select to public using (true);
create policy "public read attachments" on public.lesson_attachments for select to public using (true);
create policy "Anyone can read attachments" on public.lesson_attachments for select to public using (true);
create policy "Users can view modules of enrolled courses" on public.course_modules for select to authenticated
  using ((course_id in (select ce.course_id from course_enrollments ce where ce.user_id = auth.uid()))
         or (course_id in (select c.id from courses c where c.instructor_id = auth.uid())) or is_admin());
