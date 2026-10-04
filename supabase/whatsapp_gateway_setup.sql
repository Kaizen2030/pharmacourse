-- Student WhatsApp opt-in and local tutor gateway audit. Run after whatsapp_tutor_setup.sql.
begin;

alter table public.user_profiles
  add column if not exists whatsapp_number text,
  add column if not exists whatsapp_opted_in boolean not null default false,
  add column if not exists whatsapp_opted_in_at timestamptz;

create table if not exists public.whatsapp_broadcast_log (
  id uuid primary key default gen_random_uuid(),
  instance_id text not null,
  course_id uuid references public.courses(id) on delete set null,
  sent integer not null default 0,
  failed integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now()
);

alter table public.whatsapp_broadcast_log enable row level security;
grant select on public.whatsapp_broadcast_log to authenticated;
drop policy if exists "Admins read broadcast log" on public.whatsapp_broadcast_log;
create policy "Admins read broadcast log" on public.whatsapp_broadcast_log
  for select to authenticated using (public.is_admin());

commit;