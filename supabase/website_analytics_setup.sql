begin;

create table if not exists public.website_events (
  id bigint generated always as identity primary key,
  event_name text not null,
  path text,
  title text,
  referrer text,
  session_id text,
  user_id uuid,
  user_role text,
  device_category text,
  viewport_width integer,
  viewport_height integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists website_events_created_at_idx
  on public.website_events (created_at desc);

create index if not exists website_events_event_name_idx
  on public.website_events (event_name, created_at desc);

create index if not exists website_events_path_idx
  on public.website_events (path, created_at desc);

create index if not exists website_events_session_id_idx
  on public.website_events (session_id, created_at desc);

create or replace function public.record_website_event(
  event_name text,
  path text default null,
  title text default null,
  referrer text default null,
  session_id text default null,
  device_category text default null,
  viewport_width integer default null,
  viewport_height integer default null,
  metadata jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_id bigint;
  normalized_event_name text := nullif(btrim(event_name), '');
begin
  if normalized_event_name is null then
    return null;
  end if;

  insert into public.website_events (
    event_name,
    path,
    title,
    referrer,
    session_id,
    user_id,
    user_role,
    device_category,
    viewport_width,
    viewport_height,
    metadata
  )
  values (
    normalized_event_name,
    nullif(btrim(path), ''),
    nullif(btrim(title), ''),
    nullif(btrim(referrer), ''),
    nullif(btrim(session_id), ''),
    auth.uid(),
    case
      when auth.uid() is not null and public.is_admin() then 'admin'
      when auth.uid() is not null then 'authenticated'
      else 'visitor'
    end,
    nullif(btrim(device_category), ''),
    viewport_width,
    viewport_height,
    coalesce(metadata, '{}'::jsonb)
  )
  returning id into inserted_id;

  return inserted_id;
end;
$$;

revoke all on function public.record_website_event(text, text, text, text, text, text, integer, integer, jsonb) from public;
grant execute on function public.record_website_event(text, text, text, text, text, text, integer, integer, jsonb) to anon;
grant execute on function public.record_website_event(text, text, text, text, text, text, integer, integer, jsonb) to authenticated;

create or replace function public.get_analytics_schema_state()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'patient_portal_tables_ready',
    to_regclass('public.prescription_requests') is not null
    and to_regclass('public.appointments') is not null
    and to_regclass('public.deliveries') is not null
    and to_regclass('public.patient_notifications') is not null
  );
$$;

grant execute on function public.get_analytics_schema_state() to authenticated;

create or replace function public.get_website_events(days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  lookback_days integer := greatest(coalesce(days, 30), 1);
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  return (
    with recent_events as (
      select
        id,
        event_name,
        path,
        title,
        referrer,
        session_id,
        user_id,
        user_role,
        device_category,
        viewport_width,
        viewport_height,
        metadata,
        created_at
      from public.website_events
      where created_at >= now() - make_interval(days => lookback_days)
      order by created_at desc
      limit 5000
    )
    select jsonb_build_object(
      'events',
      coalesce(jsonb_agg(to_jsonb(recent_events)), '[]'::jsonb)
    )
    from recent_events
  );
end;
$$;

grant execute on function public.get_website_events(integer) to authenticated;

commit;
