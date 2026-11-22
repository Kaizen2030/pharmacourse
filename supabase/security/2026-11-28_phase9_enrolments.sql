-- PHASE 9: enrolment management, payments recorded by admins, learner detail and learning analytics.
-- Pharmacourse project (nnjiutikutsjvggakvvv). Re-runnable. Rollback: rollback-emergency-only/2026-11-28_phase9_enrolments_rollback.sql
--
-- What it adds
-- 1. Enrolment fields: payment status/method/reference/amount, access expiry, admin note, revoked date.
-- 2. Access rules: revoked, awaiting-payment and expired enrolments cannot open lessons.
-- 3. Learners cannot set payment or access fields themselves (a guard trigger), so revenue cannot be faked.
-- 4. Admin-only functions (every change is written to admin_audit_log):
--      admin_enrol_learner, admin_update_enrolment            (writes)
--      admin_list_enrolments, admin_learner_detail,
--      admin_learning_stats                                    (reads)
-- Nothing here deletes data. Existing enrolments keep working: they are marked 'free' or 'paid' from the course.

begin;

-- 1. Columns ----------------------------------------------------------------------------------------------------
alter table public.course_enrollments
  add column if not exists payment_status text,
  add column if not exists payment_method text,
  add column if not exists payment_reference text,
  add column if not exists amount_kes numeric(12, 2),
  add column if not exists access_expires_at timestamptz,
  add column if not exists admin_note text,
  add column if not exists granted_by uuid,
  add column if not exists revoked_at timestamptz,
  add column if not exists updated_at timestamptz default now();

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'course_enrollments_payment_status_check') then
    alter table public.course_enrollments add constraint course_enrollments_payment_status_check
      check (payment_status is null or payment_status in ('free', 'paid', 'awaiting', 'waived', 'refunded'));
  end if;
end $$;

-- Existing rows: free course -> 'free'; paid course -> 'paid' (they were granted by an admin). Amount stays empty
-- because the real amount was never recorded; revenue only counts payments recorded from now on.
update public.course_enrollments e
   set payment_status = case when coalesce(c.is_free, false) or coalesce(c.price, 0) = 0 then 'free' else 'paid' end
  from public.courses c
 where c.id = e.course_id and e.payment_status is null;

create index if not exists course_enrollments_course_idx on public.course_enrollments (course_id);
create index if not exists course_enrollments_user_idx on public.course_enrollments (user_id);

-- 2. Lesson access: active enrolment that has not expired ---------------------------------------------------------
create or replace function public.can_study_course(p_course uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    public.is_admin()
    or exists (select 1 from public.course_enrollments e where e.user_id = auth.uid() and e.course_id = p_course
                 and coalesce(e.status, 'enrolled') in ('enrolled', 'completed', 'active')
                 and (e.access_expires_at is null or e.access_expires_at > now()))
    or exists (select 1 from public.courses c left join public.instructors i on i.id = c.instructor_id
                where c.id = p_course and (c.instructor_id = auth.uid() or i.linked_user_id = auth.uid()))
  );
$$;
revoke all on function public.can_study_course(uuid) from public, anon;
grant execute on function public.can_study_course(uuid) to authenticated;

-- 3. Learners cannot write payment/access fields ----------------------------------------------------------------
create or replace function public.guard_enrollment_admin_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or public.request_is_trusted_backend() or coalesce(current_setting('app.course_progress_rpc', true), '') = 'on' then
    new.updated_at := now();
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.payment_status := 'free';
    new.payment_method := null; new.payment_reference := null; new.amount_kes := null;
    new.access_expires_at := null; new.admin_note := null; new.granted_by := null; new.revoked_at := null;
    if coalesce(new.status, 'enrolled') not in ('enrolled') then new.status := 'enrolled'; end if;
  else
    if new.payment_status is distinct from old.payment_status or new.payment_method is distinct from old.payment_method
       or new.payment_reference is distinct from old.payment_reference or new.amount_kes is distinct from old.amount_kes
       or new.access_expires_at is distinct from old.access_expires_at or new.admin_note is distinct from old.admin_note
       or new.granted_by is distinct from old.granted_by or new.revoked_at is distinct from old.revoked_at
       or (new.status is distinct from old.status and coalesce(old.status, '') in ('revoked', 'awaiting_payment')) then
      raise exception 'Only an administrator can change payment or access details.';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.guard_enrollment_admin_fields() from public, anon, authenticated;

drop trigger if exists guard_enrollment_admin_fields on public.course_enrollments;
create trigger guard_enrollment_admin_fields before insert or update on public.course_enrollments
  for each row execute function public.guard_enrollment_admin_fields();

-- Helper: admins only, readable message.
create or replace function public.require_admin()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
end $$;
revoke all on function public.require_admin() from public, anon;
grant execute on function public.require_admin() to authenticated;

create or replace function public.write_admin_audit(p_action text, p_target uuid, p_old jsonb, p_new jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.admin_audit_log (actor_id, actor_email, action, target_user_id, old_value, new_value)
  values (auth.uid(), (select email from public.user_profiles where id = auth.uid()), p_action, p_target, p_old, p_new);
$$;
revoke all on function public.write_admin_audit(text, uuid, jsonb, jsonb) from public, anon, authenticated;

-- 4a. Enrol a learner (single) ----------------------------------------------------------------------------------
drop function if exists public.admin_enrol_learner(text, uuid, text, text, text, numeric, timestamptz, text);
create function public.admin_enrol_learner(
  p_learner text, p_course uuid, p_access text default 'paid', p_method text default null, p_reference text default null,
  p_amount numeric default null, p_expires timestamptz default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid; v_existing public.course_enrollments; v_row public.course_enrollments; v_key text := lower(btrim(coalesce(p_learner, '')));
  v_digits text := regexp_replace(coalesce(p_learner, ''), '\D', '', 'g');
begin
  perform public.require_admin();
  if p_access not in ('paid', 'free', 'waived', 'awaiting') then raise exception 'Choose how access is being granted.'; end if;
  if not exists (select 1 from public.courses where id = p_course) then raise exception 'That course was not found.'; end if;
  if v_key = '' then raise exception 'Enter the learner''s email or phone number.'; end if;

  select id into v_user from public.user_profiles
   where lower(email) = v_key
      or (length(v_digits) >= 9 and (right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 9) = right(v_digits, 9)
          or right(regexp_replace(coalesce(whatsapp_number, ''), '\D', '', 'g'), 9) = right(v_digits, 9)))
   order by (lower(email) = v_key) desc limit 1;
  if v_user is null then raise exception 'No registered learner with that email or phone. Ask them to create an account first.'; end if;

  select * into v_existing from public.course_enrollments where user_id = v_user and course_id = p_course order by created_at limit 1;

  if v_existing.id is null then
    insert into public.course_enrollments (user_id, course_id, status, payment_status, payment_method, payment_reference, amount_kes,
                                           access_expires_at, admin_note, granted_by, enrollment_date)
    values (v_user, p_course, case when p_access = 'awaiting' then 'awaiting_payment' else 'enrolled' end, p_access,
            nullif(btrim(coalesce(p_method, '')), ''), nullif(btrim(coalesce(p_reference, '')), ''), p_amount, p_expires,
            nullif(btrim(coalesce(p_note, '')), ''), auth.uid(), now())
    returning * into v_row;
  else
    update public.course_enrollments
       set status = case when p_access = 'awaiting' then 'awaiting_payment'
                         when status = 'completed' then 'completed' else 'enrolled' end,
           payment_status = p_access, payment_method = nullif(btrim(coalesce(p_method, '')), ''),
           payment_reference = nullif(btrim(coalesce(p_reference, '')), ''), amount_kes = coalesce(p_amount, amount_kes),
           access_expires_at = p_expires, admin_note = coalesce(nullif(btrim(coalesce(p_note, '')), ''), admin_note),
           granted_by = auth.uid(), revoked_at = null
     where id = v_existing.id
    returning * into v_row;
  end if;

  perform public.write_admin_audit('enrolment.grant', v_user, to_jsonb(v_existing),
    jsonb_build_object('enrolment', v_row.id, 'course', p_course, 'access', p_access, 'amount', p_amount, 'expires', p_expires));
  return jsonb_build_object('id', v_row.id, 'status', v_row.status, 'user_id', v_user, 'existing', v_existing.id is not null);
end $$;
revoke all on function public.admin_enrol_learner(text, uuid, text, text, text, numeric, timestamptz, text) from public, anon;
grant execute on function public.admin_enrol_learner(text, uuid, text, text, text, numeric, timestamptz, text) to authenticated;

-- 4b. Change an enrolment ----------------------------------------------------------------------------------------
drop function if exists public.admin_update_enrolment(uuid, text, timestamptz, text, text, text, numeric);
create function public.admin_update_enrolment(
  p_enrolment uuid, p_action text, p_expires timestamptz default null, p_note text default null,
  p_method text default null, p_reference text default null, p_amount numeric default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_old public.course_enrollments; v_new public.course_enrollments;
begin
  perform public.require_admin();
  select * into v_old from public.course_enrollments where id = p_enrolment;
  if v_old.id is null then raise exception 'That enrolment was not found.'; end if;

  if p_action = 'confirm_payment' then
    update public.course_enrollments set status = case when status = 'completed' then 'completed' else 'enrolled' end,
           payment_status = 'paid', payment_method = coalesce(nullif(btrim(coalesce(p_method, '')), ''), payment_method),
           payment_reference = coalesce(nullif(btrim(coalesce(p_reference, '')), ''), payment_reference),
           amount_kes = coalesce(p_amount, amount_kes), revoked_at = null,
           admin_note = coalesce(nullif(btrim(coalesce(p_note, '')), ''), admin_note)
     where id = p_enrolment returning * into v_new;
  elsif p_action = 'revoke' then
    update public.course_enrollments set status = 'revoked', revoked_at = now(),
           admin_note = coalesce(nullif(btrim(coalesce(p_note, '')), ''), admin_note)
     where id = p_enrolment returning * into v_new;
  elsif p_action = 'refund' then
    update public.course_enrollments set status = 'revoked', revoked_at = now(), payment_status = 'refunded',
           admin_note = coalesce(nullif(btrim(coalesce(p_note, '')), ''), admin_note)
     where id = p_enrolment returning * into v_new;
  elsif p_action = 'restore' then
    update public.course_enrollments set status = case when completion_date is not null or completed_at is not null then 'completed' else 'enrolled' end,
           revoked_at = null, payment_status = case when payment_status = 'refunded' then 'waived' else payment_status end
     where id = p_enrolment returning * into v_new;
  elsif p_action = 'set_expiry' then
    update public.course_enrollments set access_expires_at = p_expires where id = p_enrolment returning * into v_new;
  elsif p_action = 'note' then
    update public.course_enrollments set admin_note = nullif(btrim(coalesce(p_note, '')), '') where id = p_enrolment returning * into v_new;
  else
    raise exception 'Unknown action.';
  end if;

  perform public.write_admin_audit('enrolment.' || p_action, v_old.user_id, to_jsonb(v_old), to_jsonb(v_new));
  return jsonb_build_object('id', v_new.id, 'status', v_new.status, 'payment_status', v_new.payment_status);
end $$;
revoke all on function public.admin_update_enrolment(uuid, text, timestamptz, text, text, text, numeric) from public, anon;
grant execute on function public.admin_update_enrolment(uuid, text, timestamptz, text, text, text, numeric) to authenticated;

-- 5a. Enrolment list --------------------------------------------------------------------------------------------
drop function if exists public.admin_list_enrolments(text, uuid, text, integer, integer);
create function public.admin_list_enrolments(
  p_search text default null, p_course uuid default null, p_status text default 'all', p_limit integer default 25, p_offset integer default 0)
returns table (
  enrolment_id uuid, user_id uuid, full_name text, email text, phone text, course_id uuid, course_title text, status text,
  payment_status text, payment_method text, payment_reference text, amount_kes numeric, enrolled_at timestamptz,
  access_expires_at timestamptz, admin_note text, progress_pct integer, total_count bigint, counts jsonb)
language plpgsql stable security definer set search_path = public as $$
declare v_q text := lower(btrim(coalesce(p_search, '')));
begin
  perform public.require_admin();
  return query
  with base as (
    select e.*, up.full_name as p_name, up.email as p_email, coalesce(nullif(up.phone, ''), up.whatsapp_number) as p_phone, c.title as c_title,
           case
             when e.status = 'revoked' then 'revoked'
             when e.status = 'awaiting_payment' or e.payment_status = 'awaiting' then 'awaiting'
             when e.access_expires_at is not null and e.access_expires_at <= now() then 'expired'
             else 'active'
           end as bucket
      from public.course_enrollments e
      left join public.user_profiles up on up.id = e.user_id
      left join public.courses c on c.id = e.course_id
     where (p_course is null or e.course_id = p_course)
       and (v_q = '' or lower(coalesce(up.full_name, '')) like '%' || v_q || '%' or lower(coalesce(up.email, '')) like '%' || v_q || '%'
            or regexp_replace(coalesce(up.phone, '') || coalesce(up.whatsapp_number, ''), '\D', '', 'g') like '%' || regexp_replace(v_q, '\D', '', 'g') || '%' and length(regexp_replace(v_q, '\D', '', 'g')) >= 3)
  ), tally as (
    select jsonb_build_object('all', count(*), 'awaiting', count(*) filter (where bucket = 'awaiting'),
             'active', count(*) filter (where bucket = 'active'), 'revoked', count(*) filter (where bucket = 'revoked'),
             'expired', count(*) filter (where bucket = 'expired')) as j from base
  ), filtered as (
    select * from base where coalesce(p_status, 'all') = 'all' or bucket = p_status
  )
  select f.id, f.user_id, f.p_name, f.p_email, f.p_phone, f.course_id, f.c_title, f.bucket, f.payment_status, f.payment_method,
         f.payment_reference, f.amount_kes, coalesce(f.enrollment_date, f.created_at), f.access_expires_at, f.admin_note,
         coalesce((select round(100.0 * count(*) filter (where cp.completed) / nullif((select count(*) from public.course_modules m where m.course_id = f.course_id), 0))::int
                     from public.course_progress cp where cp.user_id = f.user_id and cp.course_id = f.course_id), 0),
         count(*) over (), (select j from tally)
    from filtered f
   order by (f.bucket = 'awaiting') desc, coalesce(f.enrollment_date, f.created_at) desc
   limit greatest(1, least(coalesce(p_limit, 25), 100)) offset greatest(0, coalesce(p_offset, 0));
end $$;
revoke all on function public.admin_list_enrolments(text, uuid, text, integer, integer) from public, anon;
grant execute on function public.admin_list_enrolments(text, uuid, text, integer, integer) to authenticated;

-- 5b. Learner detail --------------------------------------------------------------------------------------------
drop function if exists public.admin_learner_detail(uuid);
create function public.admin_learner_detail(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  perform public.require_admin();
  select jsonb_build_object(
    'profile', (select jsonb_build_object('id', id, 'full_name', full_name, 'email', email, 'phone', coalesce(nullif(phone, ''), whatsapp_number),
                  'professional_id', professional_id, 'role', role, 'created_at', created_at, 'whatsapp_opted_in', whatsapp_opted_in)
                  from public.user_profiles where id = p_user),
    'enrolments', coalesce((select jsonb_agg(jsonb_build_object(
                  'id', e.id, 'course_id', e.course_id, 'course_title', c.title, 'status', e.status, 'payment_status', e.payment_status,
                  'payment_method', e.payment_method, 'payment_reference', e.payment_reference, 'amount_kes', e.amount_kes,
                  'enrolled_at', coalesce(e.enrollment_date, e.created_at), 'access_expires_at', e.access_expires_at, 'admin_note', e.admin_note,
                  'completed_modules', (select count(*) from public.course_progress cp where cp.user_id = p_user and cp.course_id = e.course_id and cp.completed),
                  'total_modules', (select count(*) from public.course_modules m where m.course_id = e.course_id),
                  'last_active', (select max(coalesce(cp.last_accessed_at, cp.updated_at)) from public.course_progress cp where cp.user_id = p_user and cp.course_id = e.course_id))
                  order by coalesce(e.enrollment_date, e.created_at) desc)
                  from public.course_enrollments e left join public.courses c on c.id = e.course_id where e.user_id = p_user), '[]'::jsonb),
    'quiz_attempts', coalesce((select jsonb_agg(jsonb_build_object('quiz', coalesce(q.title, m.title, 'Quiz'), 'lesson', m.title, 'course', c.title,
                  'score', a.score, 'passed', a.passed, 'at', coalesce(a.completed_at, a.created_at)) order by coalesce(a.completed_at, a.created_at) desc)
                  from public.user_quiz_attempts a left join public.lesson_quizzes q on q.id = a.quiz_id
                  left join public.course_modules m on m.id = q.lesson_id left join public.courses c on c.id = m.course_id
                  where a.user_id = p_user), '[]'::jsonb),
    'certificates', coalesce((select jsonb_agg(jsonb_build_object('id', ce.id, 'course_id', ce.course_id, 'course_title', c.title,
                  'issued', coalesce(ce.issued_date, ce.created_at), 'code', ce.certificate_code) order by coalesce(ce.issued_date, ce.created_at) desc)
                  from public.certificates ce left join public.courses c on c.id = ce.course_id where ce.user_id = p_user), '[]'::jsonb),
    'audit', coalesce((select jsonb_agg(jsonb_build_object('action', l.action, 'actor', l.actor_email, 'at', l.created_at, 'new', l.new_value) order by l.created_at desc)
                  from (select * from public.admin_audit_log where target_user_id = p_user order by created_at desc limit 50) l), '[]'::jsonb)
  ) into v;
  if v -> 'profile' = 'null'::jsonb or v -> 'profile' is null then raise exception 'That learner was not found.'; end if;
  return v;
end $$;
revoke all on function public.admin_learner_detail(uuid) from public, anon;
grant execute on function public.admin_learner_detail(uuid) to authenticated;

-- 5c. Learning analytics ----------------------------------------------------------------------------------------
drop function if exists public.admin_learning_stats(integer, uuid);
create function public.admin_learning_stats(p_days integer default 30, p_course uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 30), 365));
  v_from timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)));
  v_prev timestamptz := now() - make_interval(days => 2 * greatest(1, least(coalesce(p_days, 30), 365)));
  v_drop_course uuid;
  v_weeks integer := greatest(4, least(13, ceil(greatest(1, least(coalesce(p_days, 30), 365)) / 7.0)::int));
  v jsonb;
begin
  perform public.require_admin();
  select coalesce(p_course, (select course_id from public.course_enrollments group by course_id order by count(*) desc limit 1)) into v_drop_course;

  with e as (
    select en.*, coalesce(en.enrollment_date, en.created_at) as at, coalesce(c.is_free, false) or coalesce(c.price, 0) = 0 as free_course
      from public.course_enrollments en join public.courses c on c.id = en.course_id
     where p_course is null or en.course_id = p_course
  )
  select jsonb_build_object(
    'days', v_days,
    'kpis', jsonb_build_object(
      'revenue', coalesce((select sum(amount_kes) from e where payment_status = 'paid' and at >= v_from), 0),
      'revenue_prev', coalesce((select sum(amount_kes) from e where payment_status = 'paid' and at >= v_prev and at < v_from), 0),
      'enrolments', (select count(*) from e where at >= v_from),
      'enrolments_prev', (select count(*) from e where at >= v_prev and at < v_from),
      'active_learners', (select count(distinct cp.user_id) from public.course_progress cp
                           where coalesce(cp.last_accessed_at, cp.updated_at) >= v_from and (p_course is null or cp.course_id = p_course)),
      'completion_rate', coalesce((select round(100.0 * count(*) filter (where status = 'completed' or completion_date is not null or completed_at is not null)
                                   / nullif(count(*) filter (where status not in ('revoked', 'awaiting_payment')), 0)) from e), 0),
      'certificates', (select count(*) from public.certificates ce where coalesce(ce.issued_date, ce.created_at) >= v_from and (p_course is null or ce.course_id = p_course)),
      'awaiting_payment', (select count(*) from e where status = 'awaiting_payment' or payment_status = 'awaiting')),
    'weekly', coalesce((select jsonb_agg(jsonb_build_object('week', w.wk, 'paid', w.paid, 'free', w.free) order by w.wk)
                from (select gs.wk,
                             (select count(*) from e where at >= gs.wk and at < gs.wk + interval '7 days' and not free_course) as paid,
                             (select count(*) from e where at >= gs.wk and at < gs.wk + interval '7 days' and free_course) as free
                        from (select date_trunc('week', now()) - (n || ' weeks')::interval as wk from generate_series(0, v_weeks - 1) n) gs) w), '[]'::jsonb),
    'funnel', jsonb_build_object(
      'course_page_visits', (select count(*) from public.website_events we where we.event_name = 'page_view' and we.created_at >= v_from
                               and we.path like '/courses/%'),
      'enrolled', (select count(*) from e where at >= v_from and status not in ('awaiting_payment', 'revoked')),
      'opened_lesson', (select count(*) from e where at >= v_from and exists (select 1 from public.course_progress cp where cp.user_id = e.user_id and cp.course_id = e.course_id)),
      'completed', (select count(*) from e where at >= v_from and (status = 'completed' or completion_date is not null or completed_at is not null))),
    'courses', coalesce((select jsonb_agg(x order by (x ->> 'enrolments')::int desc) from (
                  select jsonb_build_object('id', c.id, 'title', c.title,
                    'enrolments', (select count(*) from e where e.course_id = c.id and at >= v_from),
                    'completion', coalesce((select round(100.0 * count(*) filter (where status = 'completed' or completion_date is not null or completed_at is not null)
                                   / nullif(count(*) filter (where status not in ('revoked', 'awaiting_payment')), 0)) from e where e.course_id = c.id), 0),
                    'quiz_pass', (select round(100.0 * count(*) filter (where a.passed) / nullif(count(*), 0)) from public.user_quiz_attempts a
                                    join public.lesson_quizzes q on q.id = a.quiz_id join public.course_modules m on m.id = q.lesson_id where m.course_id = c.id),
                    'revenue', coalesce((select sum(amount_kes) from e where e.course_id = c.id and payment_status = 'paid' and at >= v_from), 0)) as x
                    from public.courses c where (p_course is null or c.id = p_course) and exists (select 1 from e where e.course_id = c.id)
                    limit 20) s), '[]'::jsonb),
    'dropoff', jsonb_build_object('course_id', v_drop_course, 'course_title', (select title from public.courses where id = v_drop_course),
      'lessons', coalesce((select jsonb_agg(jsonb_build_object('title', m.title, 'order', m.order_index,
                    'pct', coalesce(round(100.0 * (select count(distinct cp.user_id) from public.course_progress cp where cp.module_id = m.id)
                           / nullif((select count(*) from public.course_enrollments en where en.course_id = v_drop_course and en.status not in ('revoked', 'awaiting_payment')), 0)), 0))
                    order by m.order_index) from public.course_modules m where m.course_id = v_drop_course), '[]'::jsonb)),
    'hardest_quizzes', coalesce((select jsonb_agg(z order by (z ->> 'first_pass')::numeric) from (
                    select jsonb_build_object('quiz', coalesce(q.title, m.title, 'Quiz'), 'lesson', m.title, 'course', c.title,
                      'first_pass', round(100.0 * count(*) filter (where f.passed) / nullif(count(*), 0)), 'attempts', count(*)) as z
                      from (select distinct on (a.user_id, a.quiz_id) a.* from public.user_quiz_attempts a order by a.user_id, a.quiz_id, coalesce(a.completed_at, a.created_at)) f
                      join public.lesson_quizzes q on q.id = f.quiz_id join public.course_modules m on m.id = q.lesson_id join public.courses c on c.id = m.course_id
                     where p_course is null or c.id = p_course
                     group by q.id, q.title, m.title, c.title having count(*) >= 3
                     order by round(100.0 * count(*) filter (where f.passed) / nullif(count(*), 0)) limit 5) t), '[]'::jsonb),
    'attention', jsonb_build_object(
      'awaiting_over_24h', (select count(*) from e where (status = 'awaiting_payment' or payment_status = 'awaiting') and at < now() - interval '24 hours'),
      'stuck_14_days', (select count(*) from e where status in ('enrolled', 'active') and completion_date is null and completed_at is null
                          and coalesce((select max(coalesce(cp.last_accessed_at, cp.updated_at)) from public.course_progress cp where cp.user_id = e.user_id and cp.course_id = e.course_id), at) < now() - interval '14 days'),
      'expiring_7_days', (select count(*) from e where access_expires_at between now() and now() + interval '7 days'),
      'reviews_pending', (select count(*) from public.testimonials t where not coalesce(t.is_published, false)))
  ) into v
  from (select 1) one;
  return v;
end $$;
revoke all on function public.admin_learning_stats(integer, uuid) from public, anon;
grant execute on function public.admin_learning_stats(integer, uuid) to authenticated;

commit;
