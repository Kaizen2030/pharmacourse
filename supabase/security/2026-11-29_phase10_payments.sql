-- PHASE 10: payment layer (provider-agnostic), coupons, receipts. Pharmacourse project. Re-runnable.
-- Rollback: 2026-11-29_phase10_payments_rollback.sql      Needs Phase 2 and Phase 9 first.
--
-- How money flows
-- 1. The learner picks a method. start_payment() creates a 'pending' payment with the price computed HERE
--    (course price minus a valid coupon). The browser never sends an amount.
-- 2a. Automatic methods (M-Pesa STK, Paystack): an Edge Function asks the provider to charge that amount, then,
--     after verifying the provider's callback (signature or status query), calls confirm_payment() with the server
--     key. Only the server key or an admin can confirm.
-- 2b. Manual methods (M-Pesa paybill/till code, bank transfer, WhatsApp): the learner submits the reference with
--     submit_payment_reference(); an admin confirms it in Admin > Learning > Payments.
-- 3. confirm_payment() is idempotent: a callback that arrives twice cannot enrol twice or count revenue twice.
--    It marks the payment paid, issues a receipt number, enrols the learner and records the coupon use.
-- 4. A 100% coupon enrols straight away (provider 'coupon').

begin;

-- 1. Payment methods (no secrets here: provider keys live in Edge Function secrets) -----------------------------
create table if not exists public.payment_providers (
  key text primary key check (key in ('mpesa_stk', 'paystack', 'mpesa_manual', 'bank_transfer', 'whatsapp')),
  label text not null,
  description text,
  instructions text,
  enabled boolean not null default false,
  automatic boolean not null default false,
  display_order integer not null default 100,
  updated_at timestamptz not null default now()
);
insert into public.payment_providers (key, label, description, instructions, enabled, automatic, display_order) values
  ('mpesa_stk', 'M-Pesa', 'Get a payment prompt on your phone and enter your M-Pesa PIN.', null, false, true, 1),
  ('paystack', 'Card or other methods', 'Pay by Visa, Mastercard or other options through Paystack.', null, false, true, 2),
  ('mpesa_manual', 'M-Pesa Paybill / Till', 'Pay to our Paybill or Till, then enter the M-Pesa code.', 'Paybill: (set in admin)  Account: your email', false, false, 3),
  ('bank_transfer', 'Bank transfer', 'For employers and pharmacies. Pay by bank, then enter the reference.', 'Bank: (set in admin)', false, false, 4),
  ('whatsapp', 'Pay via WhatsApp', 'Message us on WhatsApp and we will help you pay and activate access.', null, true, false, 5)
on conflict (key) do nothing;

alter table public.payment_providers enable row level security;
revoke all on public.payment_providers from anon, authenticated;
grant select on public.payment_providers to anon, authenticated;
grant update on public.payment_providers to authenticated;
drop policy if exists "Anyone sees enabled payment methods" on public.payment_providers;
create policy "Anyone sees enabled payment methods" on public.payment_providers for select to anon, authenticated using (enabled or public.is_admin());
drop policy if exists "Admins manage payment methods" on public.payment_providers;
create policy "Admins manage payment methods" on public.payment_providers for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- 2. Coupons ------------------------------------------------------------------------------------------------------
create table if not exists public.coupons (
  code text primary key check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,40}$'),
  kind text not null check (kind in ('percent', 'fixed')),
  value numeric(12, 2) not null check (value > 0),
  course_id uuid references public.courses(id) on delete cascade,
  max_uses integer check (max_uses is null or max_uses > 0),
  used_count integer not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  note text,
  created_by uuid,
  created_at timestamptz not null default now(),
  check (kind <> 'percent' or value <= 100)
);
alter table public.coupons enable row level security;
revoke all on public.coupons from anon, authenticated;
grant select, insert, update, delete on public.coupons to authenticated;
drop policy if exists "Admins manage coupons" on public.coupons;
create policy "Admins manage coupons" on public.coupons for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 3. Payments -----------------------------------------------------------------------------------------------------
create sequence if not exists public.payment_receipt_seq;
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  course_id uuid not null references public.courses(id) on delete restrict,
  provider text not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded', 'expired', 'cancelled')),
  list_price_kes numeric(12, 2) not null,
  discount_kes numeric(12, 2) not null default 0,
  amount_kes numeric(12, 2) not null,
  currency text not null default 'KES',
  coupon_code text,
  phone text,
  provider_reference text,
  checkout_id text,
  receipt_no text unique,
  failure_reason text,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);
create unique index if not exists payments_provider_reference_uniq on public.payments (provider, upper(provider_reference)) where provider_reference is not null;
create index if not exists payments_user_idx on public.payments (user_id, created_at desc);
create index if not exists payments_status_idx on public.payments (status, created_at);
create index if not exists payments_checkout_idx on public.payments (checkout_id) where checkout_id is not null;

create table if not exists public.coupon_redemptions (
  coupon_code text not null,
  user_id uuid not null,
  payment_id uuid not null references public.payments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (coupon_code, user_id)
);
alter table public.coupon_redemptions enable row level security;
revoke all on public.coupon_redemptions from anon, authenticated;

alter table public.payments enable row level security;
revoke all on public.payments from anon, authenticated;
-- Learners read their own payments, without the provider's raw payload.
grant select (id, user_id, course_id, provider, status, list_price_kes, discount_kes, amount_kes, currency, coupon_code, phone,
              provider_reference, receipt_no, failure_reason, created_at, updated_at, paid_at) on public.payments to authenticated;
drop policy if exists "Learners read own payments" on public.payments;
create policy "Learners read own payments" on public.payments for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Phase 9 guard: also let these payment functions write enrolment payment fields.
create or replace function public.guard_enrollment_admin_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or public.request_is_trusted_backend()
     or coalesce(current_setting('app.course_progress_rpc', true), '') = 'on'
     or coalesce(current_setting('app.payment_rpc', true), '') = 'on' then
    new.updated_at := now();
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.payment_status := 'free';
    new.payment_method := null; new.payment_reference := null; new.amount_kes := null;
    new.access_expires_at := null; new.admin_note := null; new.granted_by := null; new.revoked_at := null;
    if coalesce(new.status, 'enrolled') not in ('enrolled') then new.status := 'enrolled'; end if;
  else
    if new.payment_status is distinct from old.payment_status or new.payment_method is distinct from old.payment_method
       or new.payment_reference is distinct from old.payment_reference or new.amount_kes is distinct from old.amount_kes
       or new.access_expires_at is distinct from old.access_expires_at or new.admin_note is distinct from old.admin_note
       or new.granted_by is distinct from old.granted_by or new.revoked_at is distinct from old.revoked_at
       or (new.status is distinct from old.status and coalesce(old.status, '') in ('revoked', 'awaiting_payment')) then
      raise exception 'Only an administrator can change payment or access details.';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.guard_enrollment_admin_fields() from public, anon, authenticated;

-- 4. Pricing --------------------------------------------------------------------------------------------------
create or replace function public.price_for_course(p_course uuid, p_coupon text, p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c public.courses; k public.coupons; v_code text := nullif(upper(btrim(coalesce(p_coupon, ''))), '');
        v_price numeric; v_discount numeric := 0; v_msg text := null; v_valid boolean := false;
begin
  select * into c from public.courses where id = p_course;
  if c.id is null or not coalesce(c.is_published, false) then raise exception 'That course is not available.'; end if;
  v_price := case when coalesce(c.is_free, false) then 0 else coalesce(c.price, 0) end;
  if v_code is not null then
    select * into k from public.coupons where code = v_code;
    if k.code is null or not k.active then v_msg := 'That coupon code is not valid.';
    elsif k.expires_at is not null and k.expires_at < now() then v_msg := 'That coupon has expired.';
    elsif k.course_id is not null and k.course_id <> p_course then v_msg := 'That coupon is for a different course.';
    elsif k.max_uses is not null and k.used_count >= k.max_uses then v_msg := 'That coupon has been fully used.';
    elsif p_user is not null and exists (select 1 from public.coupon_redemptions r where r.coupon_code = v_code and r.user_id = p_user) then
      v_msg := 'You have already used this coupon.';
    else
      v_valid := true;
      v_discount := least(v_price, case when k.kind = 'percent' then round(v_price * k.value / 100, 2) else k.value end);
      v_msg := 'Coupon applied.';
    end if;
  end if;
  return jsonb_build_object('price', v_price, 'discount', v_discount, 'total', greatest(v_price - v_discount, 0),
    'coupon', case when v_valid then v_code end, 'coupon_valid', v_valid, 'message', v_msg, 'currency', 'KES');
end $$;
revoke all on function public.price_for_course(uuid, text, uuid) from public, anon, authenticated;

create or replace function public.quote_price(p_course uuid, p_coupon text default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select public.price_for_course(p_course, p_coupon, auth.uid());
$$;
revoke all on function public.quote_price(uuid, text) from public, anon;
grant execute on function public.quote_price(uuid, text) to authenticated;

-- 5. Confirm (server key or admin only; idempotent) ---------------------------------------------------------------
-- settle_payment: the work itself. Nobody can call it directly; confirm_payment and start_payment use it.
create or replace function public.settle_payment(p_payment uuid, p_reference text, p_amount numeric, p_raw jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.payments; v_enrol uuid; v_label text;
begin
  select * into p from public.payments where id = p_payment for update;
  if p.id is null then raise exception 'That payment was not found.'; end if;
  if p.status = 'paid' then return jsonb_build_object('id', p.id, 'status', 'paid', 'already', true, 'receipt_no', p.receipt_no); end if;
  if p.status in ('refunded') then raise exception 'That payment was refunded and cannot be confirmed again.'; end if;
  if p_amount is not null and p_amount + 0.009 < p.amount_kes then
    update public.payments set status = 'failed', failure_reason = format('Amount paid (%s) is less than the amount due (%s).', p_amount, p.amount_kes),
           raw = coalesce(p_raw, raw), updated_at = now() where id = p.id;
    return jsonb_build_object('id', p.id, 'status', 'failed', 'reason', 'amount_mismatch');
  end if;

  update public.payments
     set status = 'paid', paid_at = now(), updated_at = now(), failure_reason = null,
         provider_reference = coalesce(nullif(btrim(coalesce(p_reference, '')), ''), provider_reference),
         raw = coalesce(p_raw, raw),
         receipt_no = coalesce(receipt_no, 'PC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.payment_receipt_seq')::text, 6, '0'))
   where id = p.id returning * into p;

  select label into v_label from public.payment_providers where key = p.provider;
  perform set_config('app.payment_rpc', 'on', true);
  select id into v_enrol from public.course_enrollments where user_id = p.user_id and course_id = p.course_id order by created_at limit 1;
  if v_enrol is null then
    insert into public.course_enrollments (user_id, course_id, status, payment_status, payment_method, payment_reference, amount_kes, enrollment_date)
    values (p.user_id, p.course_id, 'enrolled', case when p.amount_kes = 0 then 'waived' else 'paid' end, coalesce(v_label, p.provider), p.provider_reference, p.amount_kes, now());
  else
    update public.course_enrollments
       set status = case when status = 'completed' then 'completed' else 'enrolled' end, revoked_at = null,
           payment_status = case when p.amount_kes = 0 then 'waived' else 'paid' end, payment_method = coalesce(v_label, p.provider),
           payment_reference = p.provider_reference, amount_kes = p.amount_kes
     where id = v_enrol;
  end if;
  perform set_config('app.payment_rpc', 'off', true);

  if p.coupon_code is not null then
    insert into public.coupon_redemptions (coupon_code, user_id, payment_id) values (p.coupon_code, p.user_id, p.id) on conflict do nothing;
    update public.coupons set used_count = used_count + 1 where code = p.coupon_code;
  end if;

  insert into public.admin_audit_log (actor_id, actor_email, action, target_user_id, old_value, new_value)
  values (auth.uid(), coalesce((select email from public.user_profiles where id = auth.uid()), 'payment server'), 'payment.confirm', p.user_id, null,
          jsonb_build_object('payment', p.id, 'course', p.course_id, 'amount', p.amount_kes, 'provider', p.provider, 'reference', p.provider_reference, 'receipt', p.receipt_no));
  return jsonb_build_object('id', p.id, 'status', 'paid', 'already', false, 'receipt_no', p.receipt_no);
end $$;
revoke all on function public.settle_payment(uuid, text, numeric, jsonb) from public, anon, authenticated;

create or replace function public.confirm_payment(p_payment uuid, p_reference text default null, p_amount numeric default null, p_raw jsonb default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not (public.request_is_trusted_backend() or public.is_admin()) then raise exception 'Only the payment server or an admin can confirm payments.'; end if;
  return public.settle_payment(p_payment, p_reference, p_amount, p_raw);
end $$;
revoke all on function public.confirm_payment(uuid, text, numeric, jsonb) from public, anon;
grant execute on function public.confirm_payment(uuid, text, numeric, jsonb) to authenticated;

create or replace function public.fail_payment(p_payment uuid, p_reason text default null, p_raw jsonb default null, p_status text default 'failed')
returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.payments;
begin
  if not (public.request_is_trusted_backend() or public.is_admin()) then raise exception 'Only the payment server or an admin can do that.'; end if;
  if p_status not in ('failed', 'expired', 'cancelled') then raise exception 'Unknown status.'; end if;
  update public.payments set status = p_status, failure_reason = left(coalesce(p_reason, failure_reason), 300), raw = coalesce(p_raw, raw), updated_at = now()
   where id = p_payment and status = 'pending' returning * into p;
  return jsonb_build_object('id', p_payment, 'status', coalesce(p.status, 'unchanged'));
end $$;
revoke all on function public.fail_payment(uuid, text, jsonb, text) from public, anon;
grant execute on function public.fail_payment(uuid, text, jsonb, text) to authenticated;

-- 6. Start a payment (learner) -----------------------------------------------------------------------------------
create or replace function public.start_payment(p_course uuid, p_provider text, p_coupon text default null, p_phone text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_quote jsonb; pr public.payment_providers; v_id uuid; v_phone text;
begin
  if v_user is null then raise exception 'Please sign in to pay.'; end if;
  select * into pr from public.payment_providers where key = p_provider;
  if pr.key is null or not pr.enabled then raise exception 'That payment method is not available right now.'; end if;
  if exists (select 1 from public.course_enrollments e where e.user_id = v_user and e.course_id = p_course
               and coalesce(e.status, 'enrolled') in ('enrolled', 'completed', 'active')
               and (e.access_expires_at is null or e.access_expires_at > now())) then
    raise exception 'You already have access to this course.';
  end if;
  if (select count(*) from public.payments where user_id = v_user and created_at > now() - interval '10 minutes') >= 6 then
    raise exception 'Too many payment attempts. Please wait a few minutes and try again.';
  end if;
  v_quote := public.price_for_course(p_course, p_coupon, v_user);
  if p_coupon is not null and btrim(p_coupon) <> '' and not (v_quote ->> 'coupon_valid')::boolean then raise exception '%', v_quote ->> 'message'; end if;

  v_phone := nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '');
  if v_phone is not null then
    v_phone := case when v_phone ~ '^0[17]\d{8}$' then '254' || substr(v_phone, 2) when v_phone ~ '^[17]\d{8}$' then '254' || v_phone else v_phone end;
    if v_phone !~ '^254[17]\d{8}$' then raise exception 'Enter a valid Kenyan phone number, for example 0712 345 678.'; end if;
  end if;
  if p_provider = 'mpesa_stk' and v_phone is null then raise exception 'Enter the M-Pesa phone number to send the prompt to.'; end if;

  -- One open checkout per course: older pending ones for the same course are cancelled.
  update public.payments set status = 'cancelled', failure_reason = 'Replaced by a newer checkout', updated_at = now()
   where user_id = v_user and course_id = p_course and status = 'pending' and provider_reference is null;

  insert into public.payments (user_id, course_id, provider, list_price_kes, discount_kes, amount_kes, coupon_code, phone)
  values (v_user, p_course, case when (v_quote ->> 'total')::numeric = 0 then 'coupon' else p_provider end,
          (v_quote ->> 'price')::numeric, (v_quote ->> 'discount')::numeric, (v_quote ->> 'total')::numeric, v_quote ->> 'coupon', v_phone)
  returning id into v_id;

  if (v_quote ->> 'total')::numeric = 0 then
    perform public.settle_payment(v_id, 'FREE-' || left(v_id::text, 8), 0, jsonb_build_object('reason', 'coupon covers the full price'));
    return jsonb_build_object('payment_id', v_id, 'status', 'paid', 'amount', 0);
  end if;
  return jsonb_build_object('payment_id', v_id, 'status', 'pending', 'amount', (v_quote ->> 'total')::numeric, 'provider', p_provider);
end $$;
revoke all on function public.start_payment(uuid, text, text, text) from public, anon;
grant execute on function public.start_payment(uuid, text, text, text) to authenticated;

-- Manual methods: the learner submits the M-Pesa code / bank reference; access waits for an admin.
create or replace function public.submit_payment_reference(p_payment uuid, p_reference text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.payments; v_ref text := upper(regexp_replace(btrim(coalesce(p_reference, '')), '\s+', '', 'g')); v_label text;
begin
  select * into p from public.payments where id = p_payment and user_id = auth.uid();
  if p.id is null then raise exception 'That payment was not found.'; end if;
  if p.status <> 'pending' then raise exception 'This payment is no longer open. Start a new checkout.'; end if;
  if p.provider not in ('mpesa_manual', 'bank_transfer', 'whatsapp') then raise exception 'This payment method confirms automatically.'; end if;
  if length(v_ref) < 6 or length(v_ref) > 40 then raise exception 'Enter the full payment reference (for example the 10-character M-Pesa code).'; end if;
  if exists (select 1 from public.payments x where x.provider = p.provider and upper(x.provider_reference) = v_ref and x.id <> p.id) then
    raise exception 'That reference has already been used. Check the code and try again.';
  end if;
  update public.payments set provider_reference = v_ref, updated_at = now() where id = p.id;

  select label into v_label from public.payment_providers where key = p.provider;
  perform set_config('app.payment_rpc', 'on', true);
  if exists (select 1 from public.course_enrollments where user_id = p.user_id and course_id = p.course_id) then
    update public.course_enrollments set status = 'awaiting_payment', payment_status = 'awaiting', payment_method = v_label,
           payment_reference = v_ref, amount_kes = p.amount_kes
     where user_id = p.user_id and course_id = p.course_id and coalesce(status, '') not in ('enrolled', 'completed', 'active');
  else
    insert into public.course_enrollments (user_id, course_id, status, payment_status, payment_method, payment_reference, amount_kes, enrollment_date)
    values (p.user_id, p.course_id, 'awaiting_payment', 'awaiting', v_label, v_ref, p.amount_kes, now());
  end if;
  perform set_config('app.payment_rpc', 'off', true);
  return jsonb_build_object('id', p.id, 'status', 'pending', 'reference', v_ref);
end $$;
revoke all on function public.submit_payment_reference(uuid, text) from public, anon;
grant execute on function public.submit_payment_reference(uuid, text) to authenticated;

-- 7. Admin ----------------------------------------------------------------------------------------------------
create or replace function public.admin_payment_action(p_payment uuid, p_action text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.payments; r jsonb;
begin
  perform public.require_admin();
  select * into p from public.payments where id = p_payment;
  if p.id is null then raise exception 'That payment was not found.'; end if;
  if p_action = 'confirm' then
    r := public.confirm_payment(p_payment, null, null, null);
  elsif p_action = 'refund' then
    if p.status <> 'paid' then raise exception 'Only paid payments can be refunded.'; end if;
    update public.payments set status = 'refunded', failure_reason = left(coalesce(p_note, 'Refunded'), 300), updated_at = now() where id = p.id;
    update public.course_enrollments set status = 'revoked', revoked_at = now(), payment_status = 'refunded',
           admin_note = coalesce(nullif(btrim(coalesce(p_note, '')), ''), admin_note)
     where user_id = p.user_id and course_id = p.course_id;
    r := jsonb_build_object('id', p.id, 'status', 'refunded');
  elsif p_action = 'cancel' then
    r := public.fail_payment(p_payment, coalesce(p_note, 'Cancelled by admin'), null, 'cancelled');
  else
    raise exception 'Unknown action.';
  end if;
  insert into public.admin_audit_log (actor_id, actor_email, action, target_user_id, old_value, new_value)
  values (auth.uid(), (select email from public.user_profiles where id = auth.uid()), 'payment.' || p_action, p.user_id,
          jsonb_build_object('status', p.status), jsonb_build_object('payment', p.id, 'note', p_note));
  return r;
end $$;
revoke all on function public.admin_payment_action(uuid, text, text) from public, anon;
grant execute on function public.admin_payment_action(uuid, text, text) to authenticated;

drop function if exists public.admin_list_payments(text, text, text, integer, integer);
create function public.admin_list_payments(p_search text default null, p_status text default 'all', p_provider text default null,
                                           p_limit integer default 25, p_offset integer default 0)
returns table (payment_id uuid, user_id uuid, full_name text, email text, course_title text, provider text, status text,
               amount_kes numeric, discount_kes numeric, coupon_code text, provider_reference text, receipt_no text, phone text,
               failure_reason text, created_at timestamptz, paid_at timestamptz, total_count bigint, counts jsonb)
language plpgsql stable security definer set search_path = public as $$
declare v_q text := lower(btrim(coalesce(p_search, '')));
begin
  perform public.require_admin();
  return query
  with base as (
    select p.*, up.full_name as n, up.email as e, c.title as t,
           case when p.status = 'pending' and p.provider_reference is not null then 'to_confirm' else p.status end as bucket
      from public.payments p left join public.user_profiles up on up.id = p.user_id left join public.courses c on c.id = p.course_id
     where (p_provider is null or p.provider = p_provider)
       and (v_q = '' or lower(coalesce(up.full_name, '')) like '%' || v_q || '%' or lower(coalesce(up.email, '')) like '%' || v_q || '%'
            or lower(coalesce(p.provider_reference, '')) like '%' || v_q || '%' or lower(coalesce(p.receipt_no, '')) like '%' || v_q || '%')
  ), tally as (
    select jsonb_build_object('all', count(*), 'to_confirm', count(*) filter (where x.bucket = 'to_confirm'),
      'pending', count(*) filter (where x.bucket = 'pending'), 'paid', count(*) filter (where x.status = 'paid'),
      'failed', count(*) filter (where x.status in ('failed', 'expired', 'cancelled')), 'refunded', count(*) filter (where x.status = 'refunded')) j from base x
  )
  select b.id, b.user_id, b.n, b.e, b.t, b.provider, b.bucket, b.amount_kes, b.discount_kes, b.coupon_code, b.provider_reference, b.receipt_no,
         b.phone, b.failure_reason, b.created_at, b.paid_at, count(*) over (), (select j from tally)
    from base b
   where coalesce(p_status, 'all') = 'all' or b.bucket = p_status
         or (p_status = 'failed' and b.status in ('failed', 'expired', 'cancelled'))
   order by (b.bucket = 'to_confirm') desc, b.created_at desc
   limit greatest(1, least(coalesce(p_limit, 25), 100)) offset greatest(0, coalesce(p_offset, 0));
end $$;
revoke all on function public.admin_list_payments(text, text, text, integer, integer) from public, anon;
grant execute on function public.admin_list_payments(text, text, text, integer, integer) to authenticated;

create or replace function public.admin_payments_summary(p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_from timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)));
begin
  perform public.require_admin();
  return jsonb_build_object(
    'revenue', coalesce((select sum(amount_kes) from public.payments where status = 'paid' and paid_at >= v_from), 0),
    'paid_count', (select count(*) from public.payments where status = 'paid' and paid_at >= v_from),
    'refunded', coalesce((select sum(amount_kes) from public.payments where status = 'refunded' and updated_at >= v_from), 0),
    'to_confirm', (select count(*) from public.payments where status = 'pending' and provider_reference is not null),
    'pending_over_1h', (select count(*) from public.payments where status = 'pending' and created_at < now() - interval '1 hour'),
    'failed', (select count(*) from public.payments where status in ('failed', 'expired') and created_at >= v_from),
    'by_day', coalesce((select jsonb_agg(jsonb_build_object('day', d, 'amount', amt) order by d) from (
                select date_trunc('day', paid_at) d, sum(amount_kes) amt from public.payments where status = 'paid' and paid_at >= v_from group by 1) x), '[]'::jsonb),
    'by_method', coalesce((select jsonb_agg(jsonb_build_object('provider', provider, 'amount', amt, 'count', n) order by amt desc) from (
                select provider, sum(amount_kes) amt, count(*) n from public.payments where status = 'paid' and paid_at >= v_from group by 1) x), '[]'::jsonb),
    'by_course', coalesce((select jsonb_agg(jsonb_build_object('title', t, 'amount', amt, 'count', n) order by amt desc) from (
                select c.title t, sum(p.amount_kes) amt, count(*) n from public.payments p join public.courses c on c.id = p.course_id
                 where p.status = 'paid' and p.paid_at >= v_from group by 1 limit 10) x), '[]'::jsonb));
end $$;
revoke all on function public.admin_payments_summary(integer) from public, anon;
grant execute on function public.admin_payments_summary(integer) to authenticated;

-- Automatic checkouts that never got a callback: STK prompts expire after a minute or two.
create or replace function public.expire_stale_payments()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not (public.request_is_trusted_backend() or public.is_admin()) then raise exception 'Admins only.'; end if;
  update public.payments set status = 'expired', failure_reason = 'No confirmation from the provider', updated_at = now()
   where status = 'pending' and provider in ('mpesa_stk', 'paystack') and created_at < now() - interval '1 hour';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.expire_stale_payments() from public, anon;
grant execute on function public.expire_stale_payments() to authenticated;

commit;
