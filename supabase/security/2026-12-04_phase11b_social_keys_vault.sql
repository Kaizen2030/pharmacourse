-- PHASE 11b: paste the auto-posting key in Admin (Blog & site > Social); stored encrypted in Supabase Vault. Re-runnable.
-- Pharmacourse project. Needs Phase 2 and Phase 11. Rollback: rollback-emergency-only/2026-12-04_phase11b_social_keys_vault_rollback.sql
--
-- * A super admin pastes the Ayrshare API key, or a Make.com / Zapier / n8n webhook link, and clicks Save.
-- * Values go into vault.secrets (encrypted). The admin page only ever sees "Saved ••••abcd".
--   Only the social-publish Edge Function (server key) can read them, via get_social_config().
-- * Scheduled posts: a token is generated and, where pg_cron and pg_net are available (they are on Supabase),
--   a job checks every 10 minutes for posts that are due. Nothing to set up by hand.

begin;

do $v$ begin
  if exists (select 1 from pg_available_extensions where name = 'supabase_vault') then
    create extension if not exists supabase_vault with schema vault;
  end if;
end $v$;

create table if not exists public.social_secret_status (
  name text primary key check (name in ('ayrshare_api_key', 'webhook_url', 'webhook_secret', 'cron_token')),
  hint text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.social_secret_status enable row level security;
revoke all on public.social_secret_status from anon, authenticated;
grant select on public.social_secret_status to authenticated;
drop policy if exists "Admins see which social keys are saved" on public.social_secret_status;
create policy "Admins see which social keys are saved" on public.social_secret_status for select to authenticated using (public.is_admin());

create or replace function public.social_vault_put(p_name text, p_value text)
returns void language plpgsql security definer set search_path = public, vault as $$
declare v_id uuid;
begin
  select id into v_id from vault.secrets where name = p_name;
  if v_id is null then perform vault.create_secret(p_value, p_name, 'Pharmacourse social posting key');
  else perform vault.update_secret(v_id, p_value); end if;
end $$;
revoke all on function public.social_vault_put(text, text) from public, anon, authenticated;

-- Save (super admin only). Blank values are ignored, so one value can be changed at a time.
create or replace function public.admin_set_social_keys(p_values jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare k text; v text; v_saved text[] := '{}';
begin
  if not public.is_super_admin() then raise exception 'Only a super admin can save the auto-posting key.'; end if;
  if jsonb_typeof(p_values) <> 'object' then raise exception 'Bad request.'; end if;
  for k, v in select key, btrim(value) from jsonb_each_text(p_values) loop
    continue when v is null or v = '';
    if k not in ('ayrshare_api_key', 'webhook_url', 'webhook_secret') then raise exception 'Unknown key: %', k; end if;
    if length(v) > 1000 then raise exception 'That value is too long.'; end if;
    if v ~ '\s' then raise exception 'Remove the spaces from the pasted value.'; end if;
    if k = 'ayrshare_api_key' and length(v) < 16 then raise exception 'That does not look like an Ayrshare API key. Copy it from Ayrshare > API Key.'; end if;
    if k = 'webhook_url' and v !~ '^https://[A-Za-z0-9.-]+\.[A-Za-z]{2,}(/|$)' then raise exception 'The webhook link must start with https://'; end if;
    if k = 'webhook_secret' and length(v) < 8 then raise exception 'Use at least 8 characters for the webhook secret.'; end if;
    perform public.social_vault_put('sc_' || k, v);
    insert into public.social_secret_status (name, hint, updated_at, updated_by)
    values (k, case when k = 'webhook_url' then substring(v from '^https://([^/]+)') || '/••••' || right(v, 4) else '••••' || right(v, 4) end, now(), auth.uid())
    on conflict (name) do update set hint = excluded.hint, updated_at = now(), updated_by = auth.uid();
    v_saved := v_saved || k;
  end loop;
  -- A webhook gets a signing secret automatically if none was pasted.
  if 'webhook_url' = any (v_saved) and not exists (select 1 from public.social_secret_status where name = 'webhook_secret') then
    perform public.social_vault_put('sc_webhook_secret', replace(gen_random_uuid()::text, '-', ''));
    insert into public.social_secret_status (name, hint, updated_by) values ('webhook_secret', 'generated', auth.uid());
  end if;
  insert into public.admin_audit_log (actor_id, actor_email, action, new_value)
  values (auth.uid(), (select email from public.user_profiles where id = auth.uid()), 'social_keys.save', jsonb_build_object('keys', v_saved));
  return jsonb_build_object('saved', v_saved);
end $$;
revoke all on function public.admin_set_social_keys(jsonb) from public, anon;
grant execute on function public.admin_set_social_keys(jsonb) to authenticated;

-- Remove: 'ayrshare' removes the Ayrshare key; 'webhook' removes the webhook link and its secret.
create or replace function public.admin_clear_social_keys(p_which text)
returns void language plpgsql security definer set search_path = public, vault as $$
declare v_names text[];
begin
  if not public.is_super_admin() then raise exception 'Only a super admin can remove the auto-posting key.'; end if;
  v_names := case p_which when 'ayrshare' then array['ayrshare_api_key'] when 'webhook' then array['webhook_url', 'webhook_secret'] end;
  if v_names is null then raise exception 'Unknown service.'; end if;
  delete from vault.secrets where name = any (select 'sc_' || n from unnest(v_names) n);
  delete from public.social_secret_status where name = any (v_names);
  insert into public.admin_audit_log (actor_id, actor_email, action, new_value)
  values (auth.uid(), (select email from public.user_profiles where id = auth.uid()), 'social_keys.clear', jsonb_build_object('service', p_which));
end $$;
revoke all on function public.admin_clear_social_keys(text) from public, anon;
grant execute on function public.admin_clear_social_keys(text) to authenticated;

-- For the social-publish Edge Function only (server key). Not callable from the website.
create or replace function public.get_social_config()
returns jsonb language plpgsql stable security definer set search_path = public, vault as $$
begin
  if not public.request_is_trusted_backend() then raise exception 'Not allowed.'; end if;
  return coalesce((select jsonb_object_agg(substr(name, 4), decrypted_secret)
                     from vault.decrypted_secrets where name like 'sc\_%' escape '\'), '{}'::jsonb);
end $$;
revoke all on function public.get_social_config() from public, anon, authenticated;
grant execute on function public.get_social_config() to service_role;

-- Scheduler token (created once).
do $t$ begin
  if not exists (select 1 from public.social_secret_status where name = 'cron_token') then
    perform public.social_vault_put('sc_cron_token', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''));
    insert into public.social_secret_status (name, hint) values ('cron_token', 'generated');
  end if;
end $t$;

commit;

-- Scheduled posts: every 10 minutes, only calls the server when a post is due. Best effort, outside the transaction
-- above so that a missing extension never undoes the key setup.
do $c$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron')
     or not exists (select 1 from pg_available_extensions where name = 'pg_net') then
    raise notice 'pg_cron or pg_net is not available: scheduled posts will not run by themselves (Publish now still works).';
    return;
  end if;
  create extension if not exists pg_cron;
  create extension if not exists pg_net;
  perform cron.unschedule(jobid) from cron.job where jobname = 'pharmacourse-social-posts';
  perform cron.schedule('pharmacourse-social-posts', '*/10 * * * *', $job$
    select net.http_post(
      url := 'https://nnjiutikutsjvggakvvv.supabase.co/functions/v1/social-publish',
      headers := jsonb_build_object('Content-Type', 'application/json',
                   'x-cron-token', (select decrypted_secret from vault.decrypted_secrets where name = 'sc_cron_token')),
      body := '{"action":"run-scheduled"}'::jsonb)
    where exists (select 1 from public.social_posts where status = 'scheduled' and scheduled_for <= now());
  $job$);
exception when others then
  raise notice 'Could not switch on the scheduler (%). Publish now still works.', sqlerrm;
end $c$;
