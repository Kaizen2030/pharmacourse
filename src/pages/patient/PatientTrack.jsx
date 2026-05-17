import { useEffect, useState } from "react"
import { ArrowUpRight, BellRing, CalendarClock, ClipboardList, PackageSearch, Video } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { usePatient } from "../../components/PatientLayout"
import { fetchPatientPortalUpdates } from "../../lib/patientPortalUpdates"
import { getPatientPortalSession, savePatientPortalSession } from "../../lib/patientPortalSession"

const deliverySteps = ["pending", "packed", "dispatched", "delivered"]

function isValidPhone(phone) {
  return /^07\d{8}$/.test(phone)
}

function formatDateTime(value) {
  if (!value) {
    return ""
  }

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
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

export default function PatientTrack() {
  const { pharmacyId } = usePatient()
  const [searchParams] = useSearchParams()
  const phoneParam = searchParams.get("phone")?.trim() || ""
  const rememberedSession = getPatientPortalSession(pharmacyId)
  const [phoneInput, setPhoneInput] = useState(phoneParam || rememberedSession?.phone || "")
  const [activePhone, setActivePhone] = useState("")
  const [notifications, setNotifications] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [appointments, setAppointments] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState({ type: "", message: "" })
  const [lastUpdated, setLastUpdated] = useState("")

  useEffect(() => {
    const initialPhone = phoneParam || rememberedSession?.phone || ""

    if (initialPhone && isValidPhone(initialPhone) && !activePhone) {
      setActivePhone(initialPhone)
      loadTrackingData(initialPhone)
    }
  }, [phoneParam, rememberedSession, activePhone])

  async function loadTrackingData(phone, { silent = false } = {}) {
    if (!silent) {
      setIsLoading(true)
    }

    const { data, error } = await fetchPatientPortalUpdates({
      pharmacyId,
      phone,
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
      phone,
      fullName:
        prescriptionRows[0]?.patient_name ||
        deliveryRows[0]?.patient_name ||
        notificationRows[0]?.patient_name ||
        rememberedSession?.fullName ||
        "",
      patientId: rememberedSession?.patientId || null,
    })
    setNotifications(notificationRows.map((item) => ({ ...item, read: true })))
    setDeliveries(deliveryRows)
    setPrescriptions(prescriptionRows)
    setAppointments(appointmentRows)
    setLastUpdated(formatDateTime(new Date().toISOString()))
    setFeedback({ type: notificationRows.length ? "success" : "info", message: notificationRows.length ? "Updates refreshed." : "No notifications yet for this number." })

    if (!silent) {
      setIsLoading(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const normalizedPhone = phoneInput.trim()

    if (!isValidPhone(normalizedPhone)) {
      setFeedback({ type: "error", message: "Enter a valid phone number in the format 07XXXXXXXX." })
      return
    }

    setActivePhone(normalizedPhone)
    await loadTrackingData(normalizedPhone)
  }

  useEffect(() => {
    if (!activePhone) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      loadTrackingData(activePhone, { silent: true })
    }, 30000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [activePhone, pharmacyId])

  return (
    <div className="patient-page">
      <section className="patient-card patient-card-muted patient-hero">
        <span className="patient-badge">Tracking and notifications</span>
        <h1>See every update in one place</h1>
        <p className="patient-copy">Track pending deliveries, prescription request progress, appointment updates, and branch notifications.</p>
      </section>

      <section className="patient-card">
        <div className="patient-section-header">
          <div>
            <h2 className="patient-section-title">Find my updates</h2>
            <p className="patient-form-help">Use the same phone number you gave the pharmacy. This page refreshes automatically every 30 seconds.</p>
          </div>
          <div className="patient-refresh">{lastUpdated ? `Last updated ${lastUpdated}` : "Auto-refresh every 30s"}</div>
        </div>

        <form className="patient-form" onSubmit={handleSubmit}>
          <div className="patient-form-group">
            <label className="patient-label" htmlFor="trackPhone">
              Phone number
            </label>
            <input
              id="trackPhone"
              className="patient-input"
              type="tel"
              inputMode="tel"
              placeholder="07XXXXXXXX"
              value={phoneInput}
              onChange={(event) => setPhoneInput(event.target.value)}
            />
          </div>

          <button className="patient-button" type="submit" disabled={isLoading}>
            {isLoading ? "Loading updates..." : "Check my updates"}
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
      </section>

      {activePhone ? (
        <>
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
                      <span className={`patient-type-badge ${getStatusClass(notification.type)}`}>{notification.type || "Update"}</span>
                      <span className="patient-note-time">{formatDateTime(notification.created_at)}</span>
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
                <p className="patient-empty">There are no active deliveries for this phone number right now.</p>
              </div>
            )}
          </section>

          <section className="patient-card">
            <div className="patient-section-header">
              <div>
                <h2 className="patient-section-title">Prescription requests</h2>
                <p className="patient-form-help">Your five most recent prescription submissions.</p>
              </div>
              <span className="patient-inline-icon">
                <ClipboardList />
              </span>
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
                <p className="patient-empty">No prescription requests have been logged for this number yet.</p>
              </div>
            )}
          </section>

          <section className="patient-card">
            <div className="patient-section-header">
              <div>
                <h2 className="patient-section-title">Upcoming appointments</h2>
                <p className="patient-form-help">Future bookings awaiting completion.</p>
              </div>
              <span className="patient-inline-icon">
                <CalendarClock />
              </span>
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
                <p className="patient-empty">No upcoming appointments are scheduled for this number.</p>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
