// M-Pesa STK Push (Safaricom Daraja). Deployed automatically by .github/workflows/deploy-functions.yml (no JWT check
// at the gateway: learner calls are checked in code; Safaricom's callback carries no Supabase token).
//
// Keys: paste them in Admin > Learning > Payments > Payment methods > M-Pesa (saved encrypted in Supabase Vault).
// Edge Function secrets with the same meaning also work and take priority:
//   MPESA_ENV  MPESA_CONSUMER_KEY  MPESA_CONSUMER_SECRET  MPESA_SHORTCODE  MPESA_PASSKEY  MPESA_TRANSACTION_TYPE  MPESA_CALLBACK_TOKEN
//
// Learner calls (POST, with their Supabase session):
//   { action: "stk", payment_id }    send the prompt for that pending payment
//   { action: "query", payment_id }  ask Safaricom for the result (if the callback is late or lost)
//   { action: "health" }             admin page: are the keys present? (never returns them)
// Safaricom calls: POST ?callback=<token>. The result is re-checked with Safaricom before confirming.
import { confirmPayment, cors, failPayment, json, loadOwnPendingPayment, providerConfig, requireUser, serviceClient, timingSafeEqual } from "../_shared/payments.ts"

type Cfg = { env?: string; consumer_key?: string; consumer_secret?: string; shortcode?: string; passkey?: string; transaction_type?: string; callback_token?: string }

async function loadConfig(): Promise<Cfg> {
  return await providerConfig("mpesa_stk", {
    env: "MPESA_ENV", consumer_key: "MPESA_CONSUMER_KEY", consumer_secret: "MPESA_CONSUMER_SECRET", shortcode: "MPESA_SHORTCODE",
    passkey: "MPESA_PASSKEY", transaction_type: "MPESA_TRANSACTION_TYPE", callback_token: "MPESA_CALLBACK_TOKEN",
  })
}
const ready = (c: Cfg) => Boolean(c.consumer_key && c.consumer_secret && c.shortcode && c.passkey && c.callback_token)
const base = (c: Cfg) => (c.env === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke")

async function accessToken(c: Cfg) {
  const res = await fetch(`${base(c)}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${btoa(`${c.consumer_key}:${c.consumer_secret}`)}` } })
  if (!res.ok) throw new Error("M-Pesa sign-in failed. Check the consumer key and secret.")
  return (await res.json()).access_token as string
}

function stamp() {
  const d = new Date(Date.now() + 3 * 3600 * 1000) // Safaricom expects Nairobi time
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`
}

const callbackUrl = (c: Cfg) => `${(Deno.env.get("SUPABASE_URL") || "").replace(/\/+$/, "")}/functions/v1/payments-mpesa?callback=${encodeURIComponent(c.callback_token || "")}`

async function stkQuery(c: Cfg, checkoutId: string) {
  const ts = stamp()
  const res = await fetch(`${base(c)}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken(c)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ BusinessShortCode: c.shortcode, Password: btoa(`${c.shortcode}${c.passkey}${ts}`), Timestamp: ts, CheckoutRequestID: checkoutId }),
  })
  return await res.json().catch(() => ({}))
}

async function settleFromQuery(c: Cfg, payment: { id: string; checkout_id: string | null; amount_kes: number }, callbackMeta?: Record<string, unknown>) {
  if (!payment.checkout_id) return { status: "pending" }
  const q = await stkQuery(c, payment.checkout_id)
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
  const c = await loadConfig()

  // Safaricom callback ------------------------------------------------------------------------------------------
  if (url.searchParams.has("callback")) {
    const ack = new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), { headers: { "Content-Type": "application/json" } })
    if (!c.callback_token || !timingSafeEqual(url.searchParams.get("callback") || "", c.callback_token)) return ack
    try {
      const body = await req.json()
      const cb = body?.Body?.stkCallback
      if (!cb?.CheckoutRequestID) return ack
      const { data: payment } = await serviceClient().from("payments").select("id, checkout_id, amount_kes, status").eq("checkout_id", cb.CheckoutRequestID).maybeSingle()
      if (!payment || payment.status !== "pending") return ack
      const meta = Object.fromEntries((cb.CallbackMetadata?.Item || []).map((i: { Name: string; Value: unknown }) => [i.Name, i.Value]))
      await settleFromQuery(c, payment, meta) // never trust the callback body alone
    } catch (error) {
      console.error("mpesa callback error", (error as Error).message)
    }
    return ack
  }

  let body: { action?: string; payment_id?: string }
  try { body = await req.json() } catch { return json({ error: "Bad request" }, 400) }
  if (body.action === "health") return json({ configured: ready(c), env: c.env || "sandbox" })

  const user = await requireUser(req)
  if (!user) return json({ error: "Please sign in again." }, 401)
  if (!body.payment_id) return json({ error: "Missing payment." }, 400)
  if (!ready(c)) return json({ error: "M-Pesa is not set up yet. Choose another payment method." }, 503)

  try {
    const payment = await loadOwnPendingPayment(body.payment_id, user.id, "mpesa_stk")
    if (body.action === "query") {
      if (payment.status !== "pending") return json({ status: payment.status })
      return json(await settleFromQuery(c, payment))
    }
    if (payment.status !== "pending") return json({ error: "This payment is no longer open. Start a new checkout." }, 409)
    if (!payment.phone) return json({ error: "Missing phone number." }, 400)

    const ts = stamp()
    const res = await fetch(`${base(c)}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${await accessToken(c)}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: c.shortcode,
        Password: btoa(`${c.shortcode}${c.passkey}${ts}`),
        Timestamp: ts,
        TransactionType: c.transaction_type || "CustomerPayBillOnline",
        Amount: Math.ceil(Number(payment.amount_kes)),
        PartyA: payment.phone,
        PartyB: c.shortcode,
        PhoneNumber: payment.phone,
        CallBackURL: callbackUrl(c),
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
