import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, Download, MessageCircle, Plus, RefreshCw, Search, X } from "lucide-react"
import { supabase } from "../../lib/supabaseClient"
import { friendlyError } from "../../lib/friendlyError"
import { confirmDialog } from "../../lib/dialog"
import "./admin-learning.css"

const PAGE = 25
const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "awaiting", label: "Awaiting payment" },
  { key: "active", label: "Active" },
  { key: "expired", label: "Expired" },
  { key: "revoked", label: "Revoked" },
]
const STATUS_LABEL = { active: "Active", awaiting: "Awaiting payment", revoked: "Revoked", expired: "Expired" }
const PAYMENT_LABEL = { paid: "Paid", free: "Free", awaiting: "Awaiting", waived: "Waived", refunded: "Refunded" }
const METHODS = ["M-Pesa", "Bank transfer", "Card", "Cash", "Invoice", "Other"]

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) : "Not set")
const fmtKes = (v) => (v == null ? "" : `KES ${Number(v).toLocaleString("en-KE")}`)
const toDateInput = (v) => (v ? new Date(v).toISOString().slice(0, 10) : "")
const expiryFromChoice = (choice, custom) => {
  if (choice === "none") return null
  if (choice === "custom") return custom ? new Date(`${custom}T23:59:59`).toISOString() : null
  const d = new Date(); d.setDate(d.getDate() + Number(choice)); return d.toISOString()
}
const waNumber = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "")
  if (!digits) return ""
  return digits.startsWith("0") ? `254${digits.slice(1)}` : digits
}
const missingSql = (error) => /admin_(list_enrolments|enrol_learner|learner_detail|update_enrolment)|function .* does not exist|schema cache/i.test(String(error?.message || ""))

function csvEscape(value) {
  const s = String(value ?? "")
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default function AdminEnrolmentsTab() {
  const [courses, setCourses] = useState([])
  const [rows, setRows] = useState([])
  const [counts, setCounts] = useState({})
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const [course, setCourse] = useState("")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [setupNeeded, setSetupNeeded] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [showEnrol, setShowEnrol] = useState(false)
  const [learnerId, setLearnerId] = useState(null)

  useEffect(() => {
    supabase.from("courses").select("id, title, price, is_free").order("title").then(({ data }) => setCourses(data || []))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true); setError("")
    const { data, error: rpcError } = await supabase.rpc("admin_list_enrolments", {
      p_search: query || null, p_course: course || null, p_status: status, p_limit: PAGE, p_offset: page * PAGE,
    })
    if (rpcError) {
      if (missingSql(rpcError)) setSetupNeeded(true)
      else setError(friendlyError(rpcError, "We could not load enrolments."))
      setRows([]); setLoading(false); return
    }
    setSetupNeeded(false)
    setRows(data || [])
    setTotal(Number(data?.[0]?.total_count || 0))
    if (data?.[0]?.counts) setCounts(data[0].counts)
    else if (!data?.length && status === "all") setCounts({ all: 0 })
    setLoading(false)
  }, [query, course, status, page])

  useEffect(() => { void load() }, [load])

  const selected = rows.find((r) => r.enrolment_id === selectedId) || null

  function exportCsv() {
    const header = ["Learner", "Email", "Phone", "Course", "Status", "Payment", "Method", "Reference", "Amount KES", "Enrolled", "Access ends", "Progress %"]
    const lines = rows.map((r) => [r.full_name, r.email, r.phone, r.course_title, STATUS_LABEL[r.status] || r.status, PAYMENT_LABEL[r.payment_status] || r.payment_status,
      r.payment_method, r.payment_reference, r.amount_kes, fmtDate(r.enrolled_at), r.access_expires_at ? fmtDate(r.access_expires_at) : "", r.progress_pct].map(csvEscape).join(","))
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" })
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `enrolments-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(a.href)
  }

  if (learnerId) return <LearnerDetail userId={learnerId} onBack={() => setLearnerId(null)} />

  return (
    <div className="al-page">
      <header className="al-head">
        <div>
          <h2>Enrolments</h2>
          <p>Grant, activate or revoke learner access. Paid learners wait here until their payment is confirmed.</p>
        </div>
        <div className="al-head-actions">
          <button type="button" className="al-btn" onClick={exportCsv} disabled={!rows.length}><Download size={16} aria-hidden="true" /> Export CSV</button>
          <button type="button" className="al-btn primary" onClick={() => setShowEnrol(true)} disabled={setupNeeded}><Plus size={16} aria-hidden="true" /> Enrol learner</button>
        </div>
      </header>

      {setupNeeded ? (
        <div className="al-setup">
          <strong>One database step is needed.</strong> Run <code>supabase/security/2026-11-28_phase9_enrolments.sql</code> in the Supabase SQL editor
          (project nnjiutikutsjvggakvvv), then refresh this page.
        </div>
      ) : null}

      <div className="al-filters">
        <label className="al-search">
          <Search size={16} aria-hidden="true" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or phone" aria-label="Search learners" />
        </label>
        <select value={course} onChange={(e) => { setCourse(e.target.value); setPage(0) }} aria-label="Filter by course">
          <option value="">All courses</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <button type="button" className="al-icon-btn" onClick={() => void load()} aria-label="Refresh"><RefreshCw size={16} /></button>
      </div>

      <div className="al-pills" role="tablist" aria-label="Filter by status">
        {STATUS_TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={status === t.key} className={`al-pill${status === t.key ? " active" : ""}`}
            onClick={() => { setStatus(t.key); setPage(0); setSelectedId(null) }}>
            {t.label} <span>{counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {error ? <p role="alert" className="al-alert">{error}</p> : null}

      <div className={`al-split${selected ? " with-panel" : ""}`}>
        <div className="al-card al-table-card">
          <div className="al-table-wrap">
            <table className="al-table">
              <thead><tr><th>Learner</th><th>Course</th><th>Status</th><th>Payment</th><th>Progress</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="al-empty-cell">Loading enrolments…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5} className="al-empty-cell">{setupNeeded ? "Enrolments appear here after the database step." : "No enrolments match these filters."}</td></tr>
                ) : rows.map((r) => (
                  <tr key={r.enrolment_id} className={selectedId === r.enrolment_id ? "selected" : ""} onClick={() => setSelectedId(r.enrolment_id)}>
                    <td>
                      <button type="button" className="al-learner" onClick={(e) => { e.stopPropagation(); setLearnerId(r.user_id) }}>{r.full_name || "Unnamed learner"}</button>
                      <span className="al-sub">{r.email}</span>
                    </td>
                    <td>{r.course_title}</td>
                    <td><span className={`al-badge ${r.status}`}>{STATUS_LABEL[r.status] || r.status}</span></td>
                    <td>{PAYMENT_LABEL[r.payment_status] || "—"}{r.amount_kes ? <span className="al-sub">{fmtKes(r.amount_kes)}</span> : null}</td>
                    <td>
                      <div className="al-progress"><span style={{ width: `${r.progress_pct || 0}%` }} /></div>
                      <span className="al-progress-num">{r.progress_pct || 0}%</span>
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

        {selected ? (
          <EnrolmentPanel
            key={selected.enrolment_id}
            row={selected}
            onClose={() => setSelectedId(null)}
            onOpenLearner={() => setLearnerId(selected.user_id)}
            onChanged={() => void load()}
          />
        ) : null}
      </div>

      {showEnrol ? <EnrolModal courses={courses} onClose={() => setShowEnrol(false)} onDone={() => { setShowEnrol(false); void load() }} /> : null}
    </div>
  )
}

function EnrolmentPanel({ row, onClose, onOpenLearner, onChanged }) {
  const [expiry, setExpiry] = useState(row.access_expires_at ? "custom" : "none")
  const [customDate, setCustomDate] = useState(toDateInput(row.access_expires_at))
  const [note, setNote] = useState(row.admin_note || "")
  const [method, setMethod] = useState(row.payment_method || "M-Pesa")
  const [reference, setReference] = useState(row.payment_reference || "")
  const [amount, setAmount] = useState(row.amount_kes ?? "")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function run(action, extra = {}, done = "Saved.") {
    setBusy(true); setError(""); setMessage("")
    const { error: rpcError } = await supabase.rpc("admin_update_enrolment", {
      p_enrolment: row.enrolment_id, p_action: action, p_expires: extra.expires ?? null, p_note: extra.note ?? null,
      p_method: extra.method ?? null, p_reference: extra.reference ?? null, p_amount: extra.amount ?? null,
    })
    setBusy(false)
    if (rpcError) { setError(friendlyError(rpcError, "That change could not be saved.")); return }
    setMessage(done); onChanged()
  }

  const wa = waNumber(row.phone)
  return (
    <aside className="al-card al-panel" aria-label={`Enrolment for ${row.full_name}`}>
      <button type="button" className="al-panel-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
      <button type="button" className="al-panel-name" onClick={onOpenLearner}>{row.full_name || "Unnamed learner"}</button>
      <p className="al-sub">{[row.email, row.phone].filter(Boolean).join(" · ")}</p>

      <dl className="al-facts">
        <div><dt>Course</dt><dd>{row.course_title}</dd></div>
        <div><dt>Status</dt><dd><span className={`al-badge ${row.status}`}>{STATUS_LABEL[row.status]}</span></dd></div>
        <div><dt>Payment</dt><dd>{PAYMENT_LABEL[row.payment_status] || "—"}{row.amount_kes ? ` · ${fmtKes(row.amount_kes)}` : ""}</dd></div>
        <div><dt>Method</dt><dd>{row.payment_method || "—"}{row.payment_reference ? ` · ${row.payment_reference}` : ""}</dd></div>
        <div><dt>Enrolled</dt><dd>{fmtDate(row.enrolled_at)}</dd></div>
        <div><dt>Access ends</dt><dd>{row.access_expires_at ? fmtDate(row.access_expires_at) : "Not set"}</dd></div>
      </dl>

      {row.status === "awaiting" ? (
        <div className="al-panel-block">
          <h4>Confirm payment</h4>
          <div className="al-grid2">
            <label className="al-field"><span>Method</span>
              <select value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
            </label>
            <label className="al-field"><span>Amount (KES)</span>
              <input type="number" min="0" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
          </div>
          <label className="al-field"><span>Payment reference</span>
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. M-Pesa code" />
          </label>
          <button type="button" className="al-btn primary wide" disabled={busy}
            onClick={() => void run("confirm_payment", { method, reference, amount: amount === "" ? null : Number(amount), note }, "Payment confirmed. The learner can open the course now.")}>
            Confirm payment and activate access
          </button>
        </div>
      ) : null}

      <div className="al-panel-block">
        <label className="al-field"><span>Access expiry</span>
          <select value={expiry} onChange={(e) => setExpiry(e.target.value)}>
            <option value="none">No expiry</option>
            <option value="30">30 days from today</option>
            <option value="90">90 days from today</option>
            <option value="365">1 year from today</option>
            <option value="custom">Pick a date</option>
          </select>
        </label>
        {expiry === "custom" ? <label className="al-field"><span>Ends on</span><input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} /></label> : null}
        <button type="button" className="al-btn wide" disabled={busy} onClick={() => void run("set_expiry", { expires: expiryFromChoice(expiry, customDate) }, "Access expiry saved.")}>Save expiry</button>
      </div>

      <div className="al-panel-block">
        <label className="al-field"><span>Internal note</span>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Bank transfer, ref on file" />
        </label>
        <button type="button" className="al-btn wide" disabled={busy} onClick={() => void run("note", { note }, "Note saved.")}>Save note</button>
      </div>

      <div className="al-panel-actions">
        {wa ? (
          <a className="al-btn wide" href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi ${row.full_name?.split(" ")[0] || ""}, this is Pharmacourse about your ${row.course_title} enrolment.`)}`} target="_blank" rel="noreferrer noopener">
            <MessageCircle size={16} aria-hidden="true" /> Message learner on WhatsApp
          </a>
        ) : null}
        {row.status === "revoked" ? (
          <button type="button" className="al-btn wide" disabled={busy} onClick={() => void run("restore", {}, "Access restored.")}>Restore access</button>
        ) : (
          <div className="al-grid2">
            <button type="button" className="al-btn danger" disabled={busy} onClick={async () => {
              if (await confirmDialog({ title: "Revoke access?", message: `${row.full_name} will lose access to ${row.course_title}. Progress is kept.`, confirmLabel: "Revoke", danger: true })) void run("revoke", { note }, "Access revoked.")
            }}>Revoke</button>
            {row.payment_status === "paid" ? (
              <button type="button" className="al-btn danger" disabled={busy} onClick={async () => {
                if (await confirmDialog({ title: "Mark as refunded?", message: "Access is revoked and the payment is marked refunded.", confirmLabel: "Mark refunded", danger: true })) void run("refund", { note }, "Marked as refunded.")
              }}>Refund</button>
            ) : null}
          </div>
        )}
      </div>

      {error ? <p role="alert" className="al-alert">{error}</p> : null}
      {message ? <p role="status" className="al-alert ok">{message}</p> : null}
      <p className="al-foot-note">Every change is written to the audit log with your name and the time.</p>
    </aside>
  )
}

function EnrolModal({ courses, onClose, onDone }) {
  const [mode, setMode] = useState("single")
  const [learner, setLearner] = useState("")
  const [courseId, setCourseId] = useState(courses[0]?.id || "")
  const [access, setAccess] = useState("paid")
  const [method, setMethod] = useState("M-Pesa")
  const [reference, setReference] = useState("")
  const [amount, setAmount] = useState("")
  const [expiry, setExpiry] = useState("none")
  const [customDate, setCustomDate] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const course = courses.find((c) => c.id === courseId)
  useEffect(() => {
    if (course && amount === "" && !course.is_free && Number(course.price) > 0) setAmount(String(course.price))
  }, [course, amount])
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  async function submit(event) {
    event.preventDefault()
    setBusy(true); setError("")
    const { error: rpcError } = await supabase.rpc("admin_enrol_learner", {
      p_learner: learner, p_course: courseId, p_access: access,
      p_method: access === "paid" || access === "awaiting" ? method : null,
      p_reference: access === "paid" ? reference : null,
      p_amount: access === "paid" && amount !== "" ? Number(amount) : null,
      p_expires: expiryFromChoice(expiry, customDate), p_note: note,
    })
    setBusy(false)
    if (rpcError) { setError(friendlyError(rpcError, "We could not enrol this learner.")); return }
    onDone()
  }

  return (
    <div className="al-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <form className="al-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="enrol-title">
        <div className="al-modal-head">
          <h3 id="enrol-title">Enrol learner</h3>
          <button type="button" className="al-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="al-pills" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "single"} className={`al-pill${mode === "single" ? " active" : ""}`} onClick={() => setMode("single")}>Single learner</button>
          <button type="button" role="tab" aria-selected={mode === "bulk"} className={`al-pill${mode === "bulk" ? " active" : ""}`} onClick={() => setMode("bulk")}>Bulk CSV</button>
        </div>
        {mode === "bulk" ? <BulkEnrol courses={courses} onClose={onClose} onDone={onDone} /> : (<>
        <label className="al-field"><span>Learner email or phone</span>
          <input value={learner} onChange={(e) => setLearner(e.target.value)} placeholder="Registered learner's email or phone" required autoFocus />
          <small>The learner needs a Pharmacourse account first.</small>
        </label>
        <label className="al-field"><span>Course</span>
          <select value={courseId} onChange={(e) => { setCourseId(e.target.value); setAmount("") }} required>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}{c.is_free || !Number(c.price) ? " (free)" : ` (KES ${Number(c.price).toLocaleString("en-KE")})`}</option>)}
          </select>
        </label>
        <div className="al-grid2">
          <label className="al-field"><span>How is access being granted?</span>
            <select value={access} onChange={(e) => setAccess(e.target.value)}>
              <option value="paid">Payment received (manual)</option>
              <option value="awaiting">Awaiting payment (no access yet)</option>
              <option value="waived">Free access (waived)</option>
              <option value="free">Free course</option>
            </select>
          </label>
          {access === "paid" || access === "awaiting" ? (
            <label className="al-field"><span>Payment method</span>
              <select value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
            </label>
          ) : <span />}
        </div>
        {access === "paid" ? (
          <div className="al-grid2">
            <label className="al-field"><span>Payment reference</span><input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. M-Pesa code" /></label>
            <label className="al-field"><span>Amount (KES)</span><input type="number" min="0" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
          </div>
        ) : null}
        <div className="al-grid2">
          <label className="al-field"><span>Access expiry</span>
            <select value={expiry} onChange={(e) => setExpiry(e.target.value)}>
              <option value="none">No expiry</option><option value="30">30 days</option><option value="90">90 days</option><option value="365">1 year</option><option value="custom">Pick a date</option>
            </select>
          </label>
          {expiry === "custom" ? <label className="al-field"><span>Ends on</span><input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} /></label> : <span />}
        </div>
        <label className="al-field"><span>Internal note (optional)</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Only admins see this" /></label>
        {error ? <p role="alert" className="al-alert">{error}</p> : null}
        <div className="al-modal-foot">
          <button type="button" className="al-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="al-btn primary" disabled={busy || !learner.trim() || !courseId}>{busy ? "Enrolling…" : "Enrol learner"}</button>
        </div>
        </>)}
      </form>
    </div>
  )
}

// Bulk: one email or phone per line, or a CSV whose first column holds them (a header row is skipped).
function BulkEnrol({ courses, onClose, onDone }) {
  const [courseId, setCourseId] = useState(courses[0]?.id || "")
  const [access, setAccess] = useState("waived")
  const [text, setText] = useState("")
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)

  const entries = [...new Set(text.split(/\r?\n/).map((line) => line.split(/[,;\t]/)[0].trim().replace(/^"|"$/g, "")).filter((v) => v && !/^(email|phone|learner)/i.test(v)))]

  async function readFile(file) {
    if (!file) return
    if (file.size > 500000) { setResults([{ who: file.name, ok: false, note: "File is too large (max 500 KB)." }]); return }
    setText(await file.text())
  }

  async function run() {
    setBusy(true); setResults([])
    const out = []
    for (const who of entries.slice(0, 500)) {
      const { error } = await supabase.rpc("admin_enrol_learner", { p_learner: who, p_course: courseId, p_access: access, p_method: null, p_reference: null, p_amount: null, p_expires: null, p_note: "Bulk enrolment" })
      out.push({ who, ok: !error, note: error ? friendlyError(error, "Could not enrol.") : "Enrolled" })
      setResults([...out])
    }
    setBusy(false)
  }

  const done = results.length > 0 && !busy
  const okCount = results.filter((r) => r.ok).length
  return (
    <div className="al-bulk">
      <div className="al-grid2">
        <label className="al-field"><span>Course</span>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
        </label>
        <label className="al-field"><span>Access</span>
          <select value={access} onChange={(e) => setAccess(e.target.value)}>
            <option value="waived">Free access (sponsored or waived)</option>
            <option value="paid">Paid (invoice or team purchase)</option>
            <option value="awaiting">Awaiting payment</option>
          </select>
        </label>
      </div>
      <label className="al-field"><span>Learner emails or phones</span>
        <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={"amina@example.com\n0712345678\n..."} />
        <small>One per line, or upload a CSV with emails or phones in the first column. Learners need an account first. Max 500 per run.</small>
      </label>
      <input type="file" accept=".csv,text/csv,text/plain" onChange={(e) => void readFile(e.target.files?.[0])} aria-label="Upload CSV" />
      {results.length ? (
        <div className="al-bulk-results" aria-live="polite">
          <p><strong>{okCount}</strong> of {results.length} enrolled{busy ? "…" : "."}</p>
          <ul>{results.map((r, i) => <li key={i} className={r.ok ? "ok" : "bad"}><span>{r.who}</span><span>{r.ok ? "✓" : r.note}</span></li>)}</ul>
        </div>
      ) : null}
      <div className="al-modal-foot">
        <button type="button" className="al-btn" onClick={done ? onDone : onClose}>{done ? "Done" : "Cancel"}</button>
        <button type="button" className="al-btn primary" disabled={busy || !entries.length || !courseId} onClick={() => void run()}>{busy ? "Enrolling…" : `Enrol ${entries.length || ""} learner${entries.length === 1 ? "" : "s"}`}</button>
      </div>
    </div>
  )
}

const DETAIL_TABS = ["Payments", "Progress", "Quizzes", "Certificates", "Audit log"]

function LearnerDetail({ userId, onBack }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState("")
  const [tab, setTab] = useState("Payments")

  useEffect(() => {
    let active = true
    supabase.rpc("admin_learner_detail", { p_user: userId }).then(({ data: d, error: e }) => {
      if (!active) return
      if (e) setError(friendlyError(e, "We could not load this learner."))
      else setData(d)
    })
    return () => { active = false }
  }, [userId])

  const p = data?.profile
  return (
    <div className="al-page">
      <button type="button" className="al-back" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" /> Back to enrolments</button>
      {error ? <p role="alert" className="al-alert">{error}</p> : null}
      {!data && !error ? <p className="al-sub">Loading learner…</p> : null}
      {p ? (
        <>
          <section className="al-card al-learner-head">
            <span className="al-avatar" aria-hidden="true">{(p.full_name || p.email || "?").split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("")}</span>
            <div>
              <h2>{p.full_name || "Unnamed learner"}</h2>
              <p className="al-sub">{[p.email, p.phone, p.professional_id ? `ID ${p.professional_id}` : null, `Joined ${fmtDate(p.created_at)}`].filter(Boolean).join(" · ")}</p>
            </div>
          </section>
          <div className="al-pills" role="tablist">
            {DETAIL_TABS.map((t) => <button key={t} type="button" role="tab" aria-selected={tab === t} className={`al-pill${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>{t}</button>)}
          </div>
          <section className="al-card al-list">
            {tab === "Payments" && (data.enrolments.length ? data.enrolments.map((e) => (
              <div key={e.id} className="al-list-row">
                <div><strong>{e.course_title}</strong><span className="al-sub">{[e.payment_method, e.payment_reference, e.admin_note].filter(Boolean).join(" · ") || "No payment details"}</span></div>
                <div className="al-right"><strong>{PAYMENT_LABEL[e.payment_status] || "—"}{e.amount_kes ? ` · ${fmtKes(e.amount_kes)}` : ""}</strong><span className="al-sub">{fmtDate(e.enrolled_at)}</span></div>
              </div>
            )) : <p className="al-empty-cell">No enrolments yet.</p>)}
            {tab === "Progress" && (data.enrolments.length ? data.enrolments.map((e) => {
              const pct = e.total_modules ? Math.round((100 * e.completed_modules) / e.total_modules) : 0
              return (
                <div key={e.id} className="al-list-row">
                  <div><strong>{e.course_title}</strong><span className="al-sub">{e.completed_modules} of {e.total_modules} lessons · last active {e.last_active ? fmtDate(e.last_active) : "never"}</span></div>
                  <div className="al-right al-progress-cell"><div className="al-progress"><span style={{ width: `${pct}%` }} /></div><span className="al-progress-num">{pct}%</span></div>
                </div>
              )
            }) : <p className="al-empty-cell">No progress yet.</p>)}
            {tab === "Quizzes" && (data.quiz_attempts.length ? data.quiz_attempts.map((a, i) => (
              <div key={i} className="al-list-row">
                <div><strong>{a.quiz}</strong><span className="al-sub">{[a.course, a.lesson].filter(Boolean).join(" · ")}</span></div>
                <div className="al-right"><strong className={a.passed ? "al-ok" : "al-bad"}>{a.score ?? "—"}% · {a.passed ? "Passed" : "Not passed"}</strong><span className="al-sub">{fmtDate(a.at)}</span></div>
              </div>
            )) : <p className="al-empty-cell">No quiz attempts yet.</p>)}
            {tab === "Certificates" && (data.certificates.length ? data.certificates.map((c) => (
              <div key={c.id} className="al-list-row">
                <div><strong>{c.course_title}</strong><span className="al-sub">{c.code || c.id}</span></div>
                <div className="al-right"><a href={`/verify/${c.id}`} target="_blank" rel="noreferrer" className="al-link">Verify</a><span className="al-sub">{fmtDate(c.issued)}</span></div>
              </div>
            )) : <p className="al-empty-cell">No certificates yet.</p>)}
            {tab === "Audit log" && (data.audit.length ? data.audit.map((l, i) => (
              <div key={i} className="al-list-row">
                <div><strong>{l.action.replace("enrolment.", "Enrolment: ").replace("_", " ")}</strong><span className="al-sub">by {l.actor || "SQL editor"}</span></div>
                <div className="al-right"><span className="al-sub">{new Date(l.at).toLocaleString("en-KE")}</span></div>
              </div>
            )) : <p className="al-empty-cell">No admin changes recorded for this learner.</p>)}
          </section>
        </>
      ) : null}
    </div>
  )
}
