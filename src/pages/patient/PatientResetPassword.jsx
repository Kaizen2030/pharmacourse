import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import SEO from "../../components/SEO"
import PatientAuthShell from "../../components/PatientAuthShell"
import { pharmacyosClient } from "../../lib/pharmacyosClient"
import { buildPatientRouteUrl } from "../../lib/patientPortalRoutes"

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

export default function PatientResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")
  const [recoveryEmail, setRecoveryEmail] = useState("")

  const loginPath = useMemo(() => buildPatientRouteUrl("/patient/login", searchParams), [searchParams])
  const forgotPasswordPath = useMemo(() => buildPatientRouteUrl("/patient/forgot-password", searchParams), [searchParams])

  useEffect(() => {
    let mounted = true

    async function prepareRecoverySession() {
      setChecking(true)
      setError("")

      try {
        const { accessToken, refreshToken, hashType, code, queryType } = getRecoveryParams()

        let session = null

        if (accessToken && refreshToken && hashType === "recovery") {
          const { data, error: sessionError } = await pharmacyosClient.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (sessionError) throw sessionError
          session = data.session
        } else if (code) {
          const { data, error: exchangeError } = await pharmacyosClient.auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
          session = data.session
        } else {
          const { data, error: sessionError } = await pharmacyosClient.auth.getSession()
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
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search.replace(/([?&])(code|type)=[^&]*&?/g, "$1").replace(/[?&]$/, ""))
        } else if (session?.user && !hasRecoveryContext) {
          setRecoveryEmail(session.user.email || "")
          setReady(true)
        } else {
          setReady(false)
        }
      } catch (recoveryError) {
        console.error("Patient password recovery setup failed:", recoveryError)
        if (!mounted) return
        setReady(false)
        setError(recoveryError?.message || "Unable to validate your patient reset link.")
      } finally {
        if (mounted) setChecking(false)
      }
    }

    void prepareRecoverySession()

    const {
      data: { subscription },
    } = pharmacyosClient.auth.onAuthStateChange((event, session) => {
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

    const { error: updateError } = await pharmacyosClient.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message || "We could not update your patient password.")
      setLoading(false)
      return
    }

    await pharmacyosClient.auth.signOut()
    const successSeparator = loginPath.includes("?") ? "&" : "?"
    navigate(`${loginPath}${successSeparator}reset=success${recoveryEmail ? `&email=${encodeURIComponent(recoveryEmail)}` : ""}`)
  }

  return (
    <>
      <SEO
        title="Patient Reset Password"
        description="Choose a new password for your RemedacarePOS patient portal account."
        path="/patient/reset-password"
        noindex
      />

      <PatientAuthShell
        badge="Secure password reset"
        title={checking ? "Preparing your reset link" : ready ? "Choose a new password" : "Reset link expired"}
        description={
          checking
            ? "Checking your secure patient reset link."
            : ready
              ? recoveryEmail
                ? `Set a new patient portal password for ${recoveryEmail}.`
                : "Set a new patient portal password."
              : error || "This reset link is invalid or has expired. Request a new one to continue."
        }
      >
        <section className="patient-card">
          {checking ? (
            <div className="patient-form-help">Checking your secure reset link...</div>
          ) : null}

          {!checking && !ready ? (
            <div className="patient-empty-state">
              <Link to={forgotPasswordPath} className="patient-button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                Request new reset link
              </Link>
            </div>
          ) : null}

          {!checking && ready ? (
            <form className="patient-form" onSubmit={handleSubmit}>
              <div className="patient-form-group">
                <label className="patient-label" htmlFor="patient-reset-password">
                  New password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="patient-reset-password"
                    className="patient-input"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter new password"
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

              <div className="patient-form-group">
                <label className="patient-label" htmlFor="patient-reset-confirm">
                  Confirm password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="patient-reset-confirm"
                    className="patient-input"
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    placeholder="Repeat new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((current) => !current)}
                    style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", color: "#5f746b", fontWeight: 800, cursor: "pointer" }}
                  >
                    {showConfirm ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {error ? <div className="patient-message patient-message-error">{error}</div> : null}

              <button className="patient-button" type="submit" disabled={loading}>
                {loading ? "Updating password..." : "Save new password"}
              </button>
            </form>
          ) : null}
        </section>
      </PatientAuthShell>
    </>
  )
}
