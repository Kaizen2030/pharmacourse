import { createElement, useEffect, useState } from "react"
import { CalendarPlus2, ChevronRight, ClipboardPlus, HeartPulse, IdCard, LogOut, PillBottle } from "lucide-react"
import { Link } from "react-router-dom"
import { usePatient } from "../../components/PatientLayout"
import { usePatientPortalAuth } from "../../hooks/usePatientPortalAuth"
import { clearPatientPortalSession, getPatientPortalSession } from "../../lib/patientPortalSession"

function getInitials(value) {
  return String(value || "")
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "PT"
}

export default function PatientHome() {
  const { branchName, pharmacyId, branchLocation, createPatientPath } = usePatient()
  const [rememberedPatient, setRememberedPatient] = useState(() => getPatientPortalSession(pharmacyId))
  const [feedback, setFeedback] = useState({ type: "", message: "" })
  const [isSigningOut, setIsSigningOut] = useState(false)
  const patientLoginPath = createPatientPath("/patient/login")
  const { isAuthenticated, fullName, patientPhone, signOut } = usePatientPortalAuth()
  const displayName = fullName || rememberedPatient?.fullName || "Patient account"
  const displayPhone = patientPhone || rememberedPatient?.phone || ""
  const hasKnownPatient = Boolean(rememberedPatient || isAuthenticated)
  const patientPortalPath = createPatientPath("/patient-portal")
  const maternalPortalPath = `${patientPortalPath}${patientPortalPath.includes("?") ? "&" : "?"}tab=maternal`

  useEffect(() => {
    setRememberedPatient(getPatientPortalSession(pharmacyId))
  }, [pharmacyId])

  const actions = [
    {
      title: rememberedPatient ? "Update profile" : "Register",
      description: rememberedPatient ? "Need to change details? Open your branch profile form" : "New patient? Create your profile",
      to: createPatientPath("/patient/register"),
      icon: IdCard,
    },
    {
      title: "Request Prescription",
      description: "Upload your prescription or request a refill",
      to: createPatientPath("/patient/prescription"),
      icon: PillBottle,
    },
    {
      title: "Book Appointment",
      description: "Book a phone call or video consultation",
      to: createPatientPath("/patient/appointment"),
      icon: CalendarPlus2,
    },
    {
      title: "Maternal Care",
      description: "Register ANC follow-up and maternal outreach support",
      to: maternalPortalPath,
      icon: HeartPulse,
    },
    {
      title: "Track & Notifications",
      description: "Track your order and see updates",
      to: createPatientPath("/patient/track"),
      icon: ClipboardPlus,
    },
  ]

  function handleForgetPatient() {
    clearPatientPortalSession(pharmacyId)
    setRememberedPatient(null)
    setFeedback({ type: "info", message: "This phone has been cleared on this device. You can register or switch to another number." })
  }

  async function handlePatientSignOut() {
    setIsSigningOut(true)
    setFeedback({ type: "", message: "" })

    try {
      await signOut()
      setFeedback({ type: "success", message: "Patient account signed out for this browser session." })
    } catch (error) {
      setFeedback({ type: "error", message: error?.message || "We could not sign you out right now." })
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="patient-page">
      <section className="patient-card patient-card-muted patient-hero">
        <span className="patient-badge">Branch home</span>
        <h1>{hasKnownPatient ? `Welcome back to ${branchName}` : `Start with ${branchName}`}</h1>
        <p className="patient-copy">Use this branch portal to keep patient details together, request prescriptions, book follow-up help, register maternal care outreach, and track private updates without restarting the process each time.</p>
        <div className="patient-session-bar">
          <div className="patient-session-bar-copy">
            <span className="patient-kicker">Active branch</span>
            <div className="patient-meta-title">{branchName}</div>
            <p>{branchLocation || "Requests, appointments, maternal follow-up, and tracking from this screen go straight to the selected branch."}</p>
          </div>
          <span className="patient-badge">{hasKnownPatient ? "Session ready" : "New session"}</span>
        </div>
      </section>

      {feedback.message ? (
        <div
          className={`patient-message ${
            feedback.type === "error"
              ? "patient-message-error"
              : feedback.type === "success"
                ? "patient-message-success"
                : "patient-message-info"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {hasKnownPatient ? (
        <section className="patient-card">
          <div className="patient-identity-card">
            <div className="patient-identity-main">
              <span className="patient-avatar">{getInitials(displayName)}</span>
              <div className="patient-identity-copy">
                <span className="patient-kicker">Continue as</span>
                <div className="patient-identity-name">{displayName}</div>
                <p>{displayPhone || "Patient account saved on this device"}</p>
              </div>
            </div>

            <div className="patient-mini-grid">
              <div className="patient-stat">
                <p className="patient-stat-label">Portal status</p>
                <p className="patient-stat-value">{isAuthenticated ? "Signed in" : "Saved on device"}</p>
              </div>
              <div className="patient-stat">
                <p className="patient-stat-label">Ready for</p>
                <p className="patient-stat-value">Prescriptions, appointments, and maternal care</p>
              </div>
            </div>
          </div>

          <div className="patient-actions-grid" style={{ marginBottom: "0.85rem" }}>
            <Link to={createPatientPath("/patient/prescription")} className="patient-action-card">
              <span className="patient-action-icon">
                <PillBottle />
              </span>
              <div className="patient-action-content">
                <h2>Continue to prescriptions</h2>
                <p>Use the saved phone number and load your branch profile automatically.</p>
              </div>
              <span className="patient-action-arrow" aria-hidden="true">
                <ChevronRight />
              </span>
            </Link>

            <Link to={createPatientPath("/patient/appointment")} className="patient-action-card">
              <span className="patient-action-icon">
                <CalendarPlus2 />
              </span>
              <div className="patient-action-content">
                <h2>Continue to appointments</h2>
                <p>Book again without re-entering everything from scratch.</p>
              </div>
              <span className="patient-action-arrow" aria-hidden="true">
                <ChevronRight />
              </span>
            </Link>

            <Link to={maternalPortalPath} className="patient-action-card">
              <span className="patient-action-icon">
                <HeartPulse />
              </span>
              <div className="patient-action-content">
                <h2>Continue to maternal care</h2>
                <p>Open ANC and pregnancy follow-up intake for this branch.</p>
              </div>
              <span className="patient-action-arrow" aria-hidden="true">
                <ChevronRight />
              </span>
            </Link>
          </div>

          <div className="patient-toolbar-actions">
            <button type="button" className="patient-button-secondary" onClick={handleForgetPatient} style={{ display: "inline-flex", alignItems: "center", gap: "0.55rem" }}>
              <LogOut size={16} />
              Use another phone number
            </button>
            {isAuthenticated ? (
              <button type="button" className="patient-button-secondary" onClick={() => void handlePatientSignOut()} disabled={isSigningOut}>
                {isSigningOut ? "Signing out..." : "Sign out"}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="patient-actions-grid">
        {actions.map(({ title, description, to, icon }) => (
          <Link key={title} to={to} className="patient-action-card">
            <span className="patient-action-icon">
              {createElement(icon)}
            </span>

            <div className="patient-action-content">
              <h2>{title}</h2>
              <p>{description}</p>
            </div>

            <span className="patient-action-arrow" aria-hidden="true">
              <ChevronRight />
            </span>
          </Link>
        ))}
      </section>

      <section className="patient-card patient-card-muted">
        <div className="patient-section-header">
          <div>
            <h2 className="patient-section-title">{isAuthenticated ? "Patient portal account active" : "Already have a patient portal account?"}</h2>
            <p className="patient-form-help">
              {isAuthenticated
                ? "Your patient portal sign-in is active for this branch. You can continue with services without signing in again."
                : "Sign in to manage your patient access with the same branch-linked portal on this device."}
            </p>
          </div>
        </div>

        {isAuthenticated ? (
          <>
            <div className="patient-auth-status" style={{ marginBottom: "0.9rem" }}>
              <p className="patient-form-help" style={{ margin: 0 }}>
                Signed in as <strong>{fullName || "Patient account"}</strong>{patientPhone ? ` on ${patientPhone}` : ""}.
              </p>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.7rem" }}>
              <Link to={createPatientPath("/patient/prescription")} className="patient-button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                Continue to prescriptions
              </Link>
              <button type="button" className="patient-button-secondary" onClick={() => void handlePatientSignOut()} disabled={isSigningOut}>
                {isSigningOut ? "Signing out..." : "Sign out of patient account"}
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.7rem" }}>
            <Link to={patientLoginPath} className="patient-button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              Sign in to patient account
            </Link>
            <Link to={createPatientPath("/patient/register")} className="patient-button-secondary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              Create or update profile
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
