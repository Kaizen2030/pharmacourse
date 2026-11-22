import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Download, Loader2, Receipt } from "lucide-react"
import { supabase } from "../lib/supabaseClient"
import { useAuth } from "../context/AuthContext"
import SEO from "../components/SEO"
import "../styles/checkout-ui.css"

const STATUS = { paid: "Paid", pending: "Pending", failed: "Failed", expired: "Expired", cancelled: "Cancelled", refunded: "Refunded" }
const METHOD = { mpesa_stk: "M-Pesa", paystack: "Card (Paystack)", mpesa_manual: "M-Pesa Paybill/Till", bank_transfer: "Bank transfer", whatsapp: "WhatsApp", coupon: "Coupon" }
const kes = (v) => `KES ${Number(v || 0).toLocaleString("en-KE", { minimumFractionDigits: 0 })}`
const when = (v) => (v ? new Date(v).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : "")

async function downloadReceipt(p, profile, email) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ unit: "mm", format: "a5" })
  const w = doc.internal.pageSize.getWidth()
  doc.setFillColor(15, 110, 86); doc.rect(0, 0, w, 28, "F")
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.text("Pharmacourse", 12, 17)
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text("Payment receipt", w - 12, 17, { align: "right" })
  doc.setTextColor(17, 35, 29)
  const rows = [
    ["Receipt number", p.receipt_no || "-"],
    ["Date paid", when(p.paid_at)],
    ["Learner", `${profile?.full_name || ""}`.trim() || email],
    ["Email", email],
    ["Course", p.courses?.title || ""],
    ["Payment method", METHOD[p.provider] || p.provider],
    ["Reference", p.provider_reference || "-"],
    ["Course price", kes(p.list_price_kes)],
    ...(Number(p.discount_kes) > 0 ? [[`Discount${p.coupon_code ? ` (${p.coupon_code})` : ""}`, `- ${kes(p.discount_kes)}`]] : []),
  ]
  let y = 42
  doc.setFontSize(10)
  rows.forEach(([k, v]) => { doc.setTextColor(96, 112, 104); doc.text(k, 12, y); doc.setTextColor(17, 35, 29); doc.text(String(v), w - 12, y, { align: "right" }); y += 8 })
  doc.setDrawColor(220, 230, 225); doc.line(12, y - 3, w - 12, y - 3)
  doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text("Total paid", 12, y + 5); doc.text(kes(p.amount_kes), w - 12, y + 5, { align: "right" })
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(96, 112, 104)
  doc.text("Thank you for learning with Pharmacourse. www.pharmacourse.co.ke", w / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" })
  doc.save(`${p.receipt_no || "receipt"}.pdf`)
}

export default function MyPayments() {
  const { user, profile, loading: authLoading } = useAuth()
  const [rows, setRows] = useState(null)

  useEffect(() => {
    if (!user) return undefined
    let active = true
    supabase.from("payments")
      .select("id, course_id, provider, status, list_price_kes, discount_kes, amount_kes, coupon_code, provider_reference, receipt_no, failure_reason, created_at, paid_at, courses(title, slug)")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => { if (active) setRows(error ? [] : data || []) })
    return () => { active = false }
  }, [user])

  if (!authLoading && !user) {
    return <main className="mp-page"><div className="mp-shell"><h1>My payments</h1><p className="co-muted">Sign in to see your payments and receipts.</p><Link to="/login" className="co-btn primary">Sign in</Link></div></main>
  }

  return (
    <main className="mp-page">
      <SEO title="My payments" description="Your Pharmacourse payments and receipts." path="/payments" noindex />
      <div className="mp-shell">
        <h1>My payments</h1>
        <p className="co-muted">Receipts for your course payments. Pending bank and M-Pesa codes are confirmed by our team, usually within a few working hours.</p>
        {rows === null ? <p className="co-muted">Loading…</p> : rows.length === 0 ? (
          <div className="mp-empty"><Receipt size={28} aria-hidden="true" /><p>No payments yet.</p><Link to="/courses" className="co-btn primary">Browse courses</Link></div>
        ) : (
          <div className="mp-list">
            {rows.map((p) => (
              <div key={p.id} className="mp-row">
                <div>
                  <strong>{p.courses?.title || "Course"}</strong>
                  <small>{METHOD[p.provider] || p.provider} · {when(p.paid_at || p.created_at)}{p.receipt_no ? ` · ${p.receipt_no}` : ""}</small>
                  {p.status !== "paid" && p.failure_reason ? <small style={{ display: "block" }}>{p.failure_reason}</small> : null}
                </div>
                <div className="mp-right">
                  <strong>{kes(p.amount_kes)}</strong>
                  <span className={`mp-status ${p.status}`}>{p.status === "pending" && p.provider_reference ? "Being confirmed" : STATUS[p.status] || p.status}</span>
                  {p.status === "paid" ? (
                    <button type="button" className="co-btn small" onClick={() => void downloadReceipt(p, profile, user.email)}><Download size={15} aria-hidden="true" /> Receipt</button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

// Paystack sends the learner back here. We ask the payment server for the result, then go to the course.
export function PaymentReturn() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState("Checking your payment…")
  const paymentId = params.get("payment") || params.get("reference") || ""

  useEffect(() => {
    if (!/^[0-9a-f-]{36}$/i.test(paymentId)) { setMessage("We could not find that payment."); return undefined }
    let tries = 0
    let stop = false
    async function check() {
      tries += 1
      try { await supabase.functions.invoke("payments-paystack", { body: { action: "verify", payment_id: paymentId } }) } catch { /* fall back to reading the row */ }
      const { data } = await supabase.from("payments").select("status, failure_reason, courses(slug, id)").eq("id", paymentId).maybeSingle()
      if (stop) return
      if (data?.status === "paid") { navigate(`/courses/${data.courses?.slug || data.courses?.id || ""}`, { replace: true }); return }
      if (data && ["failed", "cancelled", "expired"].includes(data.status)) { setMessage(data.failure_reason || "The payment was not completed. You can try again from the course page."); return }
      if (tries < 10) setTimeout(check, 3000)
      else setMessage("Your payment is still being confirmed. It will appear in My payments shortly.")
    }
    void check()
    return () => { stop = true }
  }, [paymentId, navigate])

  return (
    <main className="mp-page">
      <div className="mp-shell" style={{ justifyItems: "center", textAlign: "center" }}>
        <Loader2 size={34} className="co-spin" aria-hidden="true" />
        <p className="co-muted">{message}</p>
        <Link to="/payments" className="co-btn">My payments</Link>
      </div>
    </main>
  )
}
