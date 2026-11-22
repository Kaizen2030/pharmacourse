# Payments setup

Pharmacourse takes payments through a set of methods you can switch on or off in **Admin → Learning → Payments → Payment methods**. The site never decides that a payment succeeded: the database and the payment server do.

| Method | Works after the SQL | Needs keys |
|---|---|---|
| Pay via WhatsApp (old flow) | Yes (on by default) | No |
| M-Pesa Paybill / Till (learner enters the code, admin confirms) | Yes, once you add your Paybill/Till in the instructions | No |
| Bank transfer (learner enters the reference, admin confirms) | Yes, once you add your bank details | No |
| M-Pesa prompt (STK push, confirms by itself) | After deploying `payments-mpesa` | Safaricom Daraja |
| Card and others (Paystack, confirms by itself) | After deploying `payments-paystack` | Paystack |
| Coupons, including 100% sponsored seats | Yes | No |

## 1. Database (once)

Supabase project `nnjiutikutsjvggakvvv` → SQL Editor → run `supabase/security/2026-11-29_phase10_payments.sql`.
Phase 9 (`2026-11-28_phase9_enrolments.sql`) must already be run. To undo: `2026-11-29_phase10_payments_rollback.sql`
(payment records are kept).

## 2. M-Pesa prompt (Safaricom Daraja)

1. Create an app at https://developer.safaricom.co.ke and get the consumer key and secret. Start in the sandbox.
2. For production, apply for "Lipa na M-Pesa Online" on your Paybill or Till to get the passkey.
3. Set the secrets (Supabase CLI, in this folder):

```
supabase secrets set --project-ref nnjiutikutsjvggakvvv \
  MPESA_ENV=sandbox \
  MPESA_CONSUMER_KEY=... MPESA_CONSUMER_SECRET=... \
  MPESA_SHORTCODE=174379 MPESA_PASSKEY=... \
  MPESA_TRANSACTION_TYPE=CustomerPayBillOnline \
  MPESA_CALLBACK_TOKEN=<a long random string> \
  APP_ORIGIN=https://www.pharmacourse.co.ke
supabase functions deploy payments-mpesa --project-ref nnjiutikutsjvggakvvv --no-verify-jwt
```

Use `CustomerBuyGoodsOnline` for a Till. The callback URL is built automatically and carries `MPESA_CALLBACK_TOKEN`;
every callback is re-checked with Safaricom (STK query) before a payment is confirmed.
4. Test with the sandbox number, then switch `MPESA_ENV=production` with your live keys, and turn on **M-Pesa** in admin.

## 3. Cards (Paystack)

1. Create a Paystack business account for Kenya (KES). Copy the secret key (test first, then live).
2. In Paystack → Settings → API keys & webhooks, set the webhook URL to
   `https://nnjiutikutsjvggakvvv.supabase.co/functions/v1/payments-paystack`
3. Set the secrets and deploy:

```
supabase secrets set --project-ref nnjiutikutsjvggakvvv PAYSTACK_SECRET_KEY=sk_test_... \
  SITE_URL=https://www.pharmacourse.co.ke APP_ORIGIN=https://www.pharmacourse.co.ke
supabase functions deploy payments-paystack --project-ref nnjiutikutsjvggakvvv --no-verify-jwt
```

Webhooks are checked with Paystack's signature and then re-verified with Paystack's API before confirming.
4. Turn on **Card or other methods** in admin.

## How a payment is protected

- The price is computed in the database from the course price and a valid coupon. The browser never sends an amount.
- Only the payment server (service key) or an admin can confirm a payment. A learner cannot.
- Confirming is idempotent: a callback that arrives twice enrols once and counts revenue once.
- A payment for less than the amount due is marked failed and gives no access.
- A manual M-Pesa code or bank reference can only be used once.
- Every confirmation, refund and cancellation is written to the audit log.
- Keys live only in Edge Function secrets, never in the website code.

## Daily checks

Admin → Learning → Payments shows **To confirm** (manual references waiting) and **Pending over 1 hour**
(prompts or card checkouts that never finished). To expire stale automatic checkouts, run in the SQL editor:
`select public.expire_stale_payments();`
