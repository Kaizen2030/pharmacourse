-- Patient Portal POS Supabase access fix
-- Use Option A if you want the portal to read the pharmacies table directly.
-- Use Option B if you prefer exposing a public RPC instead of a direct table read.

-- Option A: allow the patient portal to read pharmacy rows
alter table if exists public.pharmacies enable row level security;

drop policy if exists "Public read pharmacies for patient portal" on public.pharmacies;

create policy "Public read pharmacies for patient portal"
on public.pharmacies
for select
to anon, authenticated
using (true);

-- Option B: public RPC that returns the pharmacy directory
create or replace function public.public_patient_portal_pharmacies()
returns table (
  id uuid,
  name text,
  location text,
  parent_pharmacy_id uuid,
  county text,
  subcounty text,
  town text,
  area text
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.name,
    p.location,
    p.parent_pharmacy_id,
    p.county,
    p.subcounty,
    p.town,
    p.area
  from public.pharmacies as p
  order by p.name asc;
$$;

grant execute on function public.public_patient_portal_pharmacies() to anon, authenticated;

-- Recommended frontend fallback if Option A is not enough:
-- 1. Keep the portal on the POS Supabase client.
-- 2. Try .from("pharmacies") first.
-- 3. If that is blocked, fall back to rpc("public_patient_portal_pharmacies").
