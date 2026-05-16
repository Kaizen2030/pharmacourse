create or replace function public.public_patient_portal_updates(
  target_pharmacy_id uuid,
  target_phone text
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with normalized as (
    select nullif(trim(target_phone), '') as phone
  )
  select jsonb_build_object(
    'requests',
    coalesce((
      select jsonb_agg(row_to_json(request_rows))
      from (
        select
          id,
          drug_requested,
          condition_notes,
          status,
          created_at
        from public.prescription_requests, normalized
        where pharmacy_id = target_pharmacy_id
          and patient_phone = normalized.phone
        order by created_at desc
        limit 10
      ) as request_rows
    ), '[]'::jsonb),
    'appointments',
    coalesce((
      select jsonb_agg(row_to_json(appointment_rows))
      from (
        select
          id,
          appointment_type,
          slot_datetime,
          condition_summary,
          patient_notes,
          status,
          created_at
        from public.appointments, normalized
        where pharmacy_id = target_pharmacy_id
          and patient_phone = normalized.phone
        order by created_at desc
        limit 10
      ) as appointment_rows
    ), '[]'::jsonb),
    'deliveries',
    coalesce((
      select jsonb_agg(row_to_json(delivery_rows))
      from (
        select
          id,
          patient_address,
          items,
          status,
          created_at
        from public.deliveries, normalized
        where pharmacy_id = target_pharmacy_id
          and patient_phone = normalized.phone
        order by created_at desc
        limit 10
      ) as delivery_rows
    ), '[]'::jsonb),
    'notifications',
    coalesce((
      select jsonb_agg(row_to_json(notification_rows))
      from (
        select
          id,
          type,
          message,
          read,
          created_at
        from public.patient_notifications, normalized
        where pharmacy_id = target_pharmacy_id
          and patient_phone = normalized.phone
        order by created_at desc
        limit 12
      ) as notification_rows
    ), '[]'::jsonb)
  )
  from normalized;
$$;

revoke all on function public.public_patient_portal_updates(uuid, text) from public;
grant execute on function public.public_patient_portal_updates(uuid, text) to anon;
grant execute on function public.public_patient_portal_updates(uuid, text) to authenticated;
