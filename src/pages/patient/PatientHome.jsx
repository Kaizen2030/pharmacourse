import { useState } from "react"
import { Bell, CalendarPlus2, ChevronRight, ClipboardPlus, IdCard, PillBottle } from "lucide-react"
import { Link } from "react-router-dom"
import { usePatient } from "../../components/PatientLayout"
import { pharmacyosClient } from "../../lib/pharmacyosClient"

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
  const [phone, setPhone] = useState("")
  const [notifications, setNotifications] = useState([])
  const [isChecking, setIsChecking] = useState(false)
  const [feedback, setFeedback] = useState({ type: "", message: "" })

  const actions = [
    {
      title: "Register",
      description: "New patient? Create your profile",
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

    const { data, error } = await pharmacyosClient.functions.invoke("patient-portal-updates", {
      body: {
        pharmacy_id: pharmacyId,
        phone: normalizedPhone,
      },
    })

    if (error || data?.error) {
      setFeedback({ type: "error", message: error?.message || data?.error || "We could not load your notifications right now." })
      setNotifications([])
      setIsChecking(false)
      return
    }

    const notificationRows = (data?.updates?.notifications || []).slice(0, 5)
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

      <section className="patient-actions-grid">
        {actions.map(({ title, description, to, icon: Icon }) => (
          <Link key={title} to={to} className="patient-action-card">
            <span className="patient-action-icon">
              <Icon />
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
