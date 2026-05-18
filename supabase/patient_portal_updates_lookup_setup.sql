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

revoke all on function public.current_patient_portal_phone() from public;
grant execute on function public.current_patient_portal_phone() to authenticated;

create or replace function public.public_patient_portal_updates(
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
begin
  if auth.uid() is null then
    raise exception 'Please sign in to access patient updates.';
  end if;

  if account_phone is null then
    raise exception 'Your patient account does not have a linked phone number.';
  end if;

  return (
    with normalized as (
      select account_phone as phone
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
            created_at,
            fulfillment_drug_name,
            fulfillment_items,
            fulfillment_qty,
            receipt_total_kes,
            receipt_number,
            dispensed_at,
            pharmacist_notes,
            patient_fulfillment_choice,
            (
              select deliveries.status
              from public.deliveries
              where deliveries.prescription_request_id = prescription_requests.id
              order by deliveries.created_at desc
              limit 1
            ) as linked_delivery_status
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
            pharmacist_response,
            video_link,
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
            patient_name,
            patient_address,
            items,
            total_kes,
            delivery_partner_type,
            rider_name,
            rider_phone,
            estimated_delivery_minutes,
            status,
            created_at,
            delivered_at
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
    from normalized
  );
end;
$$;

revoke all on function public.public_patient_portal_updates(uuid, text) from public;
grant execute on function public.public_patient_portal_updates(uuid, text) to authenticated;

drop function if exists public.public_patient_portal_updates_by_phone(text);

create function public.public_patient_portal_updates_by_phone(target_phone text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  account_phone text := public.current_patient_portal_phone();
begin
  if auth.uid() is null then
    raise exception 'Please sign in to access patient updates.';
  end if;

  if account_phone is null then
    raise exception 'Your patient account does not have a linked phone number.';
  end if;

  return (
    with normalized as (
      select account_phone as phone
    ),
    active_pharmacies as (
      select distinct pharmacy_id
      from (
        select pharmacy_id from public.prescription_requests, normalized where patient_phone = normalized.phone
        union
        select pharmacy_id from public.appointments, normalized where patient_phone = normalized.phone
        union
        select pharmacy_id from public.deliveries, normalized where patient_phone = normalized.phone
        union
        select pharmacy_id from public.patient_notifications, normalized where patient_phone = normalized.phone
      ) all_rows
      where pharmacy_id is not null
    ),
    grouped as (
      select
        pharmacies.id as pharmacy_id,
        pharmacies.name as pharmacy_name,
        pharmacies.location as pharmacy_location,
        greatest(
          coalesce((select max(created_at) from public.prescription_requests, normalized where pharmacy_id = pharmacies.id and patient_phone = normalized.phone), '-infinity'::timestamptz),
          coalesce((select max(created_at) from public.appointments, normalized where pharmacy_id = pharmacies.id and patient_phone = normalized.phone), '-infinity'::timestamptz),
          coalesce((select max(created_at) from public.deliveries, normalized where pharmacy_id = pharmacies.id and patient_phone = normalized.phone), '-infinity'::timestamptz),
          coalesce((select max(created_at) from public.patient_notifications, normalized where pharmacy_id = pharmacies.id and patient_phone = normalized.phone), '-infinity'::timestamptz)
        ) as last_activity_at,
        coalesce((
          select jsonb_agg(row_to_json(request_rows))
          from (
            select id, drug_requested, condition_notes, status, created_at, fulfillment_drug_name, fulfillment_items, fulfillment_qty, receipt_total_kes, receipt_number, dispensed_at
            from public.prescription_requests, normalized
            where pharmacy_id = pharmacies.id and patient_phone = normalized.phone
            order by created_at desc
            limit 10
          ) request_rows
        ), '[]'::jsonb) as requests,
        coalesce((
          select jsonb_agg(row_to_json(appointment_rows))
          from (
            select id, appointment_type, slot_datetime, condition_summary, patient_notes, status, created_at
            from public.appointments, normalized
            where pharmacy_id = pharmacies.id and patient_phone = normalized.phone
            order by created_at desc
            limit 10
          ) appointment_rows
        ), '[]'::jsonb) as appointments,
        coalesce((
          select jsonb_agg(row_to_json(delivery_rows))
          from (
            select id, patient_address, items, total_kes, status, created_at, delivered_at
            from public.deliveries, normalized
            where pharmacy_id = pharmacies.id and patient_phone = normalized.phone
            order by created_at desc
            limit 10
          ) delivery_rows
        ), '[]'::jsonb) as deliveries,
        coalesce((
          select jsonb_agg(row_to_json(notification_rows))
          from (
            select id, type, message, read, created_at
            from public.patient_notifications, normalized
            where pharmacy_id = pharmacies.id and patient_phone = normalized.phone
            order by created_at desc
            limit 12
          ) notification_rows
        ), '[]'::jsonb) as notifications
      from active_pharmacies
      join public.pharmacies on pharmacies.id = active_pharmacies.pharmacy_id
    )
    select jsonb_build_object(
      'matches',
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'pharmacy_id', pharmacy_id,
            'pharmacy_name', pharmacy_name,
            'pharmacy_location', pharmacy_location,
            'last_activity_at', last_activity_at,
            'requests', requests,
            'appointments', appointments,
            'deliveries', deliveries,
            'notifications', notifications
          )
          order by last_activity_at desc
        )
        from grouped
      ), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.public_patient_portal_updates_by_phone(text) from public;
grant execute on function public.public_patient_portal_updates_by_phone(text) to authenticated;
