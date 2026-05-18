import { createElement, useEffect, useState } from "react"
import { Bell, CalendarPlus2, ChevronRight, ClipboardPlus, IdCard, LogOut, PillBottle, UserRoundCheck } from "lucide-react"
import { Link } from "react-router-dom"
import { usePatient } from "../../components/PatientLayout"
import { fetchPatientPortalUpdates } from "../../lib/patientPortalUpdates"
import { buildPatientRouteUrl } from "../../lib/patientPortalRoutes"
import { clearPatientPortalSession, getPatientPortalSession } from "../../lib/patientPortalSession"

function formatDateTime(value) {
  if (!value) {
    return ""
  }

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function getTypeBadgeClass(type) {
  const normalizedType = (type || "").toLowerCase()

  if (normalizedType.includes("delivery")) return "patient-status-dispatched"
  if (normalizedType.includes("appointment")) return "patient-status-confirmed"
  if (normalizedType.includes("prescription")) return "patient-status-pending"

  return "patient-status-default"
}

export default function PatientHome() {
  const { branchName, pharmacyId, createPatientPath } = usePatient()
  const [rememberedPatient, setRememberedPatient] = useState(() => getPatientPortalSession(pharmacyId))
  const [phone, setPhone] = useState("")
  const [notifications, setNotifications] = useState([])
  const [isChecking, setIsChecking] = useState(false)
  const [feedback, setFeedback] = useState({ type: "", message: "" })
  const patientLoginPath = buildPatientRouteUrl("/patient/login")

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
    setPhone("")
    setNotifications([])
    setFeedback({ type: "info", message: "This phone has been cleared on this device. You can register or switch to another number." })
  }

  async function handleCheckNotifications(event) {
    event.preventDefault()

    const normalizedPhone = phone.trim()

    if (!normalizedPhone) {
      setFeedback({ type: "error", message: "Enter your phone number to check for updates." })
      setNotifications([])
      return
    }

    setIsChecking(true)
    setFeedback({ type: "", message: "" })

    const { data, error } = await fetchPatientPortalUpdates({
      pharmacyId,
      phone: normalizedPhone,
    })

    if (error) {
      setFeedback({ type: "error", message: error.message || "We could not load your notifications right now." })
      setNotifications([])
      setIsChecking(false)
      return
    }

    const notificationRows = (data?.notifications || []).slice(0, 5)
    setNotifications(notificationRows.map((item) => ({ ...item, read: true })))

    if (notificationRows.length) {
      setFeedback({ type: "success", message: `We found ${notificationRows.length} recent update(s) for this number.` })
    } else {
      setFeedback({ type: "info", message: "No notifications yet for that number at this branch." })
    }

    setIsChecking(false)
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
            <h2 className="patient-section-title">Check my notifications</h2>
            <p className="patient-form-help">Enter the phone number you used with this pharmacy to see your latest updates.</p>
          </div>
          <span className="patient-inline-icon">
            <Bell />
          </span>
        </div>

        <form className="patient-form" onSubmit={handleCheckNotifications}>
          <div className="patient-form-group">
            <label className="patient-label" htmlFor="notification-phone">
              Phone number
            </label>
            <input
              id="notification-phone"
              className="patient-input"
              type="tel"
              inputMode="tel"
              placeholder="07XXXXXXXX"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>

          <button className="patient-button" type="submit" disabled={isChecking}>
            {isChecking ? "Checking..." : "Check my notifications"}
          </button>
        </form>

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

        <div className="patient-list">
          {notifications.map((notification) => (
            <article key={notification.id} className="patient-list-item patient-note-item">
              <div className="patient-note-header">
                <span className={`patient-type-badge ${getTypeBadgeClass(notification.type)}`}>{notification.type || "Update"}</span>
                <span className="patient-note-time">{formatDateTime(notification.created_at)}</span>
              </div>
              <p className="patient-note-message">{notification.message}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
