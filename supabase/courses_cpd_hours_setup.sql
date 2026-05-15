-- Add CPD hours to courses
-- Run this in the Supabase SQL editor.

begin;

alter table public.courses
add column if not exists cpd_hours numeric(5, 2) not null default 2;

update public.courses
set cpd_hours = 2
where cpd_hours is null;

comment on column public.courses.cpd_hours is
'CPD hours awarded when a learner completes the course.';

commit;
