-- ROLLBACK for 2026-12-03_phase10c_payment_keys_vault.sql
-- Removes the save/read functions and the saved payment keys from Vault. Payment methods that relied on them are
-- switched off. (Keys set as Edge Function secrets keep working.)
begin;
update public.payment_providers set enabled = false where key in ('mpesa_stk', 'paystack')
  and exists (select 1 from public.payment_secret_status s where s.provider = payment_providers.key);
do $$ begin
  if to_regclass('vault.secrets') is not null then delete from vault.secrets where name like 'pc\_%' escape '\'; end if;
end $$;
drop function if exists public.get_payment_config(text);
drop function if exists public.admin_clear_payment_keys(text);
drop function if exists public.admin_set_payment_keys(text, jsonb);
drop function if exists public.vault_put(text, text);
drop function if exists public.payment_secret_names(text);
drop table if exists public.payment_secret_status;
commit;
