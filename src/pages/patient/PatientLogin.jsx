import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import SEO from "../../components/SEO"
import PatientAuthShell from "../../components/PatientAuthShell"
import { pharmacyosClient } from "../../lib/pharmacyosClient"
import { buildPatientRouteUrl } from "../../lib/patientPortalRoutes"

export default function PatientLogin() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [statusMessage, setStatusMessage] = useState("")

  const patientHomePath = useMemo(() => buildPatientRouteUrl("/patient", searchParams), [searchParams])
  const registerPath = useMemo(() => buildPatientRouteUrl("/patient/register", searchParams), [searchParams])
  const forgotPasswordPath = useMemo(() => buildPatientRouteUrl("/patient/forgot-password", searchParams), [searchParams])

  useEffect(() => {
    const resetStatus = searchParams.get("reset")
    const resetEmail = searchParams.get("email")?.trim()

    if (resetStatus === "success") {
      setStatusMessage(
        resetEmail
          ? `Password updated successfully for ${resetEmail}. Sign in with your new password.`
          : "Password updated successfully. Sign in with your new password.",
      )
    }
  }, [searchParams])

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")
    setStatusMessage("")
    setLoading(true)

    const { error: signInError } = await pharmacyosClient.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setError(signInError.message || "We could not sign you in right now.")
      setLoading(false)
      return
    }

    navigate(patientHomePath)
  }

  const footer = (
    <div className="patient-empty-state">
      <div>
        <h2 className="patient-section-title">New to this portal?</h2>
        <p className="patient-form-help">
          Start with your patient profile, then use the same email address your pharmacy has on file for online access.
        </p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.7rem" }}>
        <Link to={registerPath} className="patient-button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          Open patient registration
        </Link>
        <Link to={patientHomePath} className="patient-button-secondary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          Back to portal home
        </Link>
      </div>
    </div>
  )

  return (
    <>
      <SEO
        title="Patient Login"
        description="Sign in to the RemedacarePOS patient portal."
        path="/patient/login"
        noindex
      />

      <PatientAuthShell
        badge="Patient sign in"
        title="Sign in to your patient account"
        description="Use the email and password linked to your patient portal account to continue with prescription requests, bookings, and updates."
        footer={footer}
      >
        <section className="patient-card">
          <form className="patient-form" onSubmit={handleSubmit}>
            <div className="patient-form-group">
              <label className="patient-label" htmlFor="patient-login-email">
                Email address
              </label>
              <input
                id="patient-login-email"
                className="patient-input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="patient-form-group">
              <label className="patient-label" htmlFor="patient-login-password">
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="patient-login-password"
                  className="patient-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", color: "#5f746b", fontWeight: 800, cursor: "pointer" }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {statusMessage ? <div className="patient-message patient-message-success">{statusMessage}</div> : null}
            {error ? <div className="patient-message patient-message-error">{error}</div> : null}

            <button className="patient-button" type="submit" disabled={loading}>
              {loading ? "Signing you in..." : "Sign in"}
            </button>
          </form>

          <div style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "space-between" }}>
            <Link to={forgotPasswordPath} style={{ color: "#0f6e56", fontWeight: 800, textDecoration: "none" }}>
              Forgot your password?
            </Link>
            <Link to={registerPath} style={{ color: "#24463a", fontWeight: 700, textDecoration: "none" }}>
              Need a patient profile first?
            </Link>
          </div>
        </section>
      </PatientAuthShell>
    </>
  )
}
