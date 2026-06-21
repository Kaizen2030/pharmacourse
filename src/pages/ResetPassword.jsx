import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import SEO from "../components/SEO"

function getRecoveryParams() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""))
  const queryParams = new URLSearchParams(window.location.search)

  return {
    accessToken: hashParams.get("access_token"),
    refreshToken: hashParams.get("refresh_token"),
    hashType: hashParams.get("type"),
    code: queryParams.get("code"),
    queryType: queryParams.get("type"),
  }
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")
  const [recoveryEmail, setRecoveryEmail] = useState("")

  useEffect(() => {
    let mounted = true

    async function prepareRecoverySession() {
      setChecking(true)
      setError("")

      try {
        const { accessToken, refreshToken, hashType, code, queryType } = getRecoveryParams()

        let session = null

        if (accessToken && refreshToken && hashType === "recovery") {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (sessionError) throw sessionError
          session = data.session
        } else if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
          session = data.session
        } else {
          const { data, error: sessionError } = await supabase.auth.getSession()
          if (sessionError) throw sessionError
          session = data.session
        }

        if (!mounted) return

        const hasRecoveryContext =
          hashType === "recovery" ||
          queryType === "recovery" ||
          window.location.hash.includes("type=recovery")

        if (session?.user && hasRecoveryContext) {
          setRecoveryEmail(session.user.email || "")
          setReady(true)
          window.history.replaceState({}, document.title, window.location.pathname)
        } else if (session?.user && !hasRecoveryContext) {
          setRecoveryEmail(session.user.email || "")
          setReady(true)
        } else {
          setReady(false)
        }
      } catch (recoveryError) {
        console.error("Password recovery setup failed:", recoveryError)
        if (!mounted) return
        setReady(false)
        setError(recoveryError?.message || "Unable to validate your reset link.")
      } finally {
        if (mounted) setChecking(false)
      }
    }

    void prepareRecoverySession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === "PASSWORD_RECOVERY" && session?.user) {
        setRecoveryEmail(session.user.email || "")
        setReady(true)
        setChecking(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")

    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    await supabase.auth.signOut()
    navigate(`/login?reset=success${recoveryEmail ? `&email=${encodeURIComponent(recoveryEmail)}` : ""}`)
  }

  if (checking) {
    return (
      <div className="auth-wrap">
        <SEO
          title="Reset Password"
          description="Reset your RemedacarePOS password securely."
          path="/reset-password"
          noindex
        />
        <div className="auth-card" style={{ textAlign: "center" }}>
          <h1>Preparing password reset</h1>
          <p style={{ color: "var(--text-500)" }}>Checking your secure reset link...</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="auth-wrap">
        <SEO
          title="Reset Password"
          description="Reset your RemedacarePOS password securely."
          path="/reset-password"
          noindex
        />
        <div className="auth-card" style={{ textAlign: "center" }}>
          <h1>Reset link expired</h1>
          <p style={{ color: "var(--text-500)", lineHeight: 1.7 }}>
            {error || "This password reset link is invalid or has expired. Request a new one to continue."}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: "1.5rem" }}
            onClick={() => navigate("/forgot-password")}
          >
            Request New Link
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-wrap">
      <SEO
        title="Reset Password"
        description="Reset your RemedacarePOS password securely."
        path="/reset-password"
        noindex
      />

      <div className="auth-card">
        <div className="auth-logo">RemedacarePOS</div>
        <h1>Set a new password</h1>
        <p>
          {recoveryEmail
            ? `Choose a new password for ${recoveryEmail}.`
            : "Choose a new password for your account."}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                className="form-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: "12px", background: "none", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "var(--text-500)" }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                className="form-input"
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="Repeat new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{ position: "absolute", right: "12px", background: "none", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "var(--text-500)" }}
                title={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && <p className="error-msg" style={{ marginBottom: "1rem" }}>{error}</p>}

          <button type="submit" disabled={loading} className="btn btn-primary form-submit">
            {loading ? "Updating password..." : "Save New Password"}
          </button>
        </form>
      </div>
    </div>
  )
}
