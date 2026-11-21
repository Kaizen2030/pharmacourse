-- PHASE 2: stop privilege escalation. Pharmacourse project (nnjiutikutsjvggakvvv). Re-runnable.
-- Rollback: 2026-11-23_phase2_roles_rollback.sql
--
-- Problems (confirmed in the live snapshot):
-- 1. "Users can update own profile" lets a user change every column of their row, including role and admin_role,
--    and is_admin() trusts role = 'admin'. One browser-console update made any student a full admin.
-- 2. "Admins can update all profiles" let content admins edit any profile, including making someone a super admin.
-- 3. Any signed-in user could create an instructors row with their own id, then create and publish courses and
--    modules under it ("Instructors can create own profile" / "...manage own courses" / "...own course modules").
--    Nothing in the website uses those paths; admins manage courses and linked tutors keep editing their profile.
-- 4. simulation_responses granted signed-out visitors every table privilege (row rules still blocked them).
--
-- After this:
-- - role / admin_role change only through admin_set_role() (super admins) or the SQL editor / service key.
-- - Every role change is written to admin_audit_log.
-- - Users can still edit their own name, professional ID, avatar, phone and WhatsApp settings.

-- 1. Who is a super admin (reads the database, never a token claim the user controls) --------------------------
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_profiles where id = auth.uid() and role = 'admin' and admin_role = 'super');
$$;
revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to anon, authenticated;

-- Requests from the website carry a signed token whose role is 'anon' or 'authenticated'. The SQL editor has no
-- token and the service key's role is 'service_role': those are trusted. (current_user cannot be used inside a
-- SECURITY DEFINER function, where it is always the owner.)
create or replace function public.request_is_trusted_backend()
returns boolean language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''),
                  nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') not in ('anon', 'authenticated');
$$;

-- 2. Audit log --------------------------------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id bigserial primary key,
  actor_id uuid,
  actor_email text,
  action text not null,
  target_user_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;
drop policy if exists "Super admins can read the audit log" on public.admin_audit_log;
create policy "Super admins can read the audit log" on public.admin_audit_log
  for select to authenticated using (public.is_super_admin());

-- 3. Guard role columns on user_profiles ----------------------------------------------------------------------
create or replace function public.guard_user_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  trusted boolean := public.request_is_trusted_backend() or public.is_super_admin();
begin
  if tg_op = 'INSERT' then
    if not trusted then
      -- Self-created profiles always start as a student with the sign-in email.
      new.role := 'student';
      new.admin_role := null;
      new.email := coalesce((select u.email from auth.users u where u.id = new.id), new.email);
    end if;
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'A profile id cannot change.';
  end if;
  if (new.role is distinct from old.role or new.admin_role is distinct from old.admin_role) then
    if not trusted then
      raise exception 'Only a super admin can change roles.' using errcode = '42501';
    end if;
    insert into public.admin_audit_log (actor_id, actor_email, action, target_user_id, old_value, new_value)
    values (auth.uid(), (select u.email from auth.users u where u.id = auth.uid()), 'role_changed', new.id,
            jsonb_build_object('role', old.role, 'admin_role', old.admin_role),
            jsonb_build_object('role', new.role, 'admin_role', new.admin_role));
  end if;
  if not trusted and (new.email is distinct from old.email
                      or new.organization_id is distinct from old.organization_id
                      or new.created_at is distinct from old.created_at) then
    raise exception 'Those profile fields cannot be changed here.' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.guard_user_profile_privileges() from public, anon, authenticated;

drop trigger if exists guard_user_profile_privileges on public.user_profiles;
create trigger guard_user_profile_privileges
  before insert or update on public.user_profiles
  for each row execute function public.guard_user_profile_privileges();

-- Content admins no longer edit other people's profiles; super admins do (role changes go through the function).
drop policy if exists "Admins can update all profiles" on public.user_profiles;
drop policy if exists "Super admins can update all profiles" on public.user_profiles;
create policy "Super admins can update all profiles" on public.user_profiles
  for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- 4. The only way the website changes roles ----------------------------------------------------------------------
-- p_level: 'student' | 'content' | 'super'
create or replace function public.admin_set_role(p_user_id uuid, p_level text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_level text := lower(btrim(coalesce(p_level, '')));
  v_target public.user_profiles%rowtype;
  v_supers integer;
begin
  if not public.is_super_admin() then raise exception 'Only a super admin can change roles.' using errcode = '42501'; end if;
  if v_level not in ('student', 'content', 'super') then raise exception 'Unknown access level %.', p_level; end if;
  if p_user_id = auth.uid() then raise exception 'You cannot change your own access level.'; end if;
  select * into v_target from public.user_profiles where id = p_user_id for update;
  if not found then raise exception 'That user was not found.'; end if;
  if v_target.role = 'admin' and v_target.admin_role = 'super' and v_level <> 'super' then
    select count(*) into v_supers from public.user_profiles where role = 'admin' and admin_role = 'super';
    if v_supers <= 1 then raise exception 'You cannot remove the last super admin.'; end if;
  end if;
  update public.user_profiles
     set role = case when v_level = 'student' then 'student' else 'admin' end,
         admin_role = case when v_level = 'student' then null else v_level end
   where id = p_user_id;
  return jsonb_build_object('id', p_user_id, 'level', v_level);
end $$;
revoke all on function public.admin_set_role(uuid, text) from public, anon;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

-- 5. No self-made instructors, courses or modules ------------------------------------------------------------------
drop policy if exists "Instructors can create own profile" on public.instructors;
drop policy if exists "Instructors can manage own courses" on public.courses;
drop policy if exists "Instructors can manage own course modules" on public.course_modules;

-- 6. Signed-out visitors have no business writing simulation responses -------------------------------------------
revoke all on public.simulation_responses from anon;
