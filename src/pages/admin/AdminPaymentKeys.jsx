import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, ExternalLink, Lock } from "lucide-react"
import { supabase } from "../../lib/supabaseClient"
import { useAuth } from "../../context/AuthContext"
import { friendlyError } from "../../lib/friendlyError"
import { confirmDialog } from "../../lib/dialog"

// Paste provider keys. They are saved encrypted (Supabase Vault) and never shown again: only "saved ••••1234".
const KEY_FIELDS = {
  mpesa_stk: [
    { name: "consumer_key", label: "Consumer key", help: "Daraja portal › My Apps › your app" },
    { name: "consumer_secret", label: "Consumer secret", help: "Shown next to the consumer key" },
    { name: "passkey", label: "Passkey (Lipa na M-Pesa Online)", help: "Sent by Safaricom when Lipa na M-Pesa Online is activated. The sandbox passkey is on the Daraja test page." },
  ],
  paystack: [
    { name: "secret_key", label: "Secret key", help: "Paystack › Settings › API Keys & Webhooks. Starts with sk_test_ or sk_live_." },
  ],
}

export default function AdminPaymentKeys({ provider, label, health }) {
  const { isSuperAdmin } = useAuth()
  const [status, setStatus] = useState({})
  const [values, setValues] = useState({ env: "sandbox", transaction_type: "CustomerPayBillOnline", shortcode: "" })
  const [show, setShow] = useState({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const webhook = `${String(import.meta.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "")}/functions/v1/payments-paystack`

  const loadStatus = useCallback(async () => {
    const { data } = await supabase.from("payment_secret_status").select("name, hint, updated_at").eq("provider", provider)
    const byName = Object.fromEntries((data || []).map((r) => [r.name, r]))
    setStatus(byName)
    if (provider === "mpesa_stk") {
      setValues((v) => ({
        ...v,
        env: byName.env?.hint || v.env,
        transaction_type: byName.transaction_type?.hint || v.transaction_type,
        shortcode: v.shortcode || byName.shortcode?.hint || "",
      }))
    }
  }, [provider])
  useEffect(() => { void loadStatus() }, [loadStatus])

  async function save(event) {
    event.preventDefault()
    setBusy(true); setMsg(""); setError("")
    const payload = Object.fromEntries(Object.entries(values).filter(([k, v]) => String(v || "").trim() !== "" && (provider === "mpesa_stk" || k === "secret_key")))
    const { error: e } = await supabase.rpc("admin_set_payment_keys", { p_provider: provider, p_values: payload })
    setBusy(false)
    if (e) {
      setError(/admin_set_payment_keys|does not exist|schema cache/i.test(e.message || "")
        ? "One database step is needed: run supabase/security/2026-12-03_phase10c_payment_keys_vault.sql."
        : friendlyError(e, "We could not save the keys."))
      return
    }
    setValues((v) => ({ env: v.env, transaction_type: v.transaction_type, shortcode: v.shortcode }))
    setMsg("Keys saved securely. They are encrypted and cannot be viewed again.")
    void loadStatus()
  }

  async function clear() {
    if (!(await confirmDialog({ title: `Remove ${label} keys?`, message: "The keys are deleted and this method is switched off.", confirmLabel: "Remove keys", danger: true }))) return
    const { error: e } = await supabase.rpc("admin_clear_payment_keys", { p_provider: provider })
    if (e) setError(friendlyError(e, "We could not remove the keys."))
    else { setMsg("Keys removed."); setStatus({}) }
  }

  const fields = KEY_FIELDS[provider] || []
  const anySaved = Object.keys(status).length > 0
  const till = values.transaction_type === "CustomerBuyGoodsOnline"
  const live = values.env === "production"

  return (
    <form className="pm-server" onSubmit={save}>
      <div className={`pm-server-state ${health?.configured ? "ok" : "no"}`}>
        {health?.configured ? <><CheckCircle2 size={18} aria-hidden="true" /> Connected{health.env ? ` (${health.env})` : ""}. You can switch {label} on.</>
          : health?.reachable === false ? <>The payment server is not set up yet. See “One-time server setup” below.</>
            : anySaved ? <>Keys saved, but some are still missing.</> : <>Paste your keys below to connect {label}.</>}
      </div>

      {!isSuperAdmin ? <p className="al-muted">Only a super admin can save payment keys.</p> : null}

      {provider === "mpesa_stk" ? (
        <>
          <div className="al-grid2">
            <div className="al-field"><span>Mode</span>
              <div className="al-seg pm-seg">
                <button type="button" className={!live ? "active" : ""} onClick={() => setValues((v) => ({ ...v, env: "sandbox" }))}>Test (sandbox)</button>
                <button type="button" className={live ? "active" : ""} onClick={() => setValues((v) => ({ ...v, env: "production" }))}>Live</button>
              </div>
            </div>
            <div className="al-field"><span>Account type</span>
              <div className="al-seg pm-seg">
                <button type="button" className={!till ? "active" : ""} onClick={() => setValues((v) => ({ ...v, transaction_type: "CustomerPayBillOnline" }))}>Paybill</button>
                <button type="button" className={till ? "active" : ""} onClick={() => setValues((v) => ({ ...v, transaction_type: "CustomerBuyGoodsOnline" }))}>Till</button>
              </div>
            </div>
          </div>
          <label className="al-field"><span>{till ? "Till number (shortcode)" : "Paybill number (shortcode)"}</span>
            <input inputMode="numeric" value={values.shortcode || ""} onChange={(e) => setValues((v) => ({ ...v, shortcode: e.target.value.replace(/\D/g, "").slice(0, 7) }))} placeholder={live ? "e.g. 247247" : "Sandbox: 174379"} />
          </label>
        </>
      ) : null}

      {fields.map((f) => (
        <label key={f.name} className="al-field">
          <span>{f.label} {status[f.name] ? <em className="pm-saved">Saved {status[f.name].hint}</em> : null}</span>
          <div className="pm-secret">
            <input type={show[f.name] ? "text" : "password"} autoComplete="off" spellCheck={false} value={values[f.name] || ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              placeholder={status[f.name] ? "Leave empty to keep the saved key" : "Paste here"} />
            <button type="button" onClick={() => setShow((s) => ({ ...s, [f.name]: !s[f.name] }))}>{show[f.name] ? "Hide" : "Show"}</button>
          </div>
          <small>{f.help}</small>
        </label>
      ))}

      {provider === "paystack" ? (
        <div className="al-field"><span>Webhook URL (paste into Paystack › Settings › API Keys & Webhooks)</span>
          <div className="pm-secret">
            <input readOnly value={webhook} onFocus={(e) => e.target.select()} aria-label="Webhook URL" />
            <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(webhook); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ } }}>{copied ? "Copied" : "Copy"}</button>
          </div>
        </div>
      ) : <p className="al-muted small">The secure callback link Safaricom uses is created for you automatically.</p>}

      {error ? <p role="alert" className="al-alert">{error}</p> : null}
      {msg ? <p role="status" className="al-alert ok">{msg}</p> : null}
      <div className="pm-key-actions">
        <button type="submit" className="al-btn primary" disabled={busy || !isSuperAdmin}>{busy ? "Saving…" : "Save keys securely"}</button>
        {anySaved && isSuperAdmin ? <button type="button" className="al-btn danger" onClick={() => void clear()}>Remove keys</button> : null}
      </div>
      <p className="al-muted small pm-lock"><Lock size={12} aria-hidden="true" /> Encrypted in Supabase Vault. Never shown again, never sent to visitors; only the payment server can use them.</p>

      <details className="pm-more">
        <summary>Where do I get these?</summary>
        {provider === "mpesa_stk" ? (
          <ol className="pm-steps">
            <li>Sign in at <a href="https://developer.safaricom.co.ke" target="_blank" rel="noreferrer">developer.safaricom.co.ke <ExternalLink size={12} /></a>, create an app with “Lipa na M-Pesa Sandbox”, and copy its consumer key and secret.</li>
            <li>Test first in Test mode with shortcode 174379 and the sandbox passkey from the Daraja test page.</li>
            <li>For real payments, use “Go Live” in Daraja with your Paybill or Till. Safaricom emails the live passkey. Switch Mode to Live and paste the live keys.</li>
          </ol>
        ) : (
          <ol className="pm-steps">
            <li>Create a Paystack business account for Kenya at <a href="https://paystack.com" target="_blank" rel="noreferrer">paystack.com <ExternalLink size={12} /></a>.</li>
            <li>Paste the test secret key first and make a test payment. When your business is approved, paste the live key (sk_live_…).</li>
            <li>Copy the webhook URL above into Paystack so payments confirm even if the learner closes the page.</li>
          </ol>
        )}
      </details>

      {health?.reachable === false ? (
        <details className="pm-more" open>
          <summary>One-time server setup (about 3 minutes)</summary>
          <ol className="pm-steps">
            <li>At <a href="https://supabase.com/dashboard/account/tokens" target="_blank" rel="noreferrer">supabase.com › Account › Access tokens <ExternalLink size={12} /></a>, click “Generate new token” and copy it.</li>
            <li>On GitHub, open the pharmacourse repo › Settings › Secrets and variables › Actions › New repository secret. Name <code>SUPABASE_ACCESS_TOKEN</code>, value: the token.</li>
            <li>GitHub › Actions › “Deploy Supabase functions” › Run workflow. Later updates deploy by themselves.</li>
          </ol>
        </details>
      ) : null}
    </form>
  )
}
