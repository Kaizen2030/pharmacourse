import { useCallback, useEffect, useState } from "react"
import { ArrowDown, ArrowUp, Building2, CheckCircle2, Copy, CreditCard, ExternalLink, MessageCircle, Settings2, Smartphone, X } from "lucide-react"
import { supabase } from "../../lib/supabaseClient"
import { friendlyError } from "../../lib/friendlyError"
import { confirmDialog } from "../../lib/dialog"
import { REFERENCE_RULES, buildInstructions, missingDetails, paymentRows, summary } from "../../lib/paymentMethods"
import "./admin-payment-methods.css"

const ICON = { mpesa_stk: Smartphone, paystack: CreditCard, mpesa_manual: Smartphone, bank_transfer: Building2, whatsapp: MessageCircle }
const KIND = {
  mpesa_stk: "Automatic · M-Pesa prompt on the learner's phone",
  paystack: "Automatic · cards and more through Paystack",
  mpesa_manual: "Manual · learner pays your Paybill or Till, you confirm the code",
  bank_transfer: "Manual · learner pays by bank, you confirm the reference",
  whatsapp: "Manual · learner chats with you on WhatsApp",
}
const SERVER_FN = { mpesa_stk: "payments-mpesa", paystack: "payments-paystack" }

async function serverHealth(key) {
  try {
    const { data, error } = await supabase.functions.invoke(SERVER_FN[key], { body: { action: "health" } })
    if (error) return { configured: false, reachable: false }
    return { configured: Boolean(data?.configured), env: data?.env, reachable: true }
  } catch { return { configured: false, reachable: false } }
}

export default function AdminPaymentMethods() {
  const [rows, setRows] = useState([])
  const [health, setHealth] = useState({})
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from("payment_providers").select("*").order("display_order")
    if (e) { setError(friendlyError(e, "We could not load payment methods.")); return }
    setRows((data || []).map((r) => ({ ...r, details: r.details || {} })))
  }, [])

  useEffect(() => {
    void load()
    Promise.all(["mpesa_stk", "paystack"].map(async (k) => [k, await serverHealth(k)])).then((pairs) => setHealth(Object.fromEntries(pairs)))
  }, [load])

  function readiness(r) {
    if (SERVER_FN[r.key]) return health[r.key]?.configured ? [] : ["Server keys"]
    return missingDetails(r.key, r.details)
  }

  async function toggle(r) {
    setError(""); setNotice("")
    if (!r.enabled) {
      const missing = readiness(r)
      if (missing.length) {
        if (SERVER_FN[r.key]) {
          const ok = await confirmDialog({ title: `${r.label} is not connected yet`, message: "The payment server keys are not set, so learners would see an error. Switch it on anyway?", confirmLabel: "Switch on anyway", danger: true })
          if (!ok) return
        } else {
          setEditing(r); setError(`Add the ${missing.join(", ").toLowerCase()} before switching ${r.label} on.`); return
        }
      }
    }
    const { error: e } = await supabase.from("payment_providers").update({ enabled: !r.enabled, updated_at: new Date().toISOString() }).eq("key", r.key)
    if (e) { setError(friendlyError(e, "That change could not be saved.")); return }
    setNotice(`${r.label} is now ${r.enabled ? "off" : "on"} for learners.`); void load()
  }

  async function move(r, dir) {
    const i = rows.findIndex((x) => x.key === r.key)
    const j = i + dir
    if (j < 0 || j >= rows.length) return
    const a = rows[i], b = rows[j]
    await Promise.all([
      supabase.from("payment_providers").update({ display_order: b.display_order }).eq("key", a.key),
      supabase.from("payment_providers").update({ display_order: a.display_order }).eq("key", b.key),
    ])
    void load()
  }

  return (
    <section className="al-card al-block">
      <div className="al-block-head">
        <div>
          <h3>Payment methods</h3>
          <p className="al-muted">Set up each method once, then switch it on. Learners see the ones that are on, in this order.</p>
        </div>
      </div>
      {error ? <p role="alert" className="al-alert">{error}</p> : null}
      {notice ? <p role="status" className="al-alert ok">{notice}</p> : null}

      <ul className="pm-list">
        {rows.map((r, i) => {
          const Icon = ICON[r.key] || CreditCard
          const missing = readiness(r)
          const state = r.enabled ? (missing.length ? "warn" : "on") : missing.length ? "setup" : "off"
          const text = SERVER_FN[r.key]
            ? (health[r.key] === undefined ? "Checking server…" : health[r.key].configured ? `Server connected${health[r.key].env ? ` · ${health[r.key].env}` : ""}` : "Server keys not set")
            : summary(r.key, r.details) || "Not set up yet"
          return (
            <li key={r.key} className={`pm-row ${state}`}>
              <span className="pm-icon"><Icon size={20} aria-hidden="true" /></span>
              <div className="pm-main">
                <div className="pm-title">
                  <strong>{r.label}</strong>
                  <span className={`pm-pill ${state}`}>{{ on: "On", off: "Off", setup: "Needs setup", warn: "On · needs setup" }[state]}</span>
                </div>
                <span className="pm-kind">{KIND[r.key]}</span>
                <span className="pm-summary">{text}</span>
              </div>
              <div className="pm-actions">
                <div className="pm-order">
                  <button type="button" onClick={() => void move(r, -1)} disabled={i === 0} aria-label={`Move ${r.label} up`}><ArrowUp size={14} /></button>
                  <button type="button" onClick={() => void move(r, 1)} disabled={i === rows.length - 1} aria-label={`Move ${r.label} down`}><ArrowDown size={14} /></button>
                </div>
                <button type="button" className="al-btn" onClick={() => { setError(""); setEditing(r) }}><Settings2 size={15} aria-hidden="true" /> {missing.length && !SERVER_FN[r.key] ? "Set up" : "Edit"}</button>
                <label className="al-switch" title={r.enabled ? "Switch off" : "Switch on"}>
                  <input type="checkbox" checked={r.enabled} onChange={() => void toggle(r)} aria-label={`${r.label} on or off`} />
                  <span aria-hidden="true" />
                </label>
              </div>
            </li>
          )
        })}
      </ul>

      {editing ? (
        <MethodEditor
          row={rows.find((x) => x.key === editing.key) || editing}
          health={health[editing.key]}
          onClose={() => setEditing(null)}
          onSaved={(label) => { setEditing(null); setNotice(`${label} saved.`); void load() }}
        />
      ) : null}
    </section>
  )
}

function MethodEditor({ row, health, onClose, onSaved }) {
  const [label, setLabel] = useState(row.label || "")
  const [description, setDescription] = useState(row.description || "")
  const [d, setD] = useState({ kind: "paybill", reference_rule: "email", ...(row.details || {}) })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const set = (patch) => setD((cur) => ({ ...cur, ...patch }))
  const manual = !SERVER_FN[row.key]
  const missing = manual ? missingDetails(row.key, d) : []
  const preview = manual ? paymentRows(row.key, d, { email: "amina@example.com", phone: "0712 345 678" }) : []

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  async function save(event) {
    event.preventDefault()
    setError("")
    if (!label.trim()) { setError("Give the method a name learners will recognise."); return }
    if (row.enabled && missing.length) { setError(`This method is on, so these are required: ${missing.join(", ")}.`); return }
    setBusy(true)
    const clean = Object.fromEntries(Object.entries(d).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]).filter(([, v]) => v !== "" && v != null))
    const { error: e } = await supabase.from("payment_providers").update({
      label: label.trim(), description: description.trim() || null,
      ...(manual ? { details: clean, instructions: buildInstructions(row.key, clean) || null } : {}),
      updated_at: new Date().toISOString(),
    }).eq("key", row.key)
    setBusy(false)
    if (e) { setError(friendlyError(e, "We could not save this method.")); return }
    onSaved(label.trim())
  }

  return (
    <div className="pm-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <form className="pm-modal" onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="pm-title">
        <div className="pm-modal-head">
          <div><p className="pm-eyebrow">Payment method</p><h3 id="pm-title">{row.label}</h3></div>
          <button type="button" className="al-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="pm-modal-body">
          <div className="pm-form">
            {row.key === "mpesa_manual" ? (
              <>
                <div className="al-field"><span>Type of M-Pesa account</span>
                  <div className="al-seg pm-seg">
                    <button type="button" className={d.kind !== "till" ? "active" : ""} onClick={() => set({ kind: "paybill" })}>Paybill</button>
                    <button type="button" className={d.kind === "till" ? "active" : ""} onClick={() => set({ kind: "till" })}>Till (Buy Goods)</button>
                  </div>
                </div>
                <label className="al-field"><span>{d.kind === "till" ? "Till number" : "Paybill business number"}</span>
                  <input inputMode="numeric" value={d.business_number || ""} onChange={(e) => set({ business_number: e.target.value.replace(/\D/g, "").slice(0, 7) })} placeholder={d.kind === "till" ? "e.g. 5123456" : "e.g. 247247"} />
                  <small>The number learners type in M-Pesa.</small>
                </label>
                {d.kind !== "till" ? (
                  <label className="al-field"><span>Account number learners should enter</span>
                    <select value={d.reference_rule || "email"} onChange={(e) => set({ reference_rule: e.target.value })}>
                      {Object.entries(REFERENCE_RULES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <small>Using the learner's email makes each payment easy to match in your M-Pesa statement.</small>
                  </label>
                ) : null}
                {d.kind !== "till" && d.reference_rule === "fixed" ? (
                  <label className="al-field"><span>Account number text</span><input value={d.reference_text || ""} onChange={(e) => set({ reference_text: e.target.value })} placeholder="e.g. PHARMACOURSE" maxLength={40} /></label>
                ) : null}
                <label className="al-field"><span>Business name (as shown on the M-Pesa confirmation)</span>
                  <input value={d.business_name || ""} onChange={(e) => set({ business_name: e.target.value })} placeholder="e.g. PHARMACOURSE LTD" maxLength={60} />
                  <small>Learners check this before entering their PIN, so it should match exactly.</small>
                </label>
              </>
            ) : null}

            {row.key === "bank_transfer" ? (
              <>
                <div className="al-grid2">
                  <label className="al-field"><span>Bank name</span><input value={d.bank_name || ""} onChange={(e) => set({ bank_name: e.target.value })} placeholder="e.g. Equity Bank" maxLength={60} /></label>
                  <label className="al-field"><span>Branch (optional)</span><input value={d.branch || ""} onChange={(e) => set({ branch: e.target.value })} placeholder="e.g. Westlands" maxLength={60} /></label>
                </div>
                <label className="al-field"><span>Account name</span><input value={d.account_name || ""} onChange={(e) => set({ account_name: e.target.value })} placeholder="e.g. Pharmacourse Limited" maxLength={80} /></label>
                <div className="al-grid2">
                  <label className="al-field"><span>Account number</span><input value={d.account_number || ""} onChange={(e) => set({ account_number: e.target.value })} placeholder="e.g. 0123456789012" maxLength={30} /></label>
                  <label className="al-field"><span>SWIFT code (optional)</span><input value={d.swift || ""} onChange={(e) => set({ swift: e.target.value.toUpperCase() })} placeholder="For payments from abroad" maxLength={11} /></label>
                </div>
                <label className="al-field"><span>Payment reference learners should use</span>
                  <select value={d.reference_rule || "email"} onChange={(e) => set({ reference_rule: e.target.value })}>
                    {Object.entries(REFERENCE_RULES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                {d.reference_rule === "fixed" ? <label className="al-field"><span>Reference text</span><input value={d.reference_text || ""} onChange={(e) => set({ reference_text: e.target.value })} maxLength={40} /></label> : null}
              </>
            ) : null}

            {row.key === "whatsapp" ? (
              <label className="al-field"><span>WhatsApp number learners message (optional)</span>
                <input type="tel" value={d.whatsapp_number || ""} onChange={(e) => set({ whatsapp_number: e.target.value })} placeholder="e.g. 0712 345 678" maxLength={20} />
                <small>Leave empty to use the site's support number. Learners get a ready-made message with the course name, amount and a payment ID.</small>
              </label>
            ) : null}

            {manual ? (
              <label className="al-field"><span>Extra note for learners (optional)</span>
                <textarea rows={2} value={d.note || ""} onChange={(e) => set({ note: e.target.value })} maxLength={300} placeholder="e.g. Confirmations are done Monday to Saturday, 8am to 6pm." />
              </label>
            ) : null}

            {!manual ? (
              <div className="pm-server">
                <div className={`pm-server-state ${health?.configured ? "ok" : "no"}`}>
                  {health?.configured ? <><CheckCircle2 size={18} aria-hidden="true" /> Server connected{health.env ? ` (${health.env})` : ""}. You can switch this method on.</>
                    : health?.reachable === false ? <>The payment server for {row.label} is not deployed yet.</> : <>The server keys are not set yet.</>}
                </div>
                <p className="pm-step-title">How to connect {row.key === "mpesa_stk" ? "M-Pesa prompts" : "Paystack"}</p>
                <ol className="pm-steps">
                  {row.key === "mpesa_stk" ? (
                    <>
                      <li>Create an app at <a href="https://developer.safaricom.co.ke" target="_blank" rel="noreferrer">developer.safaricom.co.ke <ExternalLink size={12} /></a> and copy the consumer key and secret.</li>
                      <li>Ask Safaricom for <strong>Lipa na M-Pesa Online</strong> on your Paybill or Till to get the passkey.</li>
                      <li>Give the keys to your developer to add as server secrets and deploy <code>payments-mpesa</code> (steps in <code>docs/payments-setup.md</code>).</li>
                      <li>Come back here: this box turns green, then switch the method on.</li>
                    </>
                  ) : (
                    <>
                      <li>Create a Paystack business account for Kenya at <a href="https://paystack.com" target="_blank" rel="noreferrer">paystack.com <ExternalLink size={12} /></a>.</li>
                      <li>In Paystack settings, copy the secret key and set the webhook URL your developer gives you.</li>
                      <li>Your developer adds the key as a server secret and deploys <code>payments-paystack</code> (steps in <code>docs/payments-setup.md</code>).</li>
                      <li>Come back here: this box turns green, then switch the method on.</li>
                    </>
                  )}
                </ol>
                <p className="al-muted small">Keys are never entered on this page; they stay on the payment server so nobody can copy them from the website.</p>
              </div>
            ) : null}

            <details className="pm-more">
              <summary>Name and description shown to learners</summary>
              <label className="al-field"><span>Name</span><input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} /></label>
              <label className="al-field"><span>Short description</span><input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={120} /></label>
            </details>
          </div>

          {manual ? (
            <aside className="pm-preview" aria-label="What learners see">
              <p className="pm-eyebrow">What learners see at checkout</p>
              <div className="pm-preview-card">
                <strong>Pay KES 2,000</strong>
                {preview.length ? (
                  <dl>
                    {preview.map((p) => (
                      <div key={p.label}><dt>{p.label}</dt><dd>{p.value || <em>not set</em>}{p.copy && p.value ? <Copy size={13} aria-hidden="true" /> : null}</dd></div>
                    ))}
                  </dl>
                ) : <p className="al-muted">Fill in the details to see the preview.</p>}
                {d.note ? <p className="pm-note">{d.note}</p> : null}
                <span className="pm-fake-input">{row.key === "bank_transfer" ? "Bank reference" : "M-Pesa code"} · e.g. SGH7KL22PQ</span>
              </div>
              {missing.length ? <p className="pm-missing">Still needed: {missing.join(", ")}</p> : <p className="pm-ready"><CheckCircle2 size={15} aria-hidden="true" /> Ready to switch on</p>}
            </aside>
          ) : null}
        </div>

        {error ? <p role="alert" className="al-alert" style={{ margin: "0 1.4rem" }}>{error}</p> : null}
        <div className="pm-modal-foot">
          <button type="button" className="al-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="al-btn primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </div>
  )
}
