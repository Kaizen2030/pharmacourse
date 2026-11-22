import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, ExternalLink, Lock } from "lucide-react"
import { supabase } from "../../lib/supabaseClient"
import { useAuth } from "../../context/AuthContext"
import { friendlyError } from "../../lib/friendlyError"
import { confirmDialog } from "../../lib/dialog"
import "./admin-payment-methods.css"

// Paste the auto-posting key. Saved encrypted (Supabase Vault) and never shown again: only "Saved ••••abcd".
const SERVICES = {
  ayrshare: {
    label: "Ayrshare",
    fields: [{ name: "ayrshare_api_key", label: "Ayrshare API key", help: "Ayrshare dashboard › API Key. Copy and paste it here.", secret: true }],
  },
  webhook: {
    label: "Make.com / Zapier (free)",
    fields: [
      { name: "webhook_url", label: "Webhook link", help: "In Make.com: a scenario starting with Webhooks › Custom webhook › Copy address. In Zapier: Webhooks by Zapier › Catch Hook.", secret: false },
      { name: "webhook_secret", label: "Signing secret (optional)", help: "Leave empty and one is created for you.", secret: true },
    ],
  },
}

export default function AdminSocialKeys({ connection, onChanged }) {
  const { isSuperAdmin } = useAuth()
  const [status, setStatus] = useState({})
  const [service, setService] = useState("ayrshare")
  const [values, setValues] = useState({})
  const [show, setShow] = useState({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")
  const [error, setError] = useState("")
  const [needsSql, setNeedsSql] = useState(false)

  const loadStatus = useCallback(async () => {
    const { data, error: e } = await supabase.from("social_secret_status").select("name, hint, updated_at")
    if (e) { setNeedsSql(/social_secret_status|does not exist|schema cache/i.test(e.message || "")); return }
    setNeedsSql(false)
    const byName = Object.fromEntries((data || []).map((r) => [r.name, r]))
    setStatus(byName)
    if (!byName.ayrshare_api_key && byName.webhook_url) setService("webhook")
  }, [])
  useEffect(() => { void loadStatus() }, [loadStatus])

  async function save(event) {
    event.preventDefault()
    setBusy(true); setMsg(""); setError("")
    const allowed = SERVICES[service].fields.map((f) => f.name)
    const payload = Object.fromEntries(Object.entries(values).filter(([k, v]) => allowed.includes(k) && String(v || "").trim() !== ""))
    if (Object.keys(payload).length === 0) { setBusy(false); setError("Paste the key or link first."); return }
    const { error: e } = await supabase.rpc("admin_set_social_keys", { p_values: payload })
    setBusy(false)
    if (e) {
      setError(/admin_set_social_keys|does not exist|schema cache/i.test(e.message || "")
        ? "One database step is needed: run supabase/security/2026-12-04_phase11b_social_keys_vault.sql."
        : friendlyError(e, "We could not save the key."))
      return
    }
    setValues({})
    setMsg("Saved securely. Auto-posting is connected. It is encrypted and cannot be viewed again.")
    await loadStatus()
    onChanged?.()
  }

  async function clear(which) {
    if (!(await confirmDialog({ title: `Disconnect ${SERVICES[which].label}?`, message: "The saved key is deleted. You can paste it again any time.", confirmLabel: "Disconnect", danger: true }))) return
    const { error: e } = await supabase.rpc("admin_clear_social_keys", { p_which: which })
    if (e) { setError(friendlyError(e, "We could not remove the key.")); return }
    setMsg("Disconnected."); await loadStatus(); onChanged?.()
  }

  const saved = { ayrshare: Boolean(status.ayrshare_api_key), webhook: Boolean(status.webhook_url) }
  const on = connection?.state === "on"
  const unreachable = connection?.state === "off" && connection?.reachable === false && (saved.ayrshare || saved.webhook)

  return (
    <section className="al-card al-block">
      <div className="al-block-head"><div><h3>Auto-posting</h3><p className="al-muted">Paste your key once. Posts then go out to your channels by themselves, including scheduled ones.</p></div></div>
      {needsSql ? (
        <div className="al-setup"><strong>One database step is needed.</strong> Run <code>supabase/security/2026-12-04_phase11b_social_keys_vault.sql</code> in the Supabase SQL editor, then refresh.</div>
      ) : (
        <form className="pm-server" onSubmit={save}>
          <div className={`pm-server-state ${on && connection.key_ok !== false ? "ok" : "no"}`}>
            {on && connection.key_ok === false ? <>Ayrshare did not accept the saved key. Paste it again.</>
              : on ? <><CheckCircle2 size={18} aria-hidden="true" /> Connected · {connection.publisher === "ayrshare" ? "Ayrshare" : "Make.com / Zapier"}{connection.linked?.length ? ` · ${connection.linked.length} network${connection.linked.length === 1 ? "" : "s"} linked` : ""}</>
                : unreachable ? <>Key saved. The posting server is not set up yet (see One-time server setup below).</>
                  : <>Not connected. Until you paste a key, use the share buttons on each post.</>}
          </div>

          {!isSuperAdmin ? <p className="al-muted">Only a super admin can save the auto-posting key.</p> : null}

          <div className="al-field"><span>Service</span>
            <div className="al-seg pm-seg">
              {Object.entries(SERVICES).map(([key, s]) => (
                <button key={key} type="button" className={service === key ? "active" : ""} onClick={() => { setService(key); setError(""); setMsg("") }}>
                  {s.label}{saved[key] ? " ✓" : ""}
                </button>
              ))}
            </div>
          </div>

          {SERVICES[service].fields.map((f) => (
            <label key={f.name} className="al-field">
              <span>{f.label} {status[f.name] ? <em className="pm-saved">Saved {status[f.name].hint}</em> : null}</span>
              <div className="pm-secret">
                <input type={f.secret && !show[f.name] ? "password" : "text"} autoComplete="off" spellCheck={false} value={values[f.name] || ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  placeholder={status[f.name] ? "Leave empty to keep the saved value" : f.name === "webhook_url" ? "https://hook.eu1.make.com/…" : "Paste here"} />
                {f.secret ? <button type="button" onClick={() => setShow((s) => ({ ...s, [f.name]: !s[f.name] }))}>{show[f.name] ? "Hide" : "Show"}</button> : null}
              </div>
              <small>{f.help}</small>
            </label>
          ))}

          {error ? <p role="alert" className="al-alert">{error}</p> : null}
          {msg ? <p role="status" className="al-alert ok">{msg}</p> : null}
          <div className="pm-key-actions">
            <button type="submit" className="al-btn primary" disabled={busy || !isSuperAdmin}>{busy ? "Saving…" : "Save securely"}</button>
            {saved[service] && isSuperAdmin ? <button type="button" className="al-btn danger" onClick={() => void clear(service)}>Disconnect</button> : null}
          </div>
          <p className="al-muted small pm-lock"><Lock size={12} aria-hidden="true" /> Encrypted in Supabase Vault. Never shown again, never sent to visitors; only the posting server can use it.</p>
          {saved.ayrshare && saved.webhook ? <p className="al-muted small">Both are saved; Ayrshare is used.</p> : null}

          <details className="pm-more">
            <summary>Where do I get this?</summary>
            {service === "ayrshare" ? (
              <ol className="pm-steps">
                <li>Create an account at <a href="https://www.ayrshare.com" target="_blank" rel="noreferrer">ayrshare.com <ExternalLink size={12} /></a> (choose a plan with the networks you use).</li>
                <li>In Ayrshare, click <strong>Social Accounts</strong> and link your Facebook Page, Instagram, LinkedIn, TikTok, X and YouTube.</li>
                <li>Open <strong>API Key</strong>, copy it, paste it above and click Save securely. Done.</li>
              </ol>
            ) : (
              <ol className="pm-steps">
                <li>At <a href="https://www.make.com" target="_blank" rel="noreferrer">make.com <ExternalLink size={12} /></a> create a scenario. First module: <strong>Webhooks › Custom webhook</strong> › Add › Copy address to clipboard.</li>
                <li>Paste that link above and click Save securely.</li>
                <li>Back in Make, add a module per network (Facebook Pages › Create a post, Instagram for Business, LinkedIn…). Use the <code>text</code> and <code>media_url</code> fields. Turn the scenario on.</li>
              </ol>
            )}
          </details>

          {connection?.reachable === false ? (
            <details className="pm-more" open={unreachable}>
              <summary>One-time server setup (about 3 minutes, once ever)</summary>
              <ol className="pm-steps">
                <li>At <a href="https://supabase.com/dashboard/account/tokens" target="_blank" rel="noreferrer">supabase.com › Account › Access tokens <ExternalLink size={12} /></a>, click “Generate new token” and copy it.</li>
                <li>On GitHub, open the pharmacourse repo › Settings › Secrets and variables › Actions › New repository secret. Name <code>SUPABASE_ACCESS_TOKEN</code>, value: the token.</li>
                <li>GitHub › Actions › “Deploy Supabase functions” › Run workflow. Later updates deploy by themselves. (Already done for payments? Then nothing to do.)</li>
              </ol>
            </details>
          ) : null}
        </form>
      )}
    </section>
  )
}
