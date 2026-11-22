-- ROLLBACK for 2026-12-01_phase10b_payment_details.sql: removes the structured details column.
-- The generated "instructions" text stays, so manual methods keep working.
begin;
alter table public.payment_providers drop constraint if exists payment_providers_details_object;
alter table public.payment_providers drop column if exists details;
commit;
