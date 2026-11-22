// M-Pesa STK Push (Safaricom Daraja). Deploy with:  supabase functions deploy payments-mpesa --no-verify-jwt
// (JWT is checked in code for learner calls; Safaricom's callback carries no Supabase token.)
//
// Secrets (supabase secrets set ...):
//   MPESA_ENV=sandbox|production   MPESA_CONSUMER_KEY   MPESA_CONSUMER_SECRET
//   MPESA_SHORTCODE (Paybill or Till)   MPESA_PASSKEY   MPESA_TRANSACTION_TYPE=CustomerPayBillOnline|CustomerBuyGoodsOnline
//   MPESA_CALLBACK_TOKEN (a long random string)   APP_ORIGIN=https://www.pharmacourse.co.ke
//
// Learner calls (POST, with their Supabase session):
//   { action: "stk", payment_id }    send the prompt for that pending payment
//   { action: "query", payment_id }  ask Safaricom for the result (if the callback is late or lost)
// Safaricom calls: POST ?callback=<MPESA_CALLBACK_TOKEN>. The result is re-checked with Safaricom before confirming.
import { confirmPayment, cors, failPayment, json, loadOwnPendingPayment, requireUser, serviceClient, timingSafeEqual } from "../_shared/payments.ts"

const env = (k: string) => Deno.env.get(k) || ""
const BASE = env("MPESA_ENV") === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke"

async function accessToken() {
  const basic = btoa(`${env("MPESA_CONSUMER_KEY")}:${env("MPESA_CONSUMER_SECRET")}`)
  const res = await fetch(`${BASE}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${basic}` } })
  if (!res.ok) throw new Error("M-Pesa sign-in failed.")
  return (await res.json()).access_token as string
}

function stamp() {
  const d = new Date(Date.now() + 3 * 3600 * 1000) // Safaricom expects Nairobi time
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`
}

function callbackUrl() {
  const url = `${env("SUPABASE_URL").replace(/\/+$/, "")}/functions/v1/payments-mpesa?callback=${encodeURIComponent(env("MPESA_CALLBACK_TOKEN"))}`
  return url
}

async function stkQuery(checkoutId: string) {
  const ts = stamp()
  const res = await fetch(`${BASE}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ BusinessShortCode: env("MPESA_SHORTCODE"), Password: btoa(`${env("MPESA_SHORTCODE")}${env("MPESA_PASSKEY")}${ts}`), Timestamp: ts, CheckoutRequestID: checkoutId }),
  })
  return await res.json().catch(() => ({}))
}

async function settleFromQuery(payment: { id: string; checkout_id: string | null; amount_kes: number }, callbackMeta?: Record<string, unknown>) {
  if (!payment.checkout_id) return { status: "pending" }
  const q = await stkQuery(payment.checkout_id)
  const code = String(q.ResultCode ?? "")
  if (code === "0") {
    const receipt = String(callbackMeta?.MpesaReceiptNumber || q.MpesaReceiptNumber || `STK-${payment.checkout_id.slice(-10)}`)
    const amount = Number(callbackMeta?.Amount ?? payment.amount_kes)
    const result = await confirmPayment(payment.id, receipt, amount, { provider: "mpesa_stk", result: q.ResultDesc, receipt })
    return { status: result?.status || "paid" }
  }
  if (code && code !== "4999" && q.errorCode !== "500.001.1001") { // 500.001.1001 / 4999 = still being processed
    await failPayment(payment.id, String(q.ResultDesc || "M-Pesa payment was not completed."), { provider: "mpesa_stk", code })
    return { status: "failed", reason: q.ResultDesc }
  }
  return { status: "pending" }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)
  const url = new URL(req.url)

  // Safaricom callback ------------------------------------------------------------------------------------------
  if (url.searchParams.has("callback")) {
    const ack = new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), { headers: { "Content-Type": "application/json" } })
    if (!env("MPESA_CALLBACK_TOKEN") || !timingSafeEqual(url.searchParams.get("callback") || "", env("MPESA_CALLBACK_TOKEN"))) return ack
    try {
      const body = await req.json()
      const cb = body?.Body?.stkCallback
      if (!cb?.CheckoutRequestID) return ack
      const { data: payment } = await serviceClient().from("payments").select("id, checkout_id, amount_kes, status").eq("checkout_id", cb.CheckoutRequestID).maybeSingle()
      if (!payment || payment.status !== "pending") return ack
      const meta = Object.fromEntries((cb.CallbackMetadata?.Item || []).map((i: { Name: string; Value: unknown }) => [i.Name, i.Value]))
      // Never trust the callback body alone: confirm the result with Safaricom first.
      await settleFromQuery(payment, meta)
    } catch (error) {
      console.error("mpesa callback error", (error as Error).message)
    }
    return ack
  }

  // Learner calls ------------------------------------------------------------------------------------------------
  let body: { action?: string; payment_id?: string }
  try { body = await req.json() } catch { return json({ error: "Bad request" }, 400) }
  // Setup check for the admin settings page: says only whether the keys are present, never their values.
  if (body.action === "health") return json({ configured: Boolean(env("MPESA_CONSUMER_KEY") && env("MPESA_CONSUMER_SECRET") && env("MPESA_SHORTCODE") && env("MPESA_PASSKEY") && env("MPESA_CALLBACK_TOKEN")), env: env("MPESA_ENV") || "sandbox" })
  const user = await requireUser(req)
  if (!user) return json({ error: "Please sign in again." }, 401)
  if (!body.payment_id) return json({ error: "Missing payment." }, 400)
  if (!env("MPESA_CONSUMER_KEY") || !env("MPESA_SHORTCODE") || !env("MPESA_PASSKEY") || !env("MPESA_CALLBACK_TOKEN")) {
    return json({ error: "M-Pesa is not set up yet. Choose another payment method." }, 503)
  }

  try {
    const payment = await loadOwnPendingPayment(body.payment_id, user.id, "mpesa_stk")
    if (body.action === "query") {
      if (payment.status !== "pending") return json({ status: payment.status })
      return json(await settleFromQuery(payment))
    }
    if (payment.status !== "pending") return json({ error: "This payment is no longer open. Start a new checkout." }, 409)
    if (!payment.phone) return json({ error: "Missing phone number." }, 400)

    const ts = stamp()
    const res = await fetch(`${BASE}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: env("MPESA_SHORTCODE"),
        Password: btoa(`${env("MPESA_SHORTCODE")}${env("MPESA_PASSKEY")}${ts}`),
        Timestamp: ts,
        TransactionType: env("MPESA_TRANSACTION_TYPE") || "CustomerPayBillOnline",
        Amount: Math.ceil(Number(payment.amount_kes)),
        PartyA: payment.phone,
        PartyB: env("MPESA_SHORTCODE"),
        PhoneNumber: payment.phone,
        CallBackURL: callbackUrl(),
        AccountReference: "Pharmacourse",
        TransactionDesc: "Course payment",
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.ResponseCode !== "0") {
      await failPayment(payment.id, String(data.errorMessage || data.ResponseDescription || "M-Pesa could not send the prompt."), { provider: "mpesa_stk" })
      return json({ error: "M-Pesa could not send the prompt. Check the number and try again." }, 502)
    }
    await serviceClient().from("payments").update({ checkout_id: data.CheckoutRequestID, updated_at: new Date().toISOString() }).eq("id", payment.id)
    return json({ status: "prompt_sent", message: data.CustomerMessage || "Check your phone and enter your M-Pesa PIN." })
  } catch (error) {
    return json({ error: (error as Error).message || "Something went wrong." }, 400)
  }
})
