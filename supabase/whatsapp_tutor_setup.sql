-- Tutor-controlled WhatsApp settings for Pharmacourse. Run after instructors_setup.sql.
begin;

alter table public.instructors
  add column if not exists linked_user_id uuid references auth.users(id) on delete set null,
  add column if not exists whatsapp_enabled boolean not null default false,
  add column if not exists whatsapp_mode text not null default 'channel',
  add column if not exists whatsapp_url text,
  add column if not exists whatsapp_number text,
  add column if not exists whatsapp_title text,
  add column if not exists whatsapp_blurb text;

alter table public.courses
  add column if not exists whatsapp_enabled boolean,
  add column if not exists whatsapp_mode text,
  add column if not exists whatsapp_url text,
  add column if not exists whatsapp_number text,
  add column if not exists whatsapp_title text,
  add column if not exists whatsapp_blurb text;

alter table public.instructors drop constraint if exists instructors_whatsapp_mode_check;
alter table public.instructors add constraint instructors_whatsapp_mode_check
  check (whatsapp_mode in ('channel', 'group', 'chat'));
alter table public.courses drop constraint if exists courses_whatsapp_mode_check;
alter table public.courses add constraint courses_whatsapp_mode_check
  check (whatsapp_mode is null or whatsapp_mode in ('channel', 'group', 'chat'));

create unique index if not exists instructors_linked_user_id_unique
  on public.instructors (linked_user_id)
  where linked_user_id is not null;

drop policy if exists "Linked instructors can view own courses" on public.courses;
create policy "Linked instructors can view own courses"
on public.courses for select to authenticated
using (exists (
  select 1 from public.instructors i
  where i.id = courses.instructor_id and i.linked_user_id = auth.uid()
));

drop policy if exists "Tutors update own linked instructor profile" on public.instructors;
create policy "Tutors update own linked instructor profile"
on public.instructors for update to authenticated
using (linked_user_id = auth.uid())
with check (linked_user_id = auth.uid());

create table if not exists public.tutor_whatsapp_posts (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  instructor_id uuid references public.instructors(id) on delete set null,
  title text not null,
  body text not null,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists tutor_whatsapp_posts_course_idx
  on public.tutor_whatsapp_posts (course_id, created_at desc);

alter table public.tutor_whatsapp_posts enable row level security;
grant select on public.tutor_whatsapp_posts to anon, authenticated;
grant insert, update, delete on public.tutor_whatsapp_posts to authenticated;

drop policy if exists "Public can view published tips" on public.tutor_whatsapp_posts;
create policy "Public can view published tips"
on public.tutor_whatsapp_posts for select to public
using (
  is_published = true
  and exists (select 1 from public.courses c where c.id = course_id and c.is_published = true)
);

drop policy if exists "Tutors manage own course tips" on public.tutor_whatsapp_posts;
create policy "Tutors manage own course tips"
on public.tutor_whatsapp_posts for all to authenticated
using (
  exists (
    select 1 from public.courses c
    join public.instructors i on i.id = c.instructor_id
    where c.id = course_id and (c.instructor_id = auth.uid() or i.linked_user_id = auth.uid())
  )
)
with check (
  exists (
    select 1 from public.courses c
    join public.instructors i on i.id = c.instructor_id
    where c.id = course_id and (c.instructor_id = auth.uid() or i.linked_user_id = auth.uid())
  )
);

drop policy if exists "Admins manage all tips" on public.tutor_whatsapp_posts;
create policy "Admins manage all tips"
on public.tutor_whatsapp_posts for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- This number belongs to Julius Kinyua Wanjau's instructor profile only.
update public.instructors
set whatsapp_enabled = true,
    whatsapp_mode = 'chat',
    whatsapp_number = '254790059584',
    whatsapp_title = 'Message Julius Kinyua Wanjau',
    whatsapp_blurb = 'Ask Julius about this course on WhatsApp.'
where lower(trim(name)) = lower('Julius Kinyua Wanjau');

commit;