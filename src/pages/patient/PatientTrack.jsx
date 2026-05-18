import { useCallback, useEffect, useState } from "react"
import { ArrowUpRight, BellRing, CalendarClock, ClipboardList, PackageSearch, Video } from "lucide-react"
import { Link } from "react-router-dom"
import { usePatient } from "../../components/PatientLayout"
import { usePatientPortalAuth } from "../../hooks/usePatientPortalAuth"
import { fetchPatientPortalUpdates } from "../../lib/patientPortalUpdates"
import { getPatientPortalSession, savePatientPortalSession } from "../../lib/patientPortalSession"

const deliverySteps = ["pending", "packed", "dispatched", "delivered"]

function formatDateTime(value) {
  if (!value) {
    return ""
  }

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function formatRelativeTime(value) {
  if (!value) return ""

  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function getStatusClass(status) {
  const normalizedStatus = (status || "").toLowerCase().replace(/\s+/g, "-")

  if (
    ["pending", "packed", "dispatched", "delivered", "confirmed", "ready", "completed", "cancelled", "rejected"].includes(
      normalizedStatus,
    )
  ) {
    return `patient-status-${normalizedStatus}`
  }

  return "patient-status-default"
}

function getCurrentDeliveryStepIndex(status) {
  const normalizedStatus = (status || "").toLowerCase()
  const index = deliverySteps.indexOf(normalizedStatus)
  return index >= 0 ? index : 0
}

function formatAppointmentType(value) {
  const normalized = String(value || "").trim()

  if (normalized === "video_consultation") return "Video Consultation"
  if (normalized === "phone_call") return "Phone Call"
  if (normalized === "pickup") return "In-person Pickup"

  return normalized || "Appointment"
}

function getGreeting(name) {
  const hour = new Date().getHours()
  const part = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"
  return `Good ${part}${name ? `, ${name}` : ""}`
}

function getNotificationTypeLabel(value) {
  const normalized = String(value || "").trim().toUpperCase()
  if (!normalized) return "UPDATE"
  return normalized.replace(/_/g, " ")
}

export default function PatientTrack() {
  const { pharmacyId, createPatientPath } = usePatient()
  const rememberedSession = getPatientPortalSession(pharmacyId)
  const [notifications, setNotifications] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [appointments, setAppointments] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState({ type: "", message: "" })
  const [lastUpdated, setLastUpdated] = useState("")
  const { loading: authLoading, isAuthenticated, patientPhone, fullName } = usePatientPortalAuth()
  const patientLoginPath = createPatientPath("/patient/login")
  const unreadCount = notifications.filter((notification) => !notification.read).length
  const displayName = fullName || rememberedSession?.fullName || ""

  const loadTrackingData = useCallback(async ({ silent = false } = {}) => {
    if (!patientPhone) {
      setFeedback({ type: "error", message: "Your patient account is missing a linked phone number. Please contact the pharmacy team." })
      return
    }

    if (!silent) {
      setIsLoading(true)
    }

    const { data, error } = await fetchPatientPortalUpdates({
      pharmacyId,
    })

    if (error) {
      setFeedback({ type: "error", message: error.message || "We could not load your tracking updates right now." })
      if (!silent) {
        setIsLoading(false)
      }
      return
    }

    const notificationRows = data?.notifications || []
    const deliveryRows = (data?.deliveries || []).filter((item) => String(item?.status || "").toLowerCase() !== "delivered")
    const prescriptionRows = data?.requests || []
    const appointmentRows = (data?.appointments || []).filter((item) => {
      if (!item?.slot_datetime) return false
      return new Date(item.slot_datetime).getTime() > Date.now()
    })

    savePatientPortalSession(pharmacyId, {
      phone: patientPhone,
      fullName:
        fullName ||
        prescriptionRows[0]?.patient_name ||
        deliveryRows[0]?.patient_name ||
        rememberedSession?.fullName ||
        "",
      patientId: rememberedSession?.patientId || null,
    })
    setNotifications(notificationRows)
    setDeliveries(deliveryRows)
    setPrescriptions(prescriptionRows)
    setAppointments(appointmentRows)
    setLastUpdated(formatDateTime(new Date().toISOString()))
    setFeedback({ type: notificationRows.length ? "success" : "info", message: notificationRows.length ? "Updates refreshed." : "No notifications yet for your signed-in account." })

    if (!silent) {
      setIsLoading(false)
    }
  }, [fullName, patientPhone, pharmacyId, rememberedSession?.fullName, rememberedSession?.patientId])

  useEffect(() => {
    if (!authLoading && isAuthenticated && patientPhone) {
      void loadTrackingData()
    }
  }, [authLoading, isAuthenticated, patientPhone, loadTrackingData])

  useEffect(() => {
    if (!isAuthenticated || !patientPhone) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      void loadTrackingData({ silent: true })
    }, 30000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isAuthenticated, patientPhone, loadTrackingData])

  return (
    <div className="patient-page">
      <section className="patient-card patient-card-muted patient-hero">
        <span className="patient-badge">Tracking and notifications</span>
        <div className="patient-toolbar">
          <div className="patient-meta-copy">
            <h1 style={{ margin: 0 }}>{getGreeting(displayName)}</h1>
            <p>Track pending deliveries, prescription progress, appointment updates, and branch messages in one place.</p>
          </div>
          <div className="patient-inline-icon" style={{ position: "relative" }}>
            <BellRing />
            {unreadCount ? (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 999,
                  background: "#f59e0b",
                  color: "#163329",
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingInline: 4,
                }}
              >
                {unreadCount}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="patient-card">
        <div className="patient-toolbar">
          <div className="patient-meta-copy">
            <span className="patient-kicker">Private patient updates</span>
            <div className="patient-meta-title">This page refreshes every 30 seconds for the signed-in patient account.</div>
            <p>{lastUpdated ? `Last updated ${lastUpdated}` : "Auto-refresh every 30s"}</p>
          </div>
          <div className="patient-toolbar-actions">
            <button className="patient-button-secondary" type="button" onClick={() => void loadTrackingData()} disabled={isLoading || !isAuthenticated}>
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
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

        {authLoading ? (
          <div className="patient-form-help">Loading your patient account...</div>
        ) : null}

        {!authLoading && !isAuthenticated ? (
          <div className="patient-empty-state">
            <p className="patient-form-help" style={{ margin: 0 }}>
              Sign in to your patient account before viewing notifications, delivery tracking, or appointment updates.
            </p>
            <Link to={patientLoginPath} className="patient-button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              Sign in to continue
            </Link>
          </div>
        ) : null}

        {!authLoading && isAuthenticated ? (
          <div className="patient-auth-status">
            <p className="patient-form-help" style={{ margin: 0 }}>
              Signed in as <strong>{fullName || "Patient account"}</strong>{patientPhone ? ` on ${patientPhone}` : ""}.
            </p>
          </div>
        ) : null}
      </section>

      {isAuthenticated && patientPhone ? (
        <div className="patient-dashboard-grid">
          <section className="patient-card">
            <div className="patient-section-header">
              <div>
                <h2 className="patient-section-title">Notifications</h2>
                <p className="patient-form-help">Latest messages from the pharmacy for this number.</p>
              </div>
              <span className="patient-inline-icon">
                <BellRing />
              </span>
            </div>

            {notifications.length ? (
              <div className="patient-list">
                {notifications.map((notification) => (
                  <article key={notification.id} className="patient-list-item patient-note-item">
                    <div className="patient-note-header">
                      <span className={`patient-type-badge ${getStatusClass(notification.type)}`}>{getNotificationTypeLabel(notification.type)}</span>
                      <span className="patient-note-time">{formatRelativeTime(notification.created_at)}</span>
                    </div>
                    <p className="patient-note-message">{notification.message}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="patient-empty-state">
                <span className="patient-empty-icon">
                  <BellRing />
                </span>
                <p className="patient-empty">No notifications are available yet.</p>
              </div>
            )}
          </section>

          <section className="patient-card">
            <div className="patient-section-header">
              <div>
                <h2 className="patient-section-title">Delivery tracking</h2>
                <p className="patient-form-help">Open deliveries appear here with a live status timeline.</p>
              </div>
              <span className="patient-inline-icon">
                <PackageSearch />
              </span>
            </div>

            {deliveries.length ? (
              <div className="patient-list">
                {deliveries.map((delivery) => {
                  const stepIndex = getCurrentDeliveryStepIndex(delivery.status)

                  return (
                    <article key={delivery.id} className="patient-list-item">
                      <div className="patient-list-header">
                        <div>
                          <div className="patient-list-title">{delivery.patient_name || "Delivery request"}</div>
                          <div className="patient-list-meta">Created {formatDateTime(delivery.created_at)}</div>
                        </div>
                        <span className={`patient-status-badge ${getStatusClass(delivery.status)}`}>{delivery.status || "Pending"}</span>
                      </div>

                      <div className="patient-info-list">
                        {delivery.items ? <div>Items: {Array.isArray(delivery.items) ? delivery.items.map((item) => `${item.drug_name || "Item"} x${item.qty || 1}`).join(", ") : delivery.items}</div> : null}
                        {delivery.total_kes != null ? <div>Total: KES {delivery.total_kes}</div> : null}
                        {delivery.delivery_partner_type ? <div>Delivery partner: {delivery.delivery_partner_type}</div> : null}
                        {delivery.rider_name ? <div>Contact: {delivery.rider_name}</div> : null}
                        {delivery.rider_phone ? <div>Contact phone: {delivery.rider_phone}</div> : null}
                        {delivery.estimated_delivery_minutes ? <div>ETA: about {delivery.estimated_delivery_minutes} minutes</div> : null}
                      </div>

                      <div className="patient-timeline" aria-label="Delivery status timeline">
                        {deliverySteps.map((step, index) => (
                          <div key={step} style={{ display: "contents" }}>
                            <div
                              className={`patient-timeline-step${
                                index < stepIndex ? " complete" : index === stepIndex ? " current" : ""
                              }`}
                            >
                              <span className="patient-timeline-dot" />
                              <span className="patient-timeline-caption">{step.charAt(0).toUpperCase() + step.slice(1)}</span>
                            </div>
                            {index < deliverySteps.length - 1 ? <div className="patient-timeline-line" /> : null}
                          </div>
                        ))}
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="patient-empty-state">
                <span className="patient-empty-icon">
                  <PackageSearch />
                </span>
                <p className="patient-empty">There are no active deliveries for your signed-in account right now.</p>
              </div>
            )}
          </section>

          <section className="patient-card">
            <div className="patient-section-header">
              <div>
                <h2 className="patient-section-title">Prescription requests</h2>
                <p className="patient-form-help">Your five most recent prescription submissions.</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                <Link to={createPatientPath("/patient/prescription")} className="patient-subtle-link">
                  New request
                </Link>
                <span className="patient-inline-icon">
                  <ClipboardList />
                </span>
              </div>
            </div>

            {prescriptions.length ? (
              <div className="patient-list">
                {prescriptions.map((request) => (
                  <article key={request.id} className="patient-list-item">
                    <div className="patient-list-header">
                      <div>
                        <div className="patient-list-title">{request.fulfillment_drug_name || request.drug_requested || "Prescription request"}</div>
                        <div className="patient-list-meta">Submitted {formatDateTime(request.created_at)}</div>
                      </div>
                      <span className={`patient-status-badge ${getStatusClass(request.status)}`}>{request.status || "Pending"}</span>
                    </div>
                    {request.condition_notes ? <p className="patient-list-text">{request.condition_notes}</p> : null}
                    {request.pharmacist_notes ? <p className="patient-list-text">Pharmacist note: {request.pharmacist_notes}</p> : null}
                    {request.patient_fulfillment_choice ? <p className="patient-list-text">Next step: {request.patient_fulfillment_choice}</p> : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="patient-empty-state">
                <span className="patient-empty-icon">
                  <ClipboardList />
                </span>
                <p className="patient-empty">No prescription requests have been logged for your signed-in account yet.</p>
              </div>
            )}
          </section>

          <section className="patient-card">
            <div className="patient-section-header">
              <div>
                <h2 className="patient-section-title">Upcoming appointments</h2>
                <p className="patient-form-help">Future bookings awaiting completion.</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                {!appointments.length ? (
                  <Link to={createPatientPath("/patient/appointment")} className="patient-subtle-link">
                    Book now
                  </Link>
                ) : null}
                <span className="patient-inline-icon">
                  <CalendarClock />
                </span>
              </div>
            </div>

            {appointments.length ? (
              <div className="patient-list">
                {appointments.map((appointment) => (
                  <article key={appointment.id} className="patient-list-item">
                    <div className="patient-list-header">
                      <div>
                        <div className="patient-list-title">{formatAppointmentType(appointment.appointment_type)}</div>
                        <div className="patient-list-meta">{formatDateTime(appointment.slot_datetime)}</div>
                      </div>
                      <span className={`patient-status-badge ${getStatusClass(appointment.status)}`}>{appointment.status || "Pending"}</span>
                    </div>
                    {appointment.condition_summary ? <p className="patient-list-text">{appointment.condition_summary}</p> : null}
                    {appointment.pharmacist_response ? <p className="patient-list-text">Pharmacist note: {appointment.pharmacist_response}</p> : null}
                    {appointment.video_link ? (
                      <div
                        style={{
                          marginTop: "0.8rem",
                          padding: "0.95rem 1rem",
                          borderRadius: "18px",
                          border: "1px solid rgba(15, 110, 86, 0.14)",
                          background: "linear-gradient(180deg, rgba(232,245,240,0.95), rgba(244,250,247,0.98))",
                          display: "grid",
                          gap: "0.6rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                          <span
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 14,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "rgba(15, 110, 86, 0.12)",
                              color: "#0f6e56",
                              flexShrink: 0,
                            }}
                          >
                            <Video size={18} />
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 800, color: "#163329", lineHeight: 1.25 }}>Join your consultation</div>
                            <div style={{ color: "#4f675e", fontSize: "0.92rem", lineHeight: 1.45 }}>
                              Tap the button below when it is time for your {formatAppointmentType(appointment.appointment_type).toLowerCase()}.
                            </div>
                          </div>
                        </div>

                        <a
                          href={appointment.video_link}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.55rem",
                            minHeight: 48,
                            padding: "0.85rem 1rem",
                            borderRadius: 999,
                            background: "#0f6e56",
                            color: "#ffffff",
                            fontWeight: 800,
                            textDecoration: "none",
                            boxShadow: "0 10px 24px rgba(15, 110, 86, 0.18)",
                          }}
                        >
                          Open consultation link
                          <ArrowUpRight size={16} />
                        </a>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="patient-empty-state">
                <span className="patient-empty-icon">
                  <CalendarClock />
                </span>
                <p className="patient-empty">No upcoming appointments are scheduled for your signed-in account.</p>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  )
}
