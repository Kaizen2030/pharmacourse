import { useCallback, useEffect, useState } from "react"
import { ShieldCheck } from "lucide-react"
import { supabase } from "../lib/supabaseClient"

// Two-step verification for admin pages (Supabase MFA, authenticator app / TOTP).
// - Admin without an authenticator yet: set one up (scan a QR code once, enter the 6-digit code).
// - Admin with one: enter the 6-digit code once per new sign-in on this device.
// The database enforces the same thing: admin powers need a session that passed this check
// (supabase/security/2026-11-27_phase5_admin_mfa.sql).
export default function AdminMfaGate({ children }) {
  const [stage, setStage] = useState("checking") // checking | ok | challenge | enroll | error
  const [factorId, setFactorId] = useState("")
  const [qr, setQr] = useState("")
  const [secret, setSecret] = useState("")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  const startEnrolment = useCallback(async () => {
    // Remove half-finished set-ups from earlier attempts, then start a fresh one.
    const { data: factors } = await supabase.auth.mfa.listFactors()
    for (const factor of factors?.all || []) {
      if (factor.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: factor.id })
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Pharmacourse admin ${new Date().toISOString().slice(0, 10)}` })
    if (error) throw error
    setFactorId(data.id)
    setQr(data.totp?.qr_code || "")
    setSecret(data.totp?.secret || "")
    setStage("enroll")
  }, [])

  const check = useCallback(async () => {
    try {
      const { data: level, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (error) throw error
      if (level?.currentLevel === "aal2") { setStage("ok"); return }
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
      if (listError) throw listError
      const verified = (factors?.totp || []).find((factor) => factor.status === "verified")
      if (verified) {
        setFactorId(verified.id)
        setStage("challenge")
      } else {
        await startEnrolment()
      }
    } catch (error) {
      console.error("Admin verification check failed:", error)
      setMessage("Two-step verification could not start. Refresh the page and try again.")
      setStage("error")
    }
  }, [startEnrolment])

  useEffect(() => { check() }, [check])

  async function verify(event) {
    event.preventDefault()
    const digits = code.replace(/\D/g, "")
    if (digits.length !== 6) { setMessage("Enter the 6-digit code from your authenticator app."); return }
    setBusy(true)
    setMessage("")
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: digits })
    setBusy(false)
    if (error) {
      setMessage("That code is not right, or it has expired. Codes change every 30 seconds; try the current one.")
      setCode("")
      return
    }
    setCode("")
    setStage("ok")
  }

  if (stage === "ok") return children
  if (stage === "checking") return <div className="route-loading" role="status" aria-live="polite"><span className="route-loading-bar" />Checking admin access…</div>

  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ maxWidth: 460 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.75rem" }}>
          <span style={{ width: 52, height: 52, borderRadius: 16, display: "grid", placeItems: "center", background: "var(--green-light)", color: "var(--green)" }}>
            <ShieldCheck size={26} aria-hidden="true" />
          </span>
        </div>

        {stage === "error" ? (
          <>
            <h1>Admin verification</h1>
            <p>{message}</p>
            <button type="button" className="btn btn-primary form-submit" onClick={() => { setStage("checking"); check() }}>Try again</button>
          </>
        ) : (
          <form onSubmit={verify}>
            {stage === "enroll" ? (
              <>
                <h1>Protect your admin account</h1>
                <p>Admin pages need two-step verification. Scan this code with an authenticator app (Google Authenticator, Microsoft Authenticator, Authy or 1Password), then enter the 6-digit code it shows.</p>
                {qr ? <img src={qr} alt="QR code for your authenticator app" width={190} height={190} style={{ display: "block", margin: "0.5rem auto 0.75rem", background: "#fff", borderRadius: 12, padding: 8, border: "1px solid var(--border)" }} /> : null}
                {secret ? (
                  <p style={{ fontSize: "0.82rem", textAlign: "center", wordBreak: "break-all" }}>
                    Can't scan? Enter this key in the app: <code style={{ fontWeight: 700 }}>{secret}</code>
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <h1>Enter your verification code</h1>
                <p>Open your authenticator app and enter the 6-digit code for Pharmacourse.</p>
              </>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="admin-mfa-code">6-digit code</label>
              <input
                id="admin-mfa-code"
                className="form-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/[^\d ]/g, ""))}
                style={{ letterSpacing: "0.3em", textAlign: "center", fontSize: "1.2rem" }}
                autoFocus
                required
              />
            </div>
            {message ? <p className="error-msg" role="alert" style={{ marginBottom: "1rem" }}>{message}</p> : null}
            <button type="submit" className="btn btn-primary form-submit" disabled={busy}>{busy ? "Checking…" : stage === "enroll" ? "Turn on two-step verification" : "Verify"}</button>
            {stage === "challenge" ? (
              <p style={{ fontSize: "0.82rem", marginTop: "1rem", textAlign: "center" }}>
                Lost your phone? Ask another super admin, or remove the old authenticator in Supabase (see docs/admin-two-step.md), then set up a new one.
              </p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  )
}
