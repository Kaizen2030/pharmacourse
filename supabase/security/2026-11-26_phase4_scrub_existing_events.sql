-- PHASE 4 CLEAN-UP of analytics events already stored. Run ONCE, after reviewing, in the SQL editor.
-- It does not delete page-view counts: it removes the private parts of each stored event.
--
-- Step 1 (read-only): see how much private data is stored. Run this first and look at the numbers.
select
  count(*) as events,
  count(*) filter (where metadata ? 'url' or metadata ? 'hash' or metadata ? 'search') as with_full_address,
  count(*) filter (where metadata::text ~* '(access_token|refresh_token|token_hash|type=recovery|code=)') as with_tokens,
  count(*) filter (where metadata -> 'geo' ? 'ip') as with_ip_address,
  count(*) filter (where metadata -> 'geo' ? 'latitude' or metadata -> 'geo' ? 'city') as with_precise_location,
  count(*) filter (where lower(coalesce(path, '')) ~ '^/(reset|activate|patient|pos|admin|dashboard|learn|certificate|verify)') as on_private_pages
from public.website_events;

-- Step 2: clean. Wrapped in a transaction; check the counts it reports, then COMMIT (or ROLLBACK to undo).
begin;

-- Events on private pages carry no value worth the risk: remove them.
delete from public.website_events
 where lower(coalesce(path, '')) ~ '^/(reset|activate|patient|pos|admin|dashboard|learn|certificate|verify|complete-profile|forgot-password|reset-password)(/|$)';

-- Everything else: keep the page view, drop full addresses, tokens, IP addresses and precise location.
update public.website_events
   set path = split_part(split_part(coalesce(path, '/'), '#', 1), '?', 1),
       referrer = substring(coalesce(referrer, '') from '^(https?://[A-Za-z0-9.-]+(:[0-9]+)?)'),
       metadata = jsonb_strip_nulls(jsonb_build_object(
         'route_group', metadata ->> 'route_group',
         'geo', jsonb_strip_nulls(jsonb_build_object(
           'country_code', metadata -> 'geo' ->> 'country_code',
           'country', metadata -> 'geo' ->> 'country',
           'country_hint', metadata -> 'geo' ->> 'country_hint',
           'time_zone', coalesce(metadata -> 'geo' ->> 'time_zone', metadata -> 'geo' ->> 'timezone'),
           'locale', metadata -> 'geo' ->> 'locale',
           'language', metadata -> 'geo' ->> 'language',
           'source', 'browser'))));

-- Should now be zero in every private column.
select
  count(*) filter (where metadata ? 'url' or metadata ? 'hash' or metadata ? 'search') as with_full_address,
  count(*) filter (where metadata::text ~* '(access_token|refresh_token|token_hash)') as with_tokens,
  count(*) filter (where metadata -> 'geo' ? 'ip') as with_ip_address
from public.website_events;

-- If the numbers look right:  commit;
-- To undo everything above:   rollback;
