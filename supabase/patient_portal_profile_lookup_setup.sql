create or replace function public.public_patient_portal_profile(
  target_pharmacy_id uuid,
  target_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  account_phone text := public.current_patient_portal_phone();
  matched_patient record;
begin
  if auth.uid() is null then
    raise exception 'Please sign in to access your patient profile.';
  end if;

  if account_phone is null then
    raise exception 'Your patient account does not have a linked phone number.';
  end if;

  select
    patients.id,
    patients.full_name,
    patients.phone,
    patients.chronic_conditions
  into matched_patient
  from public.patients as patients
  where patients.pharmacy_id = target_pharmacy_id
    and patients.phone = account_phone
  limit 1;

  return jsonb_build_object(
    'exists', matched_patient.id is not null,
    'patient',
    case
      when matched_patient.id is null then null
      else jsonb_build_object(
        'id', matched_patient.id,
        'full_name', matched_patient.full_name,
        'phone', matched_patient.phone,
        'chronic_conditions', matched_patient.chronic_conditions
      )
    end
  );
end;
$$;

revoke all on function public.public_patient_portal_profile(uuid, text) from public;
grant execute on function public.public_patient_portal_profile(uuid, text) to authenticated;
