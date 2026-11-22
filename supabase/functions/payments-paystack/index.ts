// Paystack (cards, and other methods Paystack offers in Kenya). Deploy with:
//   supabase functions deploy payments-paystack --no-verify-jwt
// Secrets: PAYSTACK_SECRET_KEY   SITE_URL=https://www.pharmacourse.co.ke   APP_ORIGIN=https://www.pharmacourse.co.ke
// In the Paystack dashboard set the webhook URL to: https://<project>.supabase.co/functions/v1/payments-paystack
//
// Learner calls (POST, with their Supabase session):
//   { action: "init", payment_id }    returns the Paystack page to send the learner to
//   { action: "verify", payment_id }  checks the result after the learner comes back
// Paystack webhook: verified with the x-paystack-signature HMAC, then re-checked with the verify API before confirming.
import { confirmPayment, cors, failPayment, json, loadOwnPendingPayment, requireUser, serviceClient, timingSafeEqual } from "../_shared/payments.ts"

const SECRET = Deno.env.get("PAYSTACK_SECRET_KEY") || ""
const SITE = (Deno.env.get("SITE_URL") || "https://www.pharmacourse.co.ke").replace(/\/+$/, "")

async function hmacSha512Hex(key: string, message: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-512" }, false, ["sign"])
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(message))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

async function verifyAndSettle(paymentId: string) {
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${SECRET}` } })
  const body = await res.json().catch(() => ({}))
  const tx = body?.data
  if (!res.ok || !tx) return { status: "pending" }
  if (tx.status === "success" && tx.currency === "KES") {
    const result = await confirmPayment(paymentId, String(tx.reference || paymentId), Number(tx.amount) / 100,
      { provider: "paystack", channel: tx.channel, paid_at: tx.paid_at, gateway_response: tx.gateway_response })
    return { status: result?.status || "paid" }
  }
  if (tx.status === "failed" || tx.status === "abandoned") {
    await failPayment(paymentId, String(tx.gateway_response || `Paystack: ${tx.status}`), { provider: "paystack", status: tx.status }, tx.status === "abandoned" ? "cancelled" : "failed")
    return { status: tx.status === "abandoned" ? "cancelled" : "failed" }
  }
  return { status: "pending" }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)
  if (!SECRET) return json({ error: "Card payments are not set up yet. Choose another payment method." }, 503)

  // Paystack webhook ---------------------------------------------------------------------------------------------
  const signature = req.headers.get("x-paystack-signature")
  if (signature) {
    const raw = await req.text()
    const expected = await hmacSha512Hex(SECRET, raw)
    if (!timingSafeEqual(signature, expected)) return new Response("invalid signature", { status: 401 })
    try {
      const event = JSON.parse(raw)
      const ref = String(event?.data?.reference || "")
      if (event?.event === "charge.success" && /^[0-9a-f-]{36}$/i.test(ref)) await verifyAndSettle(ref)
    } catch (error) {
      console.error("paystack webhook error", (error as Error).message)
    }
    return new Response("ok", { status: 200 })
  }

  // Learner calls ------------------------------------------------------------------------------------------------
  const user = await requireUser(req)
  if (!user) return json({ error: "Please sign in again." }, 401)
  let body: { action?: string; payment_id?: string }
  try { body = await req.json() } catch { return json({ error: "Bad request" }, 400) }
  if (!body.payment_id) return json({ error: "Missing payment." }, 400)

  try {
    const payment = await loadOwnPendingPayment(body.payment_id, user.id, "paystack")
    if (body.action === "verify") {
      if (payment.status !== "pending") return json({ status: payment.status })
      return json(await verifyAndSettle(payment.id))
    }
    if (payment.status !== "pending") return json({ error: "This payment is no longer open. Start a new checkout." }, 409)

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(Number(payment.amount_kes) * 100),
        currency: "KES",
        reference: payment.id,
        callback_url: `${SITE}/payments/return?payment=${payment.id}`,
        metadata: { payment_id: payment.id, course_id: payment.course_id },
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.data?.authorization_url) {
      await failPayment(payment.id, String(data?.message || "Paystack could not start the payment."), { provider: "paystack" })
      return json({ error: "We could not open the card payment page. Please try again." }, 502)
    }
    await serviceClient().from("payments").update({ checkout_id: data.data.access_code, updated_at: new Date().toISOString() }).eq("id", payment.id)
    return json({ status: "redirect", url: data.data.authorization_url })
  } catch (error) {
    return json({ error: (error as Error).message || "Something went wrong." }, 400)
  }
})
