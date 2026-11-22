-- ROLLBACK for 2026-11-26_phase4_analytics_privacy.sql: restores record_website_event as it was on 2026-11-23.
-- Warning: the database will again store whatever the browser sends (full URLs with tokens, IP addresses).

-- The live function has parameter defaults, which create or replace cannot change: replace it in one transaction.
begin;
drop function if exists public.record_website_event(text, text, text, text, text, text, integer, integer, jsonb);
create function public.record_website_event(
  event_name text, path text default null, title text default null, referrer text default null, session_id text default null,
  device_category text default null, viewport_width integer default null, viewport_height integer default null,
  metadata jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  inserted_id bigint;
  normalized_event_name text := nullif(btrim(event_name), '');
begin
  if normalized_event_name is null then return null; end if;
  insert into public.website_events (event_name, path, title, referrer, session_id, user_id, user_role,
                                     device_category, viewport_width, viewport_height, metadata)
  values (normalized_event_name, nullif(btrim(path), ''), nullif(btrim(title), ''), nullif(btrim(referrer), ''),
          nullif(btrim(session_id), ''), auth.uid(),
          case when auth.uid() is not null and public.is_admin() then 'admin' when auth.uid() is not null then 'authenticated' else 'visitor' end,
          nullif(btrim(device_category), ''), viewport_width, viewport_height, coalesce(metadata, '{}'::jsonb))
  returning id into inserted_id;
  return inserted_id;
end; $$;
grant execute on function public.record_website_event(text, text, text, text, text, text, integer, integer, jsonb) to anon, authenticated;
commit;

-- Kept (harmless): website_event_throttle, website_event_allowed(). To remove them too:
--   drop function if exists public.website_event_allowed(text, integer);
--   drop table if exists public.website_event_throttle;
