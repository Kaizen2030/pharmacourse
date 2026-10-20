-- Video consults for the patient portal (runs on the RemedacarePOS / pharmacyos Supabase project)
-- Room = one appointment. Only METADATA is stored. No recordings, no chat logs.

-- 1) Who counts as pharmacy staff.
--    Existing POS staff in web_users are accepted automatically when that table
--    is present. consult_staff remains available for a manual allow-list.
create table if not exists public.consult_staff (
  user_id     uuid not null references auth.users(id) on delete cascade,
  pharmacy_id text not null,
  primary key (user_id, pharmacy_id)
);
alter table public.consult_staff enable row level security;
revoke all on public.consult_staff from anon, authenticated;

create or replace function public.consult_is_staff(p_pharmacy_id text, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.consult_staff cs
    where cs.user_id = p_user_id
      and (
        cs.pharmacy_id = p_pharmacy_id
        -- staff of a parent pharmacy may also serve its branches
        or exists (
          select 1 from public.pharmacies ph
          where ph.id::text = p_pharmacy_id
            and ph.parent_pharmacy_id::text = cs.pharmacy_id
        )
      )
  )
  or exists (
    select 1
    from public.web_users wu
    where wu.auth_user_id = p_user_id
      and (
        wu.branch_pharmacy_id::text = p_pharmacy_id
        or (wu.branch_pharmacy_id is null and wu.pharmacy_id::text = p_pharmacy_id)
        or exists (
          select 1
          from public.pharmacies ph
          where ph.id::text = p_pharmacy_id
            and (
              ph.parent_pharmacy_id::text = wu.pharmacy_id::text
              or ph.parent_pharmacy_id::text = wu.branch_pharmacy_id::text
            )
        )
      )
  );
$$;
revoke all on function public.consult_is_staff(text, uuid) from public, anon, authenticated;
grant execute on function public.consult_is_staff(text, uuid) to service_role;

-- 2) One row per consult room. Browsers never touch this table; the Edge Function
--    (service role) is the only reader/writer, so RLS is ON with NO policies.
create table if not exists public.consult_sessions (
  appointment_id    text primary key,
  pharmacy_id       text not null,
  patient_id        text,
  status            text not null default 'live' check (status in ('live','ended')),
  signal_secret     text not null,   -- unguessable part of the Realtime channel name
  started_by        uuid,
  started_at        timestamptz not null default now(),
  patient_joined_at timestamptz,
  ended_at          timestamptz,
  duration_seconds  integer
);
alter table public.consult_sessions enable row level security;
revoke all on public.consult_sessions from anon, authenticated;

create index if not exists consult_sessions_pharmacy_idx
  on public.consult_sessions (pharmacy_id, started_at desc);

-- 3) Register each pharmacist who may run consults (their auth user id + pharmacy id):
-- insert into public.consult_staff (user_id, pharmacy_id) values ('<auth-user-uuid>', '<pharmacy-id>');
