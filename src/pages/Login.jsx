import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [info, setInfo] = useState("")

  useEffect(() => {
    const emailFromQuery = searchParams.get("email")
    const resetStatus = searchParams.get("reset")

    if (emailFromQuery) {
      setEmail(emailFromQuery)
    }

    if (resetStatus === "success") {
      setInfo("Password updated. Sign in with your email and new password.")
    }
  }, [searchParams])

  async function handleLogin(event) {
    event.preventDefault()
    setError("")
    setLoading(true)

    const { error: err } = await supabase.auth.signInWithPassword({ email, password })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    navigate("/dashboard")
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">PharmaCourse</div>
        <h1>Welcome back</h1>
        <p>Sign in to continue your learning</p>

        <button onClick={handleGoogle} className="btn-google">
          <span>G</span> Continue with Google
        </button>

        <div className="auth-divider"><span>or</span></div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                className="form-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
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

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "-0.25rem", marginBottom: "1rem" }}>
            <Link to="/forgot-password" style={{ color: "#0F6E56", fontSize: ".84rem", fontWeight: 700, textDecoration: "none" }}>
              Forgot password?
            </Link>
          </div>

          {info && (
            <p style={{ marginBottom: "1rem", color: "#0F6E56", background: "#e8f5f0", border: "1px solid #b8dfd3", borderRadius: 10, padding: ".75rem .9rem", fontSize: ".9rem" }}>
              {info}
            </p>
          )}

          {error && <p className="error-msg" style={{ marginBottom: "1rem" }}>{error}</p>}

          <button type="submit" disabled={loading} className="btn btn-primary form-submit">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="auth-footer">
          No account? <Link to="/register">Register free</Link>
        </div>
      </div>
    </div>
  )
}
