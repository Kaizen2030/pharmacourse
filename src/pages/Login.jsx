import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { getAuthRedirectUrl } from "../lib/authRedirect"
import SEO from "../components/SEO"
import AuthAside, { GoogleIcon } from "../components/AuthAside"
import TurnstileWidget from "../components/TurnstileWidget"
import { friendlyAuthError } from "../lib/passwordPolicy"

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const emailFromQuery = searchParams.get("email") || ""
  const resetStatus = searchParams.get("reset")
  const [email, setEmail] = useState(emailFromQuery)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [captchaToken, setCaptchaToken] = useState("")
  const [captchaReset, setCaptchaReset] = useState(0)
  const [info] = useState(() =>
    resetStatus === "success" ? "Password updated. Sign in with your email and new password." : ""
  )

  async function handleLogin(event) {
    event.preventDefault()
    setError("")
    setLoading(true)

    if (!captchaToken) {
      setError("Please complete the security check.")
      setLoading(false)
      return
    }

    const { error: err } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } })

    if (err) {
      setError(friendlyAuthError(err, "We could not sign you in. Please try again."))
      setLoading(false)
      // A captcha token works once: get a fresh one for the next try.
      setCaptchaToken("")
      setCaptchaReset((count) => count + 1)
      return
    }

    navigate("/dashboard")
  }

  async function handleGoogle() {
    setError("")
    setGoogleLoading(true)

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: getAuthRedirectUrl("/complete-profile?next=/dashboard") },
    })

    if (oauthError) {
      setError(friendlyAuthError(oauthError, "Google sign-in is not available right now. Use your email and password."))
      setGoogleLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <SEO
        title="Sign In"
        description="Sign in to your Pharmacourse account to continue learning and manage your courses."
        path="/login"
        noindex
      />

      <AuthAside />
      <div className="auth-card">
        <div className="auth-logo">Pharmacourse</div>
        <h1>Welcome back</h1>
        <p>Sign in to continue your learning</p>

        <button onClick={handleGoogle} className="btn-google" type="button" disabled={googleLoading || loading}>
          <GoogleIcon /> {googleLoading ? "Connecting to Google..." : "Continue with Google"}
        </button>

        <p className="auth-note">
          Google users will confirm their certificate name on the next step before entering the dashboard.
        </p>

        <div className="auth-divider"><span>or</span></div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email</label>
            <input id="login-email" autoComplete="email" className="form-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <div className="auth-field-password">
              <input
                id="login-password"
                autoComplete="current-password"
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
                className="auth-toggle-password"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="auth-row-end">
            <Link to="/forgot-password" className="auth-link">
              Forgot password?
            </Link>
          </div>

          {info && (
            <p className="auth-info">
              {info}
            </p>
          )}

          <TurnstileWidget formId="login" resetSignal={captchaReset} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken("")} />

          {error && <p className="error-msg" style={{ marginBottom: "1rem" }}>{error}</p>}

          <button type="submit" disabled={loading || !captchaToken} className="btn btn-primary form-submit">
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
