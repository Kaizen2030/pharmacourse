-- PHASE 4: privacy-safe website analytics. Pharmacourse project. Re-runnable.
-- Rollback: 2026-11-26_phase4_analytics_privacy_rollback.sql
-- Cleaning events already stored: 2026-11-26_phase4_scrub_existing_events.sql (review it, then run it separately).
--
-- Problems (confirmed in the live snapshot and websiteAnalytics.js):
-- 1. Every event stored the full page address (metadata.url), its #hash and ?query. On password-reset and account
--    activation links those carry sign-in tokens, so the analytics table held usable login tokens.
-- 2. Each visitor's IP address, city and latitude/longitude (looked up through three outside services) were stored.
-- 3. record_website_event() accepted any event name, any path and any amount of data, from anyone, with no limit.
--
-- After this the database itself refuses to store those things, whatever a browser sends:
-- - only page_view / session_start events, for public pages only (never reset, activation, patient, POS, admin,
--   dashboard, lessons or certificates), path without query or hash
-- - referrer reduced to the site (https://www.google.com), metadata reduced to route group + country-level hints
-- - at most 60 events per browser session and 150 per network address every 10 minutes (the address is kept only as a
--   one-way hash, in a short-lived counter table, never with the events)

create table if not exists public.website_event_throttle (
  bucket text primary key,
  window_start timestamptz not null default now(),
  hits integer not null default 0
);
alter table public.website_event_throttle enable row level security;
revoke all on public.website_event_throttle from anon, authenticated;

-- Returns true while the bucket is under its limit for the current 10-minute window, and counts this hit.
create or replace function public.website_event_allowed(p_bucket text, p_limit integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_hits integer;
begin
  insert into public.website_event_throttle as t (bucket, window_start, hits) values (p_bucket, now(), 1)
  on conflict (bucket) do update set
    hits = case when t.window_start < now() - interval '10 minutes' then 1 else t.hits + 1 end,
    window_start = case when t.window_start < now() - interval '10 minutes' then now() else t.window_start end
  returning hits into v_hits;
  return v_hits <= p_limit;
end $$;
revoke all on function public.website_event_allowed(text, integer) from public, anon, authenticated;

-- The live function has parameter defaults, which create or replace cannot change: replace it in one transaction.
begin;
drop function if exists public.record_website_event(text, text, text, text, text, text, integer, integer, jsonb);
create function public.record_website_event(
  event_name text, path text default null, title text default null, referrer text default null, session_id text default null,
  device_category text default null, viewport_width integer default null, viewport_height integer default null,
  metadata jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_event text := lower(btrim(coalesce(event_name, '')));
  v_path text := btrim(coalesce(path, ''));
  v_session text := left(btrim(coalesce(session_id, '')), 64);
  v_headers jsonb;
  v_ip text;
  v_geo jsonb := coalesce(metadata -> 'geo', '{}'::jsonb);
  v_meta jsonb;
  v_id bigint;
begin
  if v_event not in ('page_view', 'session_start') then return null; end if;

  -- Path only: drop any ?query or #hash, then keep public pages only.
  v_path := split_part(split_part(v_path, '#', 1), '?', 1);
  if v_path !~ '^/[A-Za-z0-9/_.~-]{0,199}$' then return null; end if;
  if lower(v_path) ~ '^/(reset|activate|patient|pos|admin|dashboard|learn|certificate|verify|complete-profile|forgot-password|reset-password|tutor|whatsapp-settings|simulation)(/|$)' then
    return null;
  end if;

  -- Rate limits: per session, and per network address (hashed, never stored with events).
  if v_session = '' then return null; end if;
  if not public.website_event_allowed('s:' || v_session, 60) then return null; end if;
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then v_headers := null;
  end;
  v_ip := btrim(split_part(coalesce(v_headers ->> 'cf-connecting-ip', v_headers ->> 'x-real-ip', v_headers ->> 'x-forwarded-for', ''), ',', 1));
  if v_ip <> '' and not public.website_event_allowed('a:' || encode(sha256(convert_to(v_ip, 'UTF8')), 'hex'), 150) then
    return null;
  end if;

  -- Keep only route group and country-level hints; everything else in the request is dropped.
  v_meta := jsonb_strip_nulls(jsonb_build_object(
    'route_group', left(nullif(btrim(metadata ->> 'route_group'), ''), 30),
    'geo', jsonb_strip_nulls(jsonb_build_object(
      'country_code', case when upper(coalesce(v_geo ->> 'country_code', '')) ~ '^[A-Z]{2}$' then upper(v_geo ->> 'country_code') end,
      'country', left(nullif(btrim(v_geo ->> 'country'), ''), 60),
      'country_hint', case when upper(coalesce(v_geo ->> 'country_hint', '')) ~ '^[A-Z]{2}$' then upper(v_geo ->> 'country_hint') end,
      'time_zone', case when coalesce(v_geo ->> 'time_zone', '') ~ '^[A-Za-z_]+(/[A-Za-z0-9_+-]+){0,2}$' then left(v_geo ->> 'time_zone', 60) end,
      'locale', case when coalesce(v_geo ->> 'locale', '') ~ '^[A-Za-z]{2,3}([_-][A-Za-z0-9]{2,8}){0,2}$' then left(v_geo ->> 'locale', 20) end,
      'language', case when coalesce(v_geo ->> 'language', '') ~ '^[a-z]{2,3}$' then v_geo ->> 'language' end,
      'source', 'browser'))));

  insert into public.website_events (event_name, path, title, referrer, session_id, user_id, user_role,
                                     device_category, viewport_width, viewport_height, metadata)
  values (
    v_event,
    v_path,
    left(nullif(btrim(title), ''), 160),
    substring(coalesce(referrer, '') from '^(https?://[A-Za-z0-9.-]+(:[0-9]+)?)'),
    v_session,
    auth.uid(),
    case when auth.uid() is not null and public.is_admin() then 'admin' when auth.uid() is not null then 'authenticated' else 'visitor' end,
    case when device_category in ('mobile', 'tablet', 'desktop') then device_category else 'unknown' end,
    case when viewport_width between 1 and 10000 then viewport_width end,
    case when viewport_height between 1 and 10000 then viewport_height end,
    v_meta)
  returning id into v_id;

  if random() < 0.02 then
    delete from public.website_event_throttle where window_start < now() - interval '1 hour';
  end if;
  return v_id;
end $$;
revoke all on function public.record_website_event(text, text, text, text, text, text, integer, integer, jsonb) from public;
grant execute on function public.record_website_event(text, text, text, text, text, text, integer, integer, jsonb) to anon, authenticated;
commit;
