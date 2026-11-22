import { useCallback, useEffect, useRef, useState } from "react"
import { Building2, CheckCircle2, CreditCard, Loader2, MessageCircle, Smartphone, Tag, X } from "lucide-react"
import { supabase } from "../lib/supabaseClient"
import { friendlyError } from "../lib/friendlyError"
import "../styles/checkout-ui.css"

const ICONS = { mpesa_stk: Smartphone, paystack: CreditCard, mpesa_manual: Smartphone, bank_transfer: Building2, whatsapp: MessageCircle }
const kes = (v) => `KES ${Number(v || 0).toLocaleString("en-KE")}`
const missingSql = (e) => /payment_providers|quote_price|start_payment|does not exist|schema cache/i.test(String(e?.message || ""))

async function invokeFn(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    let message = "The payment service is not reachable right now. Please try another method."
    try { const parsed = await error.context?.json?.(); if (parsed?.error) message = parsed.error } catch { /* keep default */ }
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

// Checkout for a paid course. The price and the result are decided by the database and the payment server,
// never by this page. `whatsappLink` keeps the old pay-on-WhatsApp route available.
export default function CheckoutModal({ course, user, whatsappLink, onClose, onPaid }) {
  const [providers, setProviders] = useState(null)
  const [setupMissing, setSetupMissing] = useState(false)
  const [method, setMethod] = useState("")
  const [coupon, setCoupon] = useState("")
  const [quote, setQuote] = useState(null)
  const [quoteMsg, setQuoteMsg] = useState("")
  const [phone, setPhone] = useState("")
  const [reference, setReference] = useState("")
  const [step, setStep] = useState("choose") // choose | waiting | manual | submitted | paid
  const [payment, setPayment] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const pollRef = useRef(null)

  useEffect(() => {
    let active = true
    supabase.from("payment_providers").select("key, label, description, instructions, automatic, display_order").order("display_order").then(({ data, error: e }) => {
      if (!active) return
      if (e) { setSetupMissing(missingSql(e) || true); setProviders([]); return }
      setProviders(data || [])
      setMethod((data || [])[0]?.key || "")
    })
    return () => { active = false }
  }, [])

  const refreshQuote = useCallback(async (code) => {
    const { data, error: e } = await supabase.rpc("quote_price", { p_course: course.id, p_coupon: code || null })
    if (e) { if (missingSql(e)) setSetupMissing(true); return }
    setQuote(data)
    setQuoteMsg(code ? data?.message || "" : "")
  }, [course.id])

  useEffect(() => { void refreshQuote("") }, [refreshQuote])
  useEffect(() => () => clearInterval(pollRef.current), [])
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && step !== "waiting") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose, step])

  const selected = providers?.find((p) => p.key === method)
  const total = Number(quote?.total ?? course.price ?? 0)

  function pollUntilDone(paymentId, { query = false } = {}) {
    clearInterval(pollRef.current)
    let ticks = 0
    pollRef.current = setInterval(async () => {
      ticks += 1
      if (query && ticks % 5 === 0) { try { await invokeFn("payments-mpesa", { action: "query", payment_id: paymentId }) } catch { /* keep polling */ } }
      const { data } = await supabase.from("payments").select("status, failure_reason, receipt_no").eq("id", paymentId).maybeSingle()
      if (data?.status === "paid") { clearInterval(pollRef.current); setPayment((p) => ({ ...p, receipt_no: data.receipt_no })); setStep("paid"); onPaid?.() }
      else if (data && ["failed", "expired", "cancelled"].includes(data.status)) {
        clearInterval(pollRef.current); setStep("choose"); setError(data.failure_reason || "The payment was not completed. Please try again.")
      } else if (ticks > 60) {
        clearInterval(pollRef.current); setInfo("Still waiting for M-Pesa. If you paid, it will show in My payments shortly.")
      }
    }, 3000)
  }

  async function start() {
    setBusy(true); setError(""); setInfo("")
    try {
      const { data, error: e } = await supabase.rpc("start_payment", {
        p_course: course.id, p_provider: method, p_coupon: quote?.coupon_valid ? quote.coupon : null, p_phone: method === "mpesa_stk" ? phone : null,
      })
      if (e) throw new Error(friendlyError(e, "We could not start the payment."))
      setPayment(data)
      if (data.status === "paid") { setStep("paid"); onPaid?.(); return }
      if (method === "mpesa_stk") {
        const r = await invokeFn("payments-mpesa", { action: "stk", payment_id: data.payment_id })
        setInfo(r.message || "Check your phone and enter your M-Pesa PIN.")
        setStep("waiting"); pollUntilDone(data.payment_id, { query: true })
      } else if (method === "paystack") {
        const r = await invokeFn("payments-paystack", { action: "init", payment_id: data.payment_id })
        window.location.assign(r.url)
      } else {
        setStep("manual")
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function submitReference(event) {
    event.preventDefault()
    setBusy(true); setError("")
    const { error: e } = await supabase.rpc("submit_payment_reference", { p_payment: payment.payment_id, p_reference: reference })
    setBusy(false)
    if (e) { setError(friendlyError(e, "We could not save that reference.")); return }
    setStep("submitted")
  }

  const waText = payment
    ? `Hi, I'm paying for "${course.title}" (${kes(payment.amount)}). Payment ID ${String(payment.payment_id).slice(0, 8)}. Account: ${user?.email || ""}.`
    : ""
  const waHref = whatsappLink && payment ? whatsappLink.replace(/text=[^&]*/, `text=${encodeURIComponent(waText)}`) : whatsappLink

  return (
    <div className="co-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && step !== "waiting") onClose() }}>
      <div className="co-modal" role="dialog" aria-modal="true" aria-labelledby="co-title">
        <div className="co-head">
          <div>
            <p className="co-eyebrow">Checkout</p>
            <h3 id="co-title">{course.title}</h3>
          </div>
          <button type="button" className="co-x" onClick={onClose} aria-label="Close" disabled={step === "waiting"}><X size={18} /></button>
        </div>

        {setupMissing ? (
          <div className="co-body">
            <p className="co-muted">Online payment is being set up. You can still pay and enrol through WhatsApp.</p>
            {whatsappLink ? <a className="co-btn primary wide" href={whatsappLink} target="_blank" rel="noreferrer noopener"><MessageCircle size={17} aria-hidden="true" /> Pay & enrol on WhatsApp</a> : null}
          </div>
        ) : step === "paid" ? (
          <div className="co-body co-center">
            <span className="co-done"><CheckCircle2 size={34} aria-hidden="true" /></span>
            <h4>You're enrolled</h4>
            <p className="co-muted">{payment?.receipt_no ? `Receipt ${payment.receipt_no} is in My payments.` : "Your access is active."}</p>
            <button type="button" className="co-btn primary wide" onClick={onClose}>Start learning</button>
          </div>
        ) : step === "waiting" ? (
          <div className="co-body co-center">
            <Loader2 size={34} className="co-spin" aria-hidden="true" />
            <h4>Check your phone</h4>
            <p className="co-muted">{info || "Enter your M-Pesa PIN to pay"} {kes(payment?.amount)}. This page updates by itself.</p>
            <button type="button" className="co-btn" onClick={async () => {
              try { const r = await invokeFn("payments-mpesa", { action: "query", payment_id: payment.payment_id }); if (r.status === "pending") setInfo("Not confirmed yet. Give it a few more seconds.") } catch (err) { setInfo(err.message) }
            }}>I've paid, check now</button>
          </div>
        ) : step === "submitted" ? (
          <div className="co-body co-center">
            <span className="co-done"><CheckCircle2 size={34} aria-hidden="true" /></span>
            <h4>Reference received</h4>
            <p className="co-muted">We'll confirm your payment and activate access, usually within a few working hours. You'll see it in My payments.</p>
            <button type="button" className="co-btn primary wide" onClick={onClose}>Done</button>
          </div>
        ) : step === "manual" ? (
          <form className="co-body" onSubmit={submitReference}>
            <div className="co-instructions">
              <strong>Pay {kes(payment?.amount)}</strong>
              <p>{selected?.instructions || selected?.description}</p>
              {method === "whatsapp" && waHref ? <a className="co-btn wide" href={waHref} target="_blank" rel="noreferrer noopener"><MessageCircle size={16} aria-hidden="true" /> Open WhatsApp</a> : null}
            </div>
            <label className="co-field"><span>{method === "bank_transfer" ? "Bank reference" : "M-Pesa code"}</span>
              <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder={method === "bank_transfer" ? "e.g. FT2433012345" : "e.g. SGH7KL22PQ"} required autoFocus />
              <small>Enter it after paying. {method === "whatsapp" ? "You can also send it on WhatsApp." : ""}</small>
            </label>
            {error ? <p role="alert" className="co-alert">{error}</p> : null}
            <button type="submit" className="co-btn primary wide" disabled={busy || reference.trim().length < 6}>{busy ? "Saving…" : "Submit reference"}</button>
          </form>
        ) : (
          <div className="co-body">
            <div className="co-summary">
              <div><span>Course price</span><span>{kes(quote?.price ?? course.price)}</span></div>
              {Number(quote?.discount) > 0 ? <div className="co-discount"><span>Coupon {quote.coupon}</span><span>− {kes(quote.discount)}</span></div> : null}
              <div className="co-total"><span>Total</span><strong>{kes(total)}</strong></div>
            </div>

            <div className="co-coupon">
              <Tag size={16} aria-hidden="true" />
              <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Coupon code" aria-label="Coupon code" />
              <button type="button" className="co-btn small" onClick={() => void refreshQuote(coupon.trim())} disabled={!coupon.trim()}>Apply</button>
            </div>
            {quoteMsg ? <p className={`co-note ${quote?.coupon_valid ? "ok" : "bad"}`}>{quoteMsg}</p> : null}

            {total > 0 ? (
              <>
                <p className="co-label">Pay with</p>
                {providers === null ? <p className="co-muted">Loading payment methods…</p> : providers.length === 0 ? <p className="co-muted">No payment methods are available right now.</p> : (
                  <div className="co-methods" role="radiogroup" aria-label="Payment method">
                    {providers.map((p) => {
                      const Icon = ICONS[p.key] || CreditCard
                      return (
                        <button key={p.key} type="button" role="radio" aria-checked={method === p.key} className={`co-method${method === p.key ? " active" : ""}`} onClick={() => setMethod(p.key)}>
                          <span className="co-method-icon" aria-hidden="true"><Icon size={18} /></span>
                          <span className="co-method-text"><strong>{p.label}</strong><small>{p.description}</small></span>
                        </button>
                      )
                    })}
                  </div>
                )}
                {method === "mpesa_stk" ? (
                  <label className="co-field"><span>M-Pesa phone number</span>
                    <input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" />
                  </label>
                ) : null}
              </>
            ) : null}

            {error ? <p role="alert" className="co-alert">{error}</p> : null}
            <button type="button" className="co-btn primary wide" onClick={() => void start()} disabled={busy || !quote || (total > 0 && (!method || (method === "mpesa_stk" && phone.trim().length < 9)))}>
              {busy ? "Starting…" : total === 0 ? "Enrol with coupon" : method === "mpesa_stk" ? `Send M-Pesa prompt · ${kes(total)}` : method === "paystack" ? `Continue to pay · ${kes(total)}` : `Continue · ${kes(total)}`}
            </button>
            <p className="co-fine">Access starts as soon as your payment is confirmed. Prices are in Kenya shillings.</p>
          </div>
        )}
      </div>
    </div>
  )
}
