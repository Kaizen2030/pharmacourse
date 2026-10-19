-- Repair permissions for the class WhatsApp group feature.
-- Run this once if group_invites_setup.sql was already applied before the grants
-- were added to that migration.

grant select, insert, update, delete
on table public.course_whatsapp_groups
to authenticated;

grant select
on table public.whatsapp_group_invites
to authenticated;

create or replace function public.is_course_tutor(p_course uuid)
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
      join public.instructors i on i.id = c.instructor_id
      where c.id = p_course
        and (c.instructor_id = auth.uid() or i.linked_user_id = auth.uid())
    );
$$;

grant execute on function public.is_course_tutor(uuid) to authenticated;

grant execute on function public.get_my_course_group(uuid) to authenticated;
grant execute on function public.queue_group_invites_for_course(uuid) to authenticated;
grant execute on function public.group_invite_stats(uuid) to authenticated;
