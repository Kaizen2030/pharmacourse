-- PHASE 10c: paste payment provider keys in Admin; store them encrypted in Supabase Vault. Re-runnable.
-- Pharmacourse project. Needs Phase 2, 9 (require_admin) and 10. Rollback: 2026-12-03_phase10c_payment_keys_vault_rollback.sql
--
-- * Super admins save keys from Admin > Learning > Payments > Payment methods (M-Pesa prompt, Paystack).
-- * Values go into vault.secrets (encrypted at rest). Nobody using the website can read them back: the admin page only
--   ever sees "saved, ends in 1234". Only the payment Edge Functions (server key) can read them, via
--   get_payment_config(), which is not callable by anon, learners, tutors or admins.
-- * The M-Pesa callback token is generated automatically.

begin;

-- Vault is built into Supabase; this only makes sure it is switched on (skipped where it is not available).
do $v$ begin
  if exists (select 1 from pg_available_extensions where name = 'supabase_vault') then
    create extension if not exists supabase_vault with schema vault;
  end if;
end $v$;

-- What is saved (never the value).
create table if not exists public.payment_secret_status (
  provider text not null check (provider in ('mpesa_stk', 'paystack')),
  name text not null,
  hint text,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (provider, name)
);
alter table public.payment_secret_status enable row level security;
revoke all on public.payment_secret_status from anon, authenticated;
grant select on public.payment_secret_status to authenticated;
drop policy if exists "Admins see which payment keys are saved" on public.payment_secret_status;
create policy "Admins see which payment keys are saved" on public.payment_secret_status for select to authenticated using (public.is_admin());

create or replace function public.payment_secret_names(p_provider text)
returns text[] language sql immutable as $$
  select case p_provider
    when 'mpesa_stk' then array['env', 'consumer_key', 'consumer_secret', 'shortcode', 'passkey', 'transaction_type', 'callback_token']
    when 'paystack' then array['secret_key']
    else array[]::text[] end;
$$;

create or replace function public.vault_put(p_name text, p_value text)
returns void language plpgsql security definer set search_path = public, vault as $$
declare v_id uuid;
begin
  select id into v_id from vault.secrets where name = p_name;
  if v_id is null then perform vault.create_secret(p_value, p_name, 'Pharmacourse payment key');
  else perform vault.update_secret(v_id, p_value); end if;
end $$;
revoke all on function public.vault_put(text, text) from public, anon, authenticated;

-- Save keys (super admin only). Blank values are ignored, so you can update one key at a time.
create or replace function public.admin_set_payment_keys(p_provider text, p_values jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare k text; v text; v_saved text[] := '{}';
begin
  if not public.is_super_admin() then raise exception 'Only a super admin can save payment keys.'; end if;
  if p_provider not in ('mpesa_stk', 'paystack') then raise exception 'Unknown payment method.'; end if;
  if jsonb_typeof(p_values) <> 'object' then raise exception 'Bad request.'; end if;
  for k, v in select key, btrim(value) from jsonb_each_text(p_values) loop
    continue when v is null or v = '';
    if not (k = any (public.payment_secret_names(p_provider))) or k = 'callback_token' then raise exception 'Unknown key: %', k; end if;
    if length(v) > 500 then raise exception 'That value is too long.'; end if;
    if k = 'env' and v not in ('sandbox', 'production') then raise exception 'Environment must be sandbox or production.'; end if;
    if k = 'transaction_type' and v not in ('CustomerPayBillOnline', 'CustomerBuyGoodsOnline') then raise exception 'Choose Paybill or Till.'; end if;
    if k = 'shortcode' and v !~ '^\d{5,7}$' then raise exception 'The shortcode is your 5 to 7 digit Paybill or Till number.'; end if;
    if k = 'secret_key' and v !~ '^sk_(test|live)_[A-Za-z0-9]+$' then raise exception 'A Paystack secret key starts with sk_test_ or sk_live_.'; end if;
    perform public.vault_put('pc_' || p_provider || '_' || k, v);
    insert into public.payment_secret_status (provider, name, hint, updated_at, updated_by)
    values (p_provider, k, case when k in ('env', 'transaction_type', 'shortcode') then v else '••••' || right(v, 4) end, now(), auth.uid())
    on conflict (provider, name) do update set hint = excluded.hint, updated_at = now(), updated_by = auth.uid();
    v_saved := v_saved || k;
  end loop;
  -- M-Pesa: create the callback token once, automatically.
  if p_provider = 'mpesa_stk' and not exists (select 1 from public.payment_secret_status where provider = 'mpesa_stk' and name = 'callback_token') then
    perform public.vault_put('pc_mpesa_stk_callback_token', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''));
    insert into public.payment_secret_status (provider, name, hint, updated_by) values ('mpesa_stk', 'callback_token', 'generated', auth.uid());
  end if;
  insert into public.admin_audit_log (actor_id, actor_email, action, target_user_id, old_value, new_value)
  values (auth.uid(), (select email from public.user_profiles where id = auth.uid()), 'payment_keys.save', null, null,
          jsonb_build_object('provider', p_provider, 'keys', v_saved));
  return jsonb_build_object('saved', v_saved);
end $$;
revoke all on function public.admin_set_payment_keys(text, jsonb) from public, anon;
grant execute on function public.admin_set_payment_keys(text, jsonb) to authenticated;

create or replace function public.admin_clear_payment_keys(p_provider text)
returns void language plpgsql security definer set search_path = public, vault as $$
begin
  if not public.is_super_admin() then raise exception 'Only a super admin can remove payment keys.'; end if;
  delete from vault.secrets where name like 'pc_' || p_provider || '_%';
  delete from public.payment_secret_status where provider = p_provider;
  update public.payment_providers set enabled = false, updated_at = now() where key = p_provider;
  insert into public.admin_audit_log (actor_id, actor_email, action, new_value)
  values (auth.uid(), (select email from public.user_profiles where id = auth.uid()), 'payment_keys.clear', jsonb_build_object('provider', p_provider));
end $$;
revoke all on function public.admin_clear_payment_keys(text) from public, anon;
grant execute on function public.admin_clear_payment_keys(text) to authenticated;

-- For the payment Edge Functions only (server key). Not callable from the website.
create or replace function public.get_payment_config(p_provider text)
returns jsonb language plpgsql stable security definer set search_path = public, vault as $$
begin
  if not public.request_is_trusted_backend() then raise exception 'Not allowed.'; end if;
  return coalesce((select jsonb_object_agg(substr(name, length('pc_' || p_provider || '_') + 1), decrypted_secret)
                     from vault.decrypted_secrets where name like 'pc_' || p_provider || '\_%' escape '\'), '{}'::jsonb);
end $$;
revoke all on function public.get_payment_config(text) from public, anon, authenticated;
grant execute on function public.get_payment_config(text) to service_role;

commit;
