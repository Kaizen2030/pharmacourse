import { useCallback, useEffect, useState } from "react"
import { Download, RefreshCw, Search } from "lucide-react"
import { supabase } from "../../lib/supabaseClient"
import { friendlyError } from "../../lib/friendlyError"
import { confirmDialog } from "../../lib/dialog"
import "./admin-learning.css"
import AdminPaymentMethods from "./AdminPaymentMethods"

const PAGE = 25
const METHOD = { mpesa_stk: "M-Pesa", paystack: "Card (Paystack)", mpesa_manual: "M-Pesa Paybill/Till", bank_transfer: "Bank transfer", whatsapp: "WhatsApp", coupon: "Coupon" }
const STATUS_TABS = [["all", "All"], ["to_confirm", "To confirm"], ["pending", "Pending"], ["paid", "Paid"], ["failed", "Failed"], ["refunded", "Refunded"]]
const STATUS_LABEL = { to_confirm: "To confirm", pending: "Pending", paid: "Paid", failed: "Failed", expired: "Expired", cancelled: "Cancelled", refunded: "Refunded" }
const BADGE = { to_confirm: "awaiting", pending: "awaiting", paid: "active", failed: "expired", expired: "expired", cancelled: "revoked", refunded: "revoked" }
const kes = (v) => `KES ${Math.round(Number(v || 0)).toLocaleString("en-KE")}`
const when = (v) => (v ? new Date(v).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : "")
const csvEscape = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
const missingSql = (e) => /admin_list_payments|admin_payments_summary|payment_providers|does not exist|schema cache/i.test(String(e?.message || ""))

export default function AdminPaymentsTab() {
  const [rows, setRows] = useState([])
  const [counts, setCounts] = useState({})
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState(null)
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [setupNeeded, setSetupNeeded] = useState(false)

  useEffect(() => { const t = setTimeout(() => { setQuery(search.trim()); setPage(0) }, 300); return () => clearTimeout(t) }, [search])

  const load = useCallback(async () => {
    setLoading(true); setError("")
    const [list, sum] = await Promise.all([
      supabase.rpc("admin_list_payments", { p_search: query || null, p_status: status, p_provider: null, p_limit: PAGE, p_offset: page * PAGE }),
      supabase.rpc("admin_payments_summary", { p_days: 30 }),
    ])
    setLoading(false)
    const e = list.error || sum.error
    if (e) { if (missingSql(e)) setSetupNeeded(true); else setError(friendlyError(e, "We could not load payments.")); return }
    setSetupNeeded(false)
    setRows(list.data || []); setTotal(Number(list.data?.[0]?.total_count || 0))
    if (list.data?.[0]?.counts) setCounts(list.data[0].counts)
    setSummary(sum.data)
  }, [query, status, page])

  useEffect(() => { void load() }, [load])

  async function act(row, action) {
    const titles = { confirm: "Confirm this payment?", refund: "Refund this payment?", cancel: "Cancel this payment?" }
    const messages = {
      confirm: `${row.full_name || row.email} gets access to ${row.course_title}. Check the ${METHOD[row.provider] || ""} reference ${row.provider_reference || ""} first.`,
      refund: "Access is revoked and the payment is marked refunded. Send the money back through the provider separately.",
      cancel: "The checkout is closed without giving access.",
    }
    if (!(await confirmDialog({ title: titles[action], message: messages[action], confirmLabel: action === "confirm" ? "Confirm" : action === "refund" ? "Mark refunded" : "Cancel payment", danger: action !== "confirm" }))) return
    setError(""); setNotice("")
    const { error: e } = await supabase.rpc("admin_payment_action", { p_payment: row.payment_id, p_action: action, p_note: null })
    if (e) { setError(friendlyError(e, "That change could not be saved.")); return }
    setNotice(action === "confirm" ? "Payment confirmed. The learner has access now." : action === "refund" ? "Marked as refunded." : "Payment cancelled.")
    void load()
  }

  function exportCsv() {
    const header = ["Date", "Learner", "Email", "Course", "Method", "Status", "Amount KES", "Discount KES", "Coupon", "Reference", "Receipt"]
    const lines = rows.map((r) => [when(r.paid_at || r.created_at), r.full_name, r.email, r.course_title, METHOD[r.provider] || r.provider, STATUS_LABEL[r.status] || r.status,
      r.amount_kes, r.discount_kes, r.coupon_code, r.provider_reference, r.receipt_no].map(csvEscape).join(","))
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" })
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }

  return (
    <div className="al-page">
      <header className="al-head">
        <div>
          <h2>Payments</h2>
          <p>Every course payment, from M-Pesa prompts to bank transfers. Confirm manual payments here; automatic ones confirm themselves.</p>
        </div>
        <div className="al-head-actions">
          <button type="button" className="al-btn" onClick={exportCsv} disabled={!rows.length}><Download size={16} aria-hidden="true" /> Export CSV</button>
          <button type="button" className="al-icon-btn" onClick={() => void load()} aria-label="Refresh"><RefreshCw size={16} /></button>
        </div>
      </header>

      {setupNeeded ? <div className="al-setup"><strong>One database step is needed.</strong> Run <code>supabase/security/2026-11-29_phase10_payments.sql</code> in the Supabase SQL editor, then refresh.</div> : null}

      <section className="al-kpis">
        {[
          ["Revenue (30 days)", kes(summary?.revenue), `${summary?.paid_count ?? 0} payments`],
          ["To confirm", summary?.to_confirm ?? "—", "Manual references waiting"],
          ["Pending over 1 hour", summary?.pending_over_1h ?? "—", "Prompts or checkouts not finished"],
          ["Failed or expired", summary?.failed ?? "—", "Last 30 days"],
          ["Refunded", kes(summary?.refunded), "Last 30 days"],
          ["Top method", summary?.by_method?.[0] ? METHOD[summary.by_method[0].provider] || summary.by_method[0].provider : "—", summary?.by_method?.[0] ? kes(summary.by_method[0].amount) : ""],
        ].map(([label, value, sub]) => (
          <div key={label} className="al-card al-kpi"><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>
        ))}
      </section>

      <div className="al-filters">
        <label className="al-search"><Search size={16} aria-hidden="true" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search learner, email, reference or receipt" aria-label="Search payments" />
        </label>
      </div>
      <div className="al-pills" role="tablist">
        {STATUS_TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={status === key} className={`al-pill${status === key ? " active" : ""}`} onClick={() => { setStatus(key); setPage(0) }}>
            {label} <span>{counts[key] ?? 0}</span>
          </button>
        ))}
      </div>

      {error ? <p role="alert" className="al-alert">{error}</p> : null}
      {notice ? <p role="status" className="al-alert ok">{notice}</p> : null}

      <div className="al-card al-table-card">
        <div className="al-table-wrap">
          <table className="al-table">
            <thead><tr><th>Learner</th><th>Course</th><th>Method</th><th>Amount</th><th>Status</th><th>Reference</th><th /></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="al-empty-cell">Loading payments…</td></tr>
                : rows.length === 0 ? <tr><td colSpan={7} className="al-empty-cell">No payments match.</td></tr>
                  : rows.map((r) => (
                    <tr key={r.payment_id} style={{ cursor: "default" }}>
                      <td><strong>{r.full_name || "Learner"}</strong><span className="al-sub">{r.email}</span></td>
                      <td>{r.course_title}<span className="al-sub">{when(r.paid_at || r.created_at)}</span></td>
                      <td>{METHOD[r.provider] || r.provider}{r.phone ? <span className="al-sub">{r.phone}</span> : null}</td>
                      <td>{kes(r.amount_kes)}{Number(r.discount_kes) > 0 ? <span className="al-sub">−{kes(r.discount_kes)} {r.coupon_code}</span> : null}</td>
                      <td><span className={`al-badge ${BADGE[r.status] || ""}`}>{STATUS_LABEL[r.status] || r.status}</span>{r.failure_reason && r.status !== "paid" ? <span className="al-sub">{r.failure_reason}</span> : null}</td>
                      <td>{r.provider_reference || "—"}{r.receipt_no ? <span className="al-sub">{r.receipt_no}</span> : null}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {r.status === "to_confirm" || r.status === "pending" ? <button type="button" className="al-btn primary" onClick={() => void act(r, "confirm")}>Confirm</button> : null}
                        {r.status === "pending" || r.status === "to_confirm" ? <button type="button" className="al-btn" style={{ marginLeft: 6 }} onClick={() => void act(r, "cancel")}>Cancel</button> : null}
                        {r.status === "paid" ? <button type="button" className="al-btn danger" onClick={() => void act(r, "refund")}>Refund</button> : null}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <div className="al-table-foot">
          <span>Showing {rows.length ? page * PAGE + 1 : 0}–{page * PAGE + rows.length} of {total}</span>
          <div>
            <button type="button" className="al-btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button type="button" className="al-btn" disabled={(page + 1) * PAGE >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      </div>

      <div className="al-row-2 even">
        <section className="al-card al-block">
          <div className="al-block-head"><h3>Revenue by method (30 days)</h3></div>
          {(summary?.by_method || []).length === 0 ? <p className="al-empty-cell">No paid payments yet.</p> : (
            <ul className="al-quiz-list">{summary.by_method.map((m) => <li key={m.provider}><div><strong>{METHOD[m.provider] || m.provider}</strong><span className="al-sub">{m.count} payments</span></div><strong>{kes(m.amount)}</strong></li>)}</ul>
          )}
        </section>
        <section className="al-card al-block">
          <div className="al-block-head"><h3>Revenue by course (30 days)</h3></div>
          {(summary?.by_course || []).length === 0 ? <p className="al-empty-cell">No paid payments yet.</p> : (
            <ul className="al-quiz-list">{summary.by_course.map((c) => <li key={c.title}><div><strong>{c.title}</strong><span className="al-sub">{c.count} payments</span></div><strong>{kes(c.amount)}</strong></li>)}</ul>
          )}
        </section>
      </div>

      {!setupNeeded ? <AdminPaymentMethods /> : null}
    </div>
  )
}

export function AdminCouponsTab() {
  const empty = { code: "", kind: "percent", value: "", course_id: "", max_uses: "", expires_at: "", note: "" }
  const [rows, setRows] = useState([])
  const [courses, setCourses] = useState([])
  const [form, setForm] = useState(empty)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [setupNeeded, setSetupNeeded] = useState(false)

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from("coupons").select("*, courses(title)").order("created_at", { ascending: false })
    if (e) { if (missingSql(e) || /coupons/.test(e.message || "")) setSetupNeeded(true); else setError(friendlyError(e, "We could not load coupons.")); return }
    setRows(data || [])
  }, [])

  useEffect(() => {
    void load()
    supabase.from("courses").select("id, title").order("title").then(({ data }) => setCourses(data || []))
  }, [load])

  async function create(event) {
    event.preventDefault()
    setError(""); setMessage("")
    const code = form.code.trim().toUpperCase().replace(/\s+/g, "")
    const { error: e } = await supabase.from("coupons").insert({
      code, kind: form.kind, value: Number(form.value), course_id: form.course_id || null,
      max_uses: form.max_uses ? Number(form.max_uses) : null, expires_at: form.expires_at ? new Date(`${form.expires_at}T23:59:59`).toISOString() : null,
      note: form.note || null,
    })
    if (e) { setError(/duplicate|unique/i.test(e.message) ? "A coupon with that code already exists." : /check/i.test(e.message) ? "Use 3–40 letters, numbers, dashes or underscores; percent coupons go up to 100." : friendlyError(e, "We could not create the coupon.")); return }
    setMessage(`Coupon ${code} created.`); setForm(empty); void load()
  }

  async function toggle(row) {
    const { error: e } = await supabase.from("coupons").update({ active: !row.active }).eq("code", row.code)
    if (e) setError(friendlyError(e, "We could not update the coupon.")); else void load()
  }

  return (
    <div className="al-page">
      <header className="al-head">
        <div><h2>Coupons</h2><p>Discount codes for a course or the whole site. A 100% coupon enrols the learner straight away.</p></div>
      </header>
      {setupNeeded ? <div className="al-setup"><strong>One database step is needed.</strong> Run <code>supabase/security/2026-11-29_phase10_payments.sql</code>, then refresh.</div> : null}
      <form className="al-card al-block" onSubmit={create}>
        <div className="al-block-head"><h3>New coupon</h3></div>
        <div className="al-grid4">
          <label className="al-field"><span>Code</span><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. PHARMA20" required /></label>
          <label className="al-field"><span>Type</span><select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}><option value="percent">Percent off</option><option value="fixed">KES off</option></select></label>
          <label className="al-field"><span>{form.kind === "percent" ? "Percent" : "Amount (KES)"}</span><input type="number" min="1" max={form.kind === "percent" ? 100 : undefined} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required /></label>
          <label className="al-field"><span>Course</span><select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}><option value="">All courses</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
          <label className="al-field"><span>Max uses (optional)</span><input type="number" min="1" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} /></label>
          <label className="al-field"><span>Expires (optional)</span><input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></label>
          <label className="al-field al-span2"><span>Note (optional)</span><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. PSK conference sponsorship" /></label>
        </div>
        {error ? <p role="alert" className="al-alert">{error}</p> : null}
        {message ? <p role="status" className="al-alert ok">{message}</p> : null}
        <div><button type="submit" className="al-btn primary" disabled={setupNeeded}>Create coupon</button></div>
      </form>
      <div className="al-card al-table-card">
        <div className="al-table-wrap">
          <table className="al-table">
            <thead><tr><th>Code</th><th>Discount</th><th>Course</th><th>Used</th><th>Expires</th><th>Status</th><th /></tr></thead>
            <tbody>
              {rows.length === 0 ? <tr><td colSpan={7} className="al-empty-cell">No coupons yet.</td></tr> : rows.map((r) => (
                <tr key={r.code} style={{ cursor: "default" }}>
                  <td><strong>{r.code}</strong>{r.note ? <span className="al-sub">{r.note}</span> : null}</td>
                  <td>{r.kind === "percent" ? `${Number(r.value)}%` : kes(r.value)}</td>
                  <td>{r.courses?.title || "All courses"}</td>
                  <td>{r.used_count}{r.max_uses ? ` / ${r.max_uses}` : ""}</td>
                  <td>{r.expires_at ? new Date(r.expires_at).toLocaleDateString("en-KE") : "Never"}</td>
                  <td><span className={`al-badge ${r.active ? "active" : "revoked"}`}>{r.active ? "Active" : "Off"}</span></td>
                  <td><button type="button" className="al-btn" onClick={() => void toggle(r)}>{r.active ? "Turn off" : "Turn on"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
