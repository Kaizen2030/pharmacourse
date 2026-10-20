-- Run once in the Supabase SQL editor.

-- 1) BLOCK SELF-ENROLLMENT IN PAID COURSES ---------------------------------
-- Signed-in students may only enroll themselves in free courses.
-- Admins, the SQL editor and server-side (service role) code are allowed, so
-- you can still activate a student after they pay.
create or replace function public.guard_paid_enrollment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  paid boolean;
  is_admin boolean;
begin
  if auth.uid() is null then return new; end if;   -- service role / SQL editor

  select coalesce(role = 'admin', false) into is_admin
  from public.user_profiles where id = auth.uid();
  if is_admin then return new; end if;

  select (not coalesce(c.is_free, false)) and coalesce(c.price, 0) > 0 into paid
  from public.courses c where c.id = new.course_id;

  if paid then
    raise exception 'Payment required before enrolling in this course'
      using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_paid_enrollment on public.course_enrollments;
create trigger trg_guard_paid_enrollment
  before insert on public.course_enrollments
  for each row execute function public.guard_paid_enrollment();

-- AUDIT: who is already enrolled in a paid course? Review before deciding
-- whether they paid (this only lists, it changes nothing).
-- select e.id, e.user_id, c.title, c.price, e.created_at
-- from public.course_enrollments e join public.courses c on c.id = e.course_id
-- where not coalesce(c.is_free,false) and coalesce(c.price,0) > 0
-- order by e.created_at desc;

-- 2) NUMBERS FOR THE HOME PAGE ---------------------------------------------
create or replace function public.platform_stats()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'learners',     (select count(distinct user_id) from public.course_enrollments),
    'courses',      (select count(*) from public.courses where is_published),
    'certificates', (select count(*) from public.certificates)
  );
$$;
grant execute on function public.platform_stats() to anon, authenticated;
