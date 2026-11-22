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
Phase 9 (`2026-11-28_phase9_enrolments.sql`) must already be run. To undo: `rollback-emergency-only/2026-11-29_phase10_payments_rollback.sql`
(payment records are kept).

## 1b. Your Paybill, Till, bank and WhatsApp details (no developer needed)

Run `supabase/security/2026-12-01_phase10b_payment_details.sql` once. Then in **Admin → Learning → Payments → Payment methods**:

1. Click **Set up** on a method. Each one has its own form:
   - **M-Pesa Paybill / Till**: choose Paybill or Till, type the business number, pick what learners enter as the
     account number (their email is easiest to match in your statement), and the business name exactly as M-Pesa shows it.
   - **Bank transfer**: bank, account name, account number, optional branch and SWIFT, and the reference rule.
   - **Pay via WhatsApp**: optionally the number learners message (otherwise the site support number).
2. Check the **What learners see at checkout** preview on the right, then **Save**.
3. Switch the method **on**. A method cannot be switched on until its required details are filled in.
4. Use the arrows to choose the order learners see.

At checkout, learners see the details with copy buttons (and their own email filled in as the account number).
When they enter the M-Pesa code, the payment appears under **To confirm**; check your M-Pesa statement and click **Confirm**.

## 2. M-Pesa prompt and cards: paste your keys in Admin (no developer)

**One-time server setup (about 3 minutes, once ever)**
1. supabase.com > Account > Access tokens > Generate new token, copy it.
2. GitHub > the pharmacourse repo > Settings > Secrets and variables > Actions > New repository secret:
   name `SUPABASE_ACCESS_TOKEN`, value: the token.
3. GitHub > Actions > **Deploy Supabase functions** > Run workflow. Later updates deploy by themselves.
4. Run `supabase/security/2026-12-03_phase10c_payment_keys_vault.sql` in the Supabase SQL editor.

**M-Pesa prompt (Safaricom Daraja)**: Admin > Learning > Payments > Payment methods > M-Pesa > Edit
1. Choose Test (sandbox) or Live, and Paybill or Till; type your shortcode (sandbox: 174379).
2. Paste the consumer key, consumer secret and passkey from developer.safaricom.co.ke, then **Save keys securely**.
3. The box turns green. Switch M-Pesa on. The callback link Safaricom uses is created automatically.

**Cards (Paystack)**: Payment methods > Card or other methods > Edit
1. Paste the secret key (sk_test_... first, sk_live_... when approved) and **Save keys securely**.
2. Copy the webhook URL shown and paste it in Paystack > Settings > API Keys & Webhooks.
3. The box turns green. Switch the method on.

**Where the keys go**: encrypted in Supabase Vault. Only a super admin can save or remove them; the admin page only
ever shows "Saved ••••1234". Visitors, learners, tutors and other admins cannot read them, and only the payment
server (server key) can use them. Keys are never in the website code or in GitHub.
(Advanced: Edge Function secrets such as MPESA_CONSUMER_KEY or PAYSTACK_SECRET_KEY still work and take priority.)

## How a payment is protected

- The price is computed in the database from the course price and a valid coupon. The browser never sends an amount.
- Only the payment server (service key) or an admin can confirm a payment. A learner cannot.
- Confirming is idempotent: a callback that arrives twice enrols once and counts revenue once.
- A payment for less than the amount due is marked failed and gives no access.
- A manual M-Pesa code or bank reference can only be used once.
- Every confirmation, refund and cancellation is written to the audit log.
- Keys are stored encrypted in Supabase Vault (or Edge Function secrets), never in the website code.

## Daily checks

Admin → Learning → Payments shows **To confirm** (manual references waiting) and **Pending over 1 hour**
(prompts or card checkouts that never finished). To expire stale automatic checkouts, run in the SQL editor:
`select public.expire_stale_payments();`
