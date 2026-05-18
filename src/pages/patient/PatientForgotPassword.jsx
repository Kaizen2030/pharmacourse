import { useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import SEO from "../../components/SEO"
import PatientAuthShell from "../../components/PatientAuthShell"
import { getAuthRedirectUrl } from "../../lib/authRedirect"
import { pharmacyosClient } from "../../lib/pharmacyosClient"
import { buildPatientRouteUrl } from "../../lib/patientPortalRoutes"

export default function PatientForgotPassword() {
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)

  const loginPath = useMemo(() => buildPatientRouteUrl("/patient/login", searchParams), [searchParams])
  const resetPasswordPath = useMemo(() => buildPatientRouteUrl("/patient/reset-password", searchParams), [searchParams])

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")
    setLoading(true)

    const { error: resetError } = await pharmacyosClient.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: getAuthRedirectUrl(resetPasswordPath),
    })

    if (resetError) {
      setError(resetError.message || "We could not send your patient reset link.")
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <>
      <SEO
        title="Patient Forgot Password"
        description="Request a secure patient portal password reset link."
        path="/patient/forgot-password"
        noindex
      />

      <PatientAuthShell
        badge="Password recovery"
        title="Reset your patient portal password"
        description="Enter the email linked to your patient portal account and we will send a secure reset link."
      >
        <section className="patient-card">
          {sent ? (
            <div className="patient-empty-state">
              <div className="patient-message patient-message-success">
                A secure password reset link has been sent to <strong>{email}</strong>.
              </div>
              <p className="patient-form-help" style={{ margin: 0 }}>
                Open the email on this device if possible, follow the link, and choose a new password for your patient portal account.
              </p>
              <Link to={loginPath} className="patient-button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                Back to sign in
              </Link>
            </div>
          ) : (
            <form className="patient-form" onSubmit={handleSubmit}>
              <div className="patient-form-group">
                <label className="patient-label" htmlFor="patient-forgot-email">
                  Email address
                </label>
                <input
                  id="patient-forgot-email"
                  className="patient-input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              {error ? <div className="patient-message patient-message-error">{error}</div> : null}

              <button className="patient-button" type="submit" disabled={loading}>
                {loading ? "Sending secure link..." : "Send reset link"}
              </button>
            </form>
          )}

          {!sent ? (
            <div style={{ marginTop: "1rem" }}>
              <Link to={loginPath} style={{ color: "#0f6e56", fontWeight: 800, textDecoration: "none" }}>
                Back to patient sign in
              </Link>
            </div>
          ) : null}
        </section>
      </PatientAuthShell>
    </>
  )
}
