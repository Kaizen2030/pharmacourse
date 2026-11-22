-- ROLLBACK for 2026-11-29_phase10_payments.sql
-- Removes the payment functions. The payments, coupons and payment_providers tables are KEPT (they hold money
-- records); drop them by hand only if you are sure:  drop table public.coupon_redemptions, public.payments, public.coupons, public.payment_providers;

begin;
drop function if exists public.expire_stale_payments();
drop function if exists public.admin_payments_summary(integer);
drop function if exists public.admin_list_payments(text, text, text, integer, integer);
drop function if exists public.admin_payment_action(uuid, text, text);
drop function if exists public.submit_payment_reference(uuid, text);
drop function if exists public.start_payment(uuid, text, text, text);
drop function if exists public.fail_payment(uuid, text, jsonb, text);
drop function if exists public.confirm_payment(uuid, text, numeric, jsonb);
drop function if exists public.settle_payment(uuid, text, numeric, jsonb);
drop function if exists public.quote_price(uuid, text);
drop function if exists public.price_for_course(uuid, text, uuid);
-- Learners lose direct read access; admins keep theirs through the table policies.
revoke select on public.payments from authenticated;
commit;
