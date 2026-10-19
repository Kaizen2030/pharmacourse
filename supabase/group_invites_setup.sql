-- Class WhatsApp group + automatic invite on enrollment
-- Run once in the Supabase SQL editor.

-- 1) Group settings per course. Kept OFF the public courses table so the
--    invite link is only visible to enrolled learners, the tutor and admins.
create table if not exists public.course_whatsapp_groups (
  course_id     uuid primary key references public.courses(id) on delete cascade,
  invite_url    text not null check (invite_url ~ '^https://chat\.whatsapp\.com/'),
  group_jid     text,                       -- filled by the gateway (e.g. 1203630...@g.us)
  auto_invite   boolean not null default true,
  welcome_text  text,
  updated_at    timestamptz not null default now()
);
alter table public.course_whatsapp_groups enable row level security;
grant select, insert, update, delete on public.course_whatsapp_groups to authenticated;

-- helper: is the current user the tutor of this course (or an admin)?
create or replace function public.is_course_tutor(p_course uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
    or exists (
    select 1 from public.courses c
    join public.instructors i on i.id = c.instructor_id
    where c.id = p_course
      and (c.instructor_id = auth.uid() or i.linked_user_id = auth.uid())
  );
$$;

drop policy if exists "tutor manages group" on public.course_whatsapp_groups;
create policy "tutor manages group" on public.course_whatsapp_groups
  for all using (public.is_course_tutor(course_id)) with check (public.is_course_tutor(course_id));

-- 2) Invite queue: one row per learner per course (never double-sends).
create table if not exists public.whatsapp_group_invites (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references public.courses(id) on delete cascade,
  user_id      uuid not null,
  status       text not null default 'queued'
               check (status in ('queued','sent','failed','skipped')),
  reason       text,
  attempts     int not null default 0,
  created_at   timestamptz not null default now(),
  sent_at      timestamptz,
  unique (course_id, user_id)
);
alter table public.whatsapp_group_invites enable row level security;
grant select on public.whatsapp_group_invites to authenticated;

drop policy if exists "learner sees own invite" on public.whatsapp_group_invites;
create policy "learner sees own invite" on public.whatsapp_group_invites
  for select using (user_id = auth.uid());
drop policy if exists "tutor sees course invites" on public.whatsapp_group_invites;
create policy "tutor sees course invites" on public.whatsapp_group_invites
  for select using (public.is_course_tutor(course_id));

-- 3) Enrollment trigger: queue an invite automatically.
create or replace function public.queue_group_invite()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.course_whatsapp_groups g
             where g.course_id = new.course_id and g.auto_invite) then
    insert into public.whatsapp_group_invites (course_id, user_id)
    values (new.course_id, new.user_id)
    on conflict (course_id, user_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists trg_queue_group_invite on public.course_enrollments;
create trigger trg_queue_group_invite
  after insert on public.course_enrollments
  for each row execute function public.queue_group_invite();

-- 4) Enrolled learners fetch the link through this function only.
create or replace function public.get_my_course_group(p_course uuid)
returns table (invite_url text, welcome_text text, invite_status text)
language sql stable security definer set search_path = public as $$
  select g.invite_url, g.welcome_text,
         (select i.status from public.whatsapp_group_invites i
           where i.course_id = p_course and i.user_id = auth.uid())
  from public.course_whatsapp_groups g
  where g.course_id = p_course
    and ( exists (select 1 from public.course_enrollments e
                  where e.course_id = p_course and e.user_id = auth.uid())
          or public.is_course_tutor(p_course) );
$$;
grant execute on function public.get_my_course_group(uuid) to authenticated;

-- 5) Backfill: tutor invites everyone already enrolled.
create or replace function public.queue_group_invites_for_course(p_course uuid)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_course_tutor(p_course) then raise exception 'Not allowed'; end if;
  insert into public.whatsapp_group_invites (course_id, user_id)
  select e.course_id, e.user_id from public.course_enrollments e
  where e.course_id = p_course
  on conflict (course_id, user_id) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.queue_group_invites_for_course(uuid) to authenticated;

-- 6) Counts for the tutor panel.
create or replace function public.group_invite_stats(p_course uuid)
returns table (status text, total bigint)
language sql stable security definer set search_path = public as $$
  select i.status, count(*) from public.whatsapp_group_invites i
  where i.course_id = p_course and public.is_course_tutor(p_course)
  group by i.status;
$$;
grant execute on function public.group_invite_stats(uuid) to authenticated;
