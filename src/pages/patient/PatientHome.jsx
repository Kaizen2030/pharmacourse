import { createElement, useEffect, useState } from "react"
import { CalendarPlus2, ChevronRight, ClipboardPlus, IdCard, LogOut, PillBottle, ShieldCheck, UserRoundCheck } from "lucide-react"
import { Link } from "react-router-dom"
import { usePatient } from "../../components/PatientLayout"
import { usePatientPortalAuth } from "../../hooks/usePatientPortalAuth"
import { clearPatientPortalSession, getPatientPortalSession } from "../../lib/patientPortalSession"

export default function PatientHome() {
  const { branchName, pharmacyId, createPatientPath } = usePatient()
  const [rememberedPatient, setRememberedPatient] = useState(() => getPatientPortalSession(pharmacyId))
  const [feedback, setFeedback] = useState({ type: "", message: "" })
  const patientLoginPath = createPatientPath("/patient/login")
  const patientTrackPath = createPatientPath("/patient/track")
  const { isAuthenticated, patientPhone, fullName, signOut } = usePatientPortalAuth()

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

  async function handleSignOut() {
    try {
      await signOut()
      setFeedback({ type: "info", message: "You have signed out of the patient web account on this device." })
    } catch (error) {
      setFeedback({ type: "error", message: error?.message || "We could not sign you out right now." })
    }
  }

  return (
    <div className="patient-page">
      <section className="patient-card patient-card-muted patient-hero">
        <span className="patient-badge">{branchName}</span>
        <h1>Welcome</h1>
        <p className="patient-copy">
          Use this portal to register, request a prescription review, book an appointment, and follow updates from{" "}
          <strong>{branchName}</strong>.
        </p>
      </section>

      {rememberedPatient ? (
        <section className="patient-card">
          <div className="patient-section-header">
            <div>
              <h2 className="patient-section-title">Continue as {rememberedPatient.fullName || rememberedPatient.phone}</h2>
              <p className="patient-form-help">
                This phone was already used on this device for <strong>{branchName}</strong>. You can continue with the same profile right away.
              </p>
            </div>
            <span className="patient-inline-icon">
              <UserRoundCheck />
            </span>
          </div>

          <div className="patient-list-item" style={{ marginBottom: "0.9rem" }}>
            <div className="patient-list-header">
              <div>
                <div className="patient-list-title">{rememberedPatient.fullName || "Registered patient"}</div>
                <div className="patient-list-meta">{rememberedPatient.phone}</div>
              </div>
              <span className="patient-badge">Saved on this device</span>
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
          </div>

          <button type="button" className="patient-button-secondary" onClick={handleForgetPatient} style={{ display: "inline-flex", alignItems: "center", gap: "0.55rem" }}>
            <LogOut size={16} />
            Use another phone number
          </button>
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
            <h2 className="patient-section-title">Already have a patient portal account?</h2>
            <p className="patient-form-help">
              Sign in to manage your patient access with the same branch-linked portal on this device.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.7rem" }}>
          <Link to={patientLoginPath} className="patient-button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            Sign in to patient account
          </Link>
          <Link to={createPatientPath("/patient/register")} className="patient-button-secondary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            Create or update profile
          </Link>
        </div>
      </section>

      <section className="patient-card">
        <div className="patient-section-header">
          <div>
            <h2 className="patient-section-title">Private updates and notifications</h2>
            <p className="patient-form-help">
              Updates are now locked to signed-in patient web accounts. Knowing a phone number alone is no longer enough.
            </p>
          </div>
          <span className="patient-inline-icon">
            <ShieldCheck />
          </span>
        </div>

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

        {isAuthenticated ? (
          <div className="patient-empty-state">
            <p className="patient-form-help" style={{ margin: 0 }}>
              Signed in as <strong>{fullName || "Patient account"}</strong>{patientPhone ? ` on ${patientPhone}` : ""}.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.7rem" }}>
              <Link to={patientTrackPath} className="patient-button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                Open my updates
              </Link>
              <button type="button" className="patient-button-secondary" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <div className="patient-empty-state">
            <p className="patient-form-help" style={{ margin: 0 }}>
              Sign in to your patient account before viewing notifications, delivery progress, or prescription updates.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.7rem" }}>
              <Link to={patientLoginPath} className="patient-button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                Sign in to patient account
              </Link>
              <Link to={createPatientPath("/patient/register")} className="patient-button-secondary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                Create my account
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
