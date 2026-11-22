import { useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { getAuthRedirectUrl } from "../lib/authRedirect"
import SEO from "../components/SEO"
import TurnstileWidget from "../components/TurnstileWidget"
import { friendlyAuthError } from "../lib/passwordPolicy"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)
  const [captchaToken, setCaptchaToken] = useState("")
  const [captchaReset, setCaptchaReset] = useState(0)

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")
    setLoading(true)

    if (!captchaToken) {
      setError("Please complete the security check.")
      setLoading(false)
      return
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthRedirectUrl("/reset-password"),
      captchaToken,
    })

    // Only security-check and rate-limit problems are shown; whether the email has an account is never revealed.
    if (resetError && /captcha|rate limit|too many/i.test(resetError.message || "")) {
      setError(friendlyAuthError(resetError))
      setLoading(false)
      setCaptchaToken("")
      setCaptchaReset((count) => count + 1)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="auth-wrap">
      <SEO
        title="Forgot Password"
        description="Request a secure password reset link for your RemedacarePOS account."
        path="/forgot-password"
        noindex
      />

      <div className="auth-card">
        <div className="auth-logo">Pharmacourse</div>
        <h1>Reset your password</h1>
        <p>Enter your email and we will send you a secure reset link.</p>

        {sent ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "var(--text-500)", lineHeight: 1.7 }}>
              If an account exists for <strong>{email}</strong>, a password reset link is on its way.
              <br />Open the email, follow the link, and choose a new password.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: "1.5rem", display: "inline-flex" }}>
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <TurnstileWidget formId="forgot-password" resetSignal={captchaReset} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken("")} />

            {error && <p className="error-msg" style={{ marginBottom: "1rem" }}>{error}</p>}

            <button type="submit" disabled={loading || !captchaToken} className="btn btn-primary form-submit">
              {loading ? "Sending reset link..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <div className="auth-footer">
          Remembered your password? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
