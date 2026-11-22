-- ROLLBACK for 2026-12-04_phase11b_social_keys_vault.sql. Safe to run even if phase 11b was never applied.
-- Removes the saved auto-posting keys and the scheduler job. Posts are kept. (Edge Function secrets keep working.)
do $c$ begin
  if to_regclass('cron.job') is not null then
    perform cron.unschedule(jobid) from cron.job where jobname = 'pharmacourse-social-posts';
  end if;
exception when others then null;
end $c$;

begin;
do $$ begin
  if to_regclass('vault.secrets') is not null then delete from vault.secrets where name like 'sc\_%' escape '\'; end if;
end $$;
drop function if exists public.get_social_config();
drop function if exists public.admin_clear_social_keys(text);
drop function if exists public.admin_set_social_keys(jsonb);
drop function if exists public.social_vault_put(text, text);
drop table if exists public.social_secret_status;
commit;
