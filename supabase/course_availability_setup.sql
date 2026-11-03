-- Course readiness for courses that are published before their curriculum is ready.
-- Run this once in the Supabase SQL editor.
begin;

alter table public.courses
  add column if not exists is_available boolean not null default false;

comment on column public.courses.is_available is
  'When true, a published course without modules can accept learner applications.';

commit;
