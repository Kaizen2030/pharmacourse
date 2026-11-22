-- PHASE 10b: structured payment-method details (Paybill/Till number, bank account, WhatsApp number).
-- Pharmacourse project. Re-runnable. Needs Phase 10. Rollback: 2026-12-01_phase10b_payment_details_rollback.sql
--
-- Admin > Learning > Payments > Payment methods now uses guided forms. The details are public payment information
-- (what a learner needs to pay you), so learners can read them for enabled methods; only admins can change them.
-- Provider secrets (Daraja, Paystack) are NOT stored here; they stay in Edge Function secrets.

begin;
alter table public.payment_providers add column if not exists details jsonb not null default '{}'::jsonb;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'payment_providers_details_object') then
    alter table public.payment_providers add constraint payment_providers_details_object
      check (jsonb_typeof(details) = 'object' and pg_column_size(details) < 4000);
  end if;
end $$;
commit;
