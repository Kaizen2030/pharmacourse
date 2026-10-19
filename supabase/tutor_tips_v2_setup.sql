-- Tutor tips v2: shared course staff, drafts, scheduling metadata, and delivery history.
-- Run after whatsapp_tutor_setup.sql.
begin;

create table if not exists public.course_tutors (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  instructor_id uuid not null references public.instructors(id) on delete cascade,
  role text not null default 'assistant' check (role in ('lead', 'assistant')),
  created_at timestamptz not null default now(),
  unique (course_id, instructor_id)
);

create index if not exists course_tutors_course_idx on public.course_tutors (course_id);
create index if not exists course_tutors_instructor_idx on public.course_tutors (instructor_id);

alter table public.course_tutors enable row level security;
grant select, insert, update, delete on public.course_tutors to authenticated;

drop policy if exists "Course owners manage tutor assignments" on public.course_tutors;
create policy "Course owners manage tutor assignments"
on public.course_tutors for all to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.courses c
    left join public.instructors i on i.id = c.instructor_id
    where c.id = course_id
      and (c.instructor_id = auth.uid() or i.linked_user_id = auth.uid())
  )
  or exists (
    select 1 from public.instructors i
    where i.id = instructor_id and i.linked_user_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.courses c
    left join public.instructors i on i.id = c.instructor_id
    where c.id = course_id
      and (c.instructor_id = auth.uid() or i.linked_user_id = auth.uid())
  )
);

create or replace function public.can_manage_course_tips(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.courses c
      left join public.instructors i on i.id = c.instructor_id
      where c.id = target_course_id
        and (c.instructor_id = auth.uid() or i.linked_user_id = auth.uid())
    )
    or exists (
      select 1
      from public.course_tutors ct
      join public.instructors i on i.id = ct.instructor_id
      where ct.course_id = target_course_id and i.linked_user_id = auth.uid()
    );
$$;

revoke all on function public.can_manage_course_tips(uuid) from public;
grant execute on function public.can_manage_course_tips(uuid) to authenticated;

alter table public.tutor_whatsapp_posts
  add column if not exists tip_status text,
  add column if not exists scheduled_for timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists position integer not null default 0,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

update public.tutor_whatsapp_posts
set tip_status = case when is_published then 'sent' else 'draft' end
where tip_status is null;

alter table public.tutor_whatsapp_posts
  alter column tip_status set default 'draft',
  alter column tip_status set not null;

alter table public.tutor_whatsapp_posts drop constraint if exists tutor_whatsapp_posts_status_check;
alter table public.tutor_whatsapp_posts add constraint tutor_whatsapp_posts_status_check
  check (tip_status in ('draft', 'scheduled', 'sent'));

create index if not exists tutor_whatsapp_posts_status_idx
  on public.tutor_whatsapp_posts (course_id, tip_status, scheduled_for);

drop policy if exists "Tutors manage own course tips" on public.tutor_whatsapp_posts;
create policy "Course staff manage tips"
on public.tutor_whatsapp_posts for all to authenticated
using (public.can_manage_course_tips(course_id))
with check (public.can_manage_course_tips(course_id));

create table if not exists public.tutor_tip_deliveries (
  id uuid primary key default gen_random_uuid(),
  tip_id uuid not null references public.tutor_whatsapp_posts(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  learner_id uuid not null references auth.users(id) on delete cascade,
  recipient_number text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'opted_out')),
  attempts integer not null default 0 check (attempts >= 0),
  error text,
  queued_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (tip_id, learner_id)
);

create index if not exists tutor_tip_deliveries_tip_idx
  on public.tutor_tip_deliveries (tip_id, status);
create index if not exists tutor_tip_deliveries_learner_idx
  on public.tutor_tip_deliveries (learner_id, queued_at desc);

alter table public.tutor_tip_deliveries enable row level security;
grant select, insert, update on public.tutor_tip_deliveries to authenticated;

drop policy if exists "Course staff view tip deliveries" on public.tutor_tip_deliveries;
create policy "Course staff view tip deliveries"
on public.tutor_tip_deliveries for select to authenticated
using (public.can_manage_course_tips(course_id) or learner_id = auth.uid());

drop policy if exists "Course staff manage tip deliveries" on public.tutor_tip_deliveries;
create policy "Course staff manage tip deliveries"
on public.tutor_tip_deliveries for insert to authenticated
with check (public.can_manage_course_tips(course_id));

drop policy if exists "Course staff update tip deliveries" on public.tutor_tip_deliveries;
create policy "Course staff update tip deliveries"
on public.tutor_tip_deliveries for update to authenticated
using (public.can_manage_course_tips(course_id))
with check (public.can_manage_course_tips(course_id));

commit;
