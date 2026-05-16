create or replace function public.public_patient_portal_pharmacies()
returns table (
  id uuid,
  name text,
  location text,
  parent_pharmacy_id uuid
)
language sql
security definer
set search_path = public
as $$
  select
    pharmacies.id,
    pharmacies.name,
    pharmacies.location,
    pharmacies.parent_pharmacy_id
  from public.pharmacies as pharmacies
  order by
    case when pharmacies.parent_pharmacy_id is null then 0 else 1 end,
    coalesce(pharmacies.parent_pharmacy_id, pharmacies.id),
    pharmacies.name;
$$;

revoke all on function public.public_patient_portal_pharmacies() from public;
grant execute on function public.public_patient_portal_pharmacies() to anon;
grant execute on function public.public_patient_portal_pharmacies() to authenticated;
