import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError(""); setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message); setLoading(false) }
    else navigate("/dashboard")
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/dashboard` } })
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
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input className="form-input" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "12px", background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "var(--text-500)" }} title={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>
          {error && <p className="error-msg" style={{ marginBottom: "1rem" }}>{error}</p>}
          <button type="submit" disabled={loading} className="btn btn-primary form-submit">
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="auth-footer">
          No account? <Link to="/register">Register free</Link>
        </div>
      </div>
    </div>
  )
}
