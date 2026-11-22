import { useEffect, useRef, useState } from "react"
import { pharmacyosClient } from "../lib/pharmacyosClient"
import { PASSWORD_HINT, checkPassword, friendlyAuthError } from "../lib/passwordPolicy"

// Password reset for the desktop apps.
//
// RemedacarePOS: the new password is chosen here, on the website, with the POS Supabase project. Sign-in tokens are
// never passed to the desktop app (a custom remedacarepos:// link can be caught by any other program that registers
// the same scheme). Afterwards the app is opened with the email only, and the person signs in normally.
//
// RemedacareHMS (separate project, not handled by this site): only the one-time token_hash is passed to the app when
// the email provides one. Older emails that carry access/refresh tokens are still forwarded so resets keep working;
// switch the HMS reset email template to token_hash (see docs) and that path is never used.

function readAuthParams() {
  const query = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""))
  const get = (key) => query.get(key) || hash.get(key) || ""
  return {
    tokenHash: get("token_hash"),
    accessToken: get("access_token"),
    refreshToken: get("refresh_token"),
    code: get("code"),
    type: get("type") || "recovery",
    errorDescription: get("error_description"),
  }
}

function clearAddressBar() {
  window.history.replaceState({}, document.title, window.location.pathname)
}

const shell = {
  minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem 1rem",
  background: "var(--bg, #f4f7f5)", fontFamily: "inherit",
}
const card = {
  width: "min(440px, 100%)", background: "#fff", border: "1px solid var(--border, #dfe8e3)", borderRadius: 22,
  padding: "2rem 1.6rem", boxShadow: "0 22px 55px rgba(15, 42, 32, 0.12)", display: "grid", gap: "0.9rem", textAlign: "center",
}

function PosReset() {
  const [stage, setStage] = useState("checking") // checking | form | saving | done | error
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    ;(async () => {
      const params = readAuthParams()
      clearAddressBar() // tokens leave the address bar (and browser history) immediately
      try {
        if (params.errorDescription) throw new Error(params.errorDescription)
        if (params.tokenHash) {
          const { data, error } = await pharmacyosClient.auth.verifyOtp({ token_hash: params.tokenHash, type: "recovery" })
          if (error) throw error
          setEmail(data?.user?.email || "")
        } else if (params.accessToken && params.refreshToken) {
          const { data, error } = await pharmacyosClient.auth.setSession({ access_token: params.accessToken, refresh_token: params.refreshToken })
          if (error) throw error
          if (data?.user?.email || data?.session?.user?.email) setEmail(data.user?.email || data.session.user.email)
        } else {
          throw new Error(params.code
            ? "This reset link was opened on a different device than the one that requested it. Request a new reset email from RemedacarePOS."
            : "This reset link is incomplete. Request a new reset email from RemedacarePOS.")
        }
        setStage("form")
      } catch (error) {
        setMessage(friendlyAuthError(error, error?.message || "This reset link has expired or was already used. Request a new one from RemedacarePOS."))
        setStage("error")
      }
    })()
  }, [])

  async function save(event) {
    event.preventDefault()
    setMessage("")
    if (password !== confirm) { setMessage("The two passwords do not match."); return }
    const problem = checkPassword(password, { email })
    if (problem) { setMessage(problem); return }
    setStage("saving")
    const { error } = await pharmacyosClient.auth.updateUser({ password })
    if (error) {
      setMessage(friendlyAuthError(error, "Your password could not be changed. Request a new reset email."))
      setStage("form")
      return
    }
    await pharmacyosClient.auth.signOut().catch(() => {})
    setStage("done")
  }

  function openApp() {
    window.location.href = email ? `remedacarepos://login?email=${encodeURIComponent(email)}` : "remedacarepos://"
  }

  return (
    <main style={shell}>
      <section style={card} aria-live="polite">
        <div style={{ fontWeight: 800, color: "#0f6e56", fontSize: "1.1rem" }}>RemedacarePOS</div>
        {stage === "checking" ? <p>Checking your reset link…</p> : null}

        {stage === "error" ? (
          <>
            <h1 style={{ fontSize: "1.35rem" }}>Reset link not valid</h1>
            <p style={{ color: "var(--text-500, #607068)" }}>{message}</p>
          </>
        ) : null}

        {stage === "form" || stage === "saving" ? (
          <form onSubmit={save} style={{ display: "grid", gap: "0.75rem", textAlign: "left" }}>
            <h1 style={{ fontSize: "1.35rem", textAlign: "center" }}>Choose a new password</h1>
            {email ? <p style={{ textAlign: "center", color: "var(--text-500, #607068)", margin: 0 }}>for {email}</p> : null}
            <label className="form-label" htmlFor="pos-new-password">New password</label>
            <input id="pos-new-password" className="form-input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <label className="form-label" htmlFor="pos-confirm-password">Repeat the new password</label>
            <input id="pos-confirm-password" className="form-input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            <small style={{ color: "var(--text-500, #607068)" }}>{PASSWORD_HINT}</small>
            {message ? <p className="error-msg" role="alert" style={{ margin: 0 }}>{message}</p> : null}
            <button type="submit" className="btn btn-primary" disabled={stage === "saving"}>{stage === "saving" ? "Saving…" : "Save new password"}</button>
          </form>
        ) : null}

        {stage === "done" ? (
          <>
            <h1 style={{ fontSize: "1.35rem" }}>Password changed</h1>
            <p style={{ color: "var(--text-500, #607068)" }}>Open RemedacarePOS and sign in with your new password.</p>
            <button type="button" className="btn btn-primary" onClick={openApp}>Open RemedacarePOS</button>
          </>
        ) : null}
      </section>
    </main>
  )
}

function HmsHandoff() {
  const [status, setStatus] = useState("opening")
  const linkRef = useRef("")

  useEffect(() => {
    const params = readAuthParams()
    const type = encodeURIComponent(params.type || "recovery")
    linkRef.current = params.tokenHash
      ? `remedacarehms://reset?token_hash=${encodeURIComponent(params.tokenHash)}&type=${type}`
      : `remedacarehms://reset?access_token=${encodeURIComponent(params.accessToken)}&refresh_token=${encodeURIComponent(params.refreshToken)}&type=${type}`
    clearAddressBar()
    const timer = window.setTimeout(() => {
      window.location.href = linkRef.current
      window.setTimeout(() => setStatus("error"), 3000)
    }, 600)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <main style={shell}>
      <section style={card}>
        <div style={{ fontWeight: 800, color: "#0f6e56", fontSize: "1.1rem" }}>RemedacareHMS</div>
        <h1 style={{ fontSize: "1.35rem" }}>{status === "error" ? "App didn't open?" : "Opening RemedacareHMS…"}</h1>
        <p style={{ color: "var(--text-500, #607068)" }}>
          {status === "error" ? "Make sure RemedacareHMS is installed on this computer, then try again." : "You will set your new password in the app."}
        </p>
        {status === "error" ? <button type="button" className="btn btn-primary" onClick={() => { window.location.href = linkRef.current }}>Try opening RemedacareHMS again</button> : null}
      </section>
    </main>
  )
}

export default function ResetRedirect({ app }) {
  return app === "remedacarehms" ? <HmsHandoff /> : <PosReset />
}
