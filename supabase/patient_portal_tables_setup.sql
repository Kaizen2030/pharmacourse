-- Patient portal core tables for PharmaCourse / RemedaCare
-- Run this in the Supabase SQL editor after the auth baseline and patient portal lookup helpers.

begin;

create or replace function public.current_patient_portal_phone()
returns text
language sql
stable
as $$
  select nullif(
    trim(
      coalesce(
        auth.jwt() -> 'user_metadata' ->> 'patient_phone',
        auth.jwt() -> 'user_metadata' ->> 'phone',
        auth.jwt() -> 'app_metadata' ->> 'patient_phone',
        ''
      )
    ),
    ''
  );
$$;

create or replace function public.touch_patient_portal_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

grant usage on schema public to anon, authenticated;

create table if not exists public.prescription_requests (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null,
  branch_id uuid,
  patient_id uuid,
  patient_phone text not null,
  patient_name text not null,
  condition_notes text,
  prescription_image_url text,
  drug_requested text,
  status text not null default 'pending',
  fulfillment_drug_name text,
  fulfillment_items jsonb not null default '[]'::jsonb,
  fulfillment_qty integer,
  receipt_total_kes numeric,
  receipt_number text,
  dispensed_at timestamptz,
  pharmacist_notes text,
  patient_fulfillment_choice text,
  patient_fulfillment_address text,
  patient_fulfillment_notes text,
  patient_fulfillment_at timestamptz,
  patient_response_action text,
  patient_response_notes text,
  patient_response_at timestamptz,
  linked_delivery_id uuid,
  linked_delivery_status text,
  payment_status text,
  payment_method text,
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prescription_requests
  add column if not exists pharmacy_id uuid,
  add column if not exists branch_id uuid,
  add column if not exists patient_id uuid,
  add column if not exists patient_phone text,
  add column if not exists patient_name text,
  add column if not exists condition_notes text,
  add column if not exists prescription_image_url text,
  add column if not exists drug_requested text,
  add column if not exists status text default 'pending',
  add column if not exists fulfillment_drug_name text,
  add column if not exists fulfillment_items jsonb not null default '[]'::jsonb,
  add column if not exists fulfillment_qty integer,
  add column if not exists receipt_total_kes numeric,
  add column if not exists receipt_number text,
  add column if not exists dispensed_at timestamptz,
  add column if not exists pharmacist_notes text,
  add column if not exists patient_fulfillment_choice text,
  add column if not exists patient_fulfillment_address text,
  add column if not exists patient_fulfillment_notes text,
  add column if not exists patient_fulfillment_at timestamptz,
  add column if not exists patient_response_action text,
  add column if not exists patient_response_notes text,
  add column if not exists patient_response_at timestamptz,
  add column if not exists linked_delivery_id uuid,
  add column if not exists linked_delivery_status text,
  add column if not exists payment_status text,
  add column if not exists payment_method text,
  add column if not exists payment_reference text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists prescription_requests_pharmacy_created_idx
  on public.prescription_requests (pharmacy_id, created_at desc);

create index if not exists prescription_requests_phone_created_idx
  on public.prescription_requests (patient_phone, created_at desc);

create index if not exists prescription_requests_status_created_idx
  on public.prescription_requests (status, created_at desc);

create index if not exists prescription_requests_patient_id_idx
  on public.prescription_requests (patient_id, created_at desc);

drop trigger if exists prescription_requests_touch_updated_at on public.prescription_requests;
create trigger prescription_requests_touch_updated_at
before update on public.prescription_requests
for each row execute function public.touch_patient_portal_updated_at();

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null,
  branch_id uuid,
  patient_id uuid,
  patient_phone text not null,
  patient_name text not null,
  appointment_type text not null,
  slot_datetime timestamptz not null,
  condition_summary text not null,
  patient_notes text,
  pharmacist_response text,
  video_link text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.appointments
  add column if not exists pharmacy_id uuid,
  add column if not exists branch_id uuid,
  add column if not exists patient_id uuid,
  add column if not exists patient_phone text,
  add column if not exists patient_name text,
  add column if not exists appointment_type text,
  add column if not exists slot_datetime timestamptz,
  add column if not exists condition_summary text,
  add column if not exists patient_notes text,
  add column if not exists pharmacist_response text,
  add column if not exists video_link text,
  add column if not exists status text default 'pending',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists appointments_pharmacy_slot_idx
  on public.appointments (pharmacy_id, slot_datetime asc);

create index if not exists appointments_phone_created_idx
  on public.appointments (patient_phone, created_at desc);

create index if not exists appointments_status_created_idx
  on public.appointments (status, created_at desc);

create index if not exists appointments_patient_id_idx
  on public.appointments (patient_id, created_at desc);

drop trigger if exists appointments_touch_updated_at on public.appointments;
create trigger appointments_touch_updated_at
before update on public.appointments
for each row execute function public.touch_patient_portal_updated_at();

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null,
  branch_id uuid,
  patient_id uuid,
  patient_phone text not null,
  patient_name text,
  patient_address text,
  patient_location_lat numeric(10, 6),
  patient_location_lng numeric(10, 6),
  rider_name text,
  rider_phone text,
  delivery_partner_type text,
  estimated_delivery_minutes integer,
  items jsonb not null default '[]'::jsonb,
  total_kes numeric,
  status text not null default 'pending',
  prescription_request_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  delivered_at timestamptz
);

alter table public.deliveries
  add column if not exists pharmacy_id uuid,
  add column if not exists branch_id uuid,
  add column if not exists patient_id uuid,
  add column if not exists patient_phone text,
  add column if not exists patient_name text,
  add column if not exists patient_address text,
  add column if not exists patient_location_lat numeric(10, 6),
  add column if not exists patient_location_lng numeric(10, 6),
  add column if not exists rider_name text,
  add column if not exists rider_phone text,
  add column if not exists delivery_partner_type text,
  add column if not exists estimated_delivery_minutes integer,
  add column if not exists items jsonb not null default '[]'::jsonb,
  add column if not exists total_kes numeric,
  add column if not exists status text default 'pending',
  add column if not exists prescription_request_id uuid,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists delivered_at timestamptz;

create index if not exists deliveries_pharmacy_created_idx
  on public.deliveries (pharmacy_id, created_at desc);

create index if not exists deliveries_phone_created_idx
  on public.deliveries (patient_phone, created_at desc);

create index if not exists deliveries_status_created_idx
  on public.deliveries (status, created_at desc);

create index if not exists deliveries_request_idx
  on public.deliveries (prescription_request_id);

create index if not exists deliveries_patient_id_idx
  on public.deliveries (patient_id, created_at desc);

drop trigger if exists deliveries_touch_updated_at on public.deliveries;
create trigger deliveries_touch_updated_at
before update on public.deliveries
for each row execute function public.touch_patient_portal_updated_at();

create table if not exists public.patient_notifications (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null,
  branch_id uuid,
  patient_id uuid,
  patient_phone text not null,
  reference_id text,
  type text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.patient_notifications
  add column if not exists pharmacy_id uuid,
  add column if not exists branch_id uuid,
  add column if not exists patient_id uuid,
  add column if not exists patient_phone text,
  add column if not exists reference_id text,
  add column if not exists type text,
  add column if not exists message text,
  add column if not exists read boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists patient_notifications_pharmacy_created_idx
  on public.patient_notifications (pharmacy_id, created_at desc);

create index if not exists patient_notifications_phone_created_idx
  on public.patient_notifications (patient_phone, created_at desc);

create index if not exists patient_notifications_reference_idx
  on public.patient_notifications (reference_id);

create index if not exists patient_notifications_read_idx
  on public.patient_notifications (patient_phone, read, created_at desc);

create index if not exists patient_notifications_patient_id_idx
  on public.patient_notifications (patient_id, created_at desc);

drop trigger if exists patient_notifications_touch_updated_at on public.patient_notifications;
create trigger patient_notifications_touch_updated_at
before update on public.patient_notifications
for each row execute function public.touch_patient_portal_updated_at();

alter table public.prescription_requests enable row level security;
alter table public.appointments enable row level security;
alter table public.deliveries enable row level security;
alter table public.patient_notifications enable row level security;

grant select, insert, update on public.prescription_requests to authenticated;
grant select, insert, update on public.appointments to authenticated;
grant select, insert, update on public.deliveries to authenticated;
grant select, insert, update on public.patient_notifications to authenticated;

drop policy if exists "Patients can read own prescription requests" on public.prescription_requests;
create policy "Patients can read own prescription requests"
on public.prescription_requests
for select
to authenticated
using (
  patient_phone = public.current_patient_portal_phone()
  or public.is_admin()
);

drop policy if exists "Patients can create own prescription requests" on public.prescription_requests;
create policy "Patients can create own prescription requests"
on public.prescription_requests
for insert
to authenticated
with check (
  patient_phone = public.current_patient_portal_phone()
  or public.is_admin()
);

drop policy if exists "Patients can update own prescription requests" on public.prescription_requests;
create policy "Patients can update own prescription requests"
on public.prescription_requests
for update
to authenticated
using (
  patient_phone = public.current_patient_portal_phone()
  or public.is_admin()
)
with check (
  patient_phone = public.current_patient_portal_phone()
  or public.is_admin()
);

drop policy if exists "Admins can manage prescription requests" on public.prescription_requests;
create policy "Admins can manage prescription requests"
on public.prescription_requests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Patients can read own appointments" on public.appointments;
create policy "Patients can read own appointments"
on public.appointments
for select
to authenticated
using (
  patient_phone = public.current_patient_portal_phone()
  or public.is_admin()
);

drop policy if exists "Patients can create own appointments" on public.appointments;
create policy "Patients can create own appointments"
on public.appointments
for insert
to authenticated
with check (
  patient_phone = public.current_patient_portal_phone()
  or public.is_admin()
);

drop policy if exists "Patients can update own appointments" on public.appointments;
create policy "Patients can update own appointments"
on public.appointments
for update
to authenticated
using (
  patient_phone = public.current_patient_portal_phone()
  or public.is_admin()
)
with check (
  patient_phone = public.current_patient_portal_phone()
  or public.is_admin()
);

drop policy if exists "Admins can manage appointments" on public.appointments;
create policy "Admins can manage appointments"
on public.appointments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Patients can read own deliveries" on public.deliveries;
create policy "Patients can read own deliveries"
on public.deliveries
for select
to authenticated
using (
  patient_phone = public.current_patient_portal_phone()
  or public.is_admin()
);

drop policy if exists "Admins can manage deliveries" on public.deliveries;
create policy "Admins can manage deliveries"
on public.deliveries
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Patients can read own notifications" on public.patient_notifications;
create policy "Patients can read own notifications"
on public.patient_notifications
for select
to authenticated
using (
  patient_phone = public.current_patient_portal_phone()
  or public.is_admin()
);

drop policy if exists "Patients can update own notifications" on public.patient_notifications;
create policy "Patients can update own notifications"
on public.patient_notifications
for update
to authenticated
using (
  patient_phone = public.current_patient_portal_phone()
  or public.is_admin()
)
with check (
  patient_phone = public.current_patient_portal_phone()
  or public.is_admin()
);

drop policy if exists "Admins can manage notifications" on public.patient_notifications;
create policy "Admins can manage notifications"
on public.patient_notifications
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

comment on table public.prescription_requests is
'Patient prescription and refill requests submitted from the PharmaCourse patient portal.';

comment on table public.appointments is
'Patient appointment bookings submitted from the PharmaCourse patient portal.';

comment on table public.deliveries is
'Delivery tracking rows tied to patient prescription requests.';

comment on table public.patient_notifications is
'Branch-to-patient notifications surfaced in the patient portal.';

commit;
