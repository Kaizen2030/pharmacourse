import { createElement, useCallback, useEffect, useRef, useState } from "react"
import { CalendarClock, PhoneCall, ShieldCheck, Store, Video } from "lucide-react"
import { Link } from "react-router-dom"
import { usePatient } from "../../components/PatientLayout"
import { usePatientPortalAuth } from "../../hooks/usePatientPortalAuth"
import { pharmacyosClient } from "../../lib/pharmacyosClient"
import { getPatientPortalSession, savePatientPortalSession } from "../../lib/patientPortalSession"

const slotOptions = [
  { label: "9:00 AM", value: "09:00" },
  { label: "10:00 AM", value: "10:00" },
  { label: "11:00 AM", value: "11:00" },
  { label: "2:00 PM", value: "14:00" },
  { label: "3:00 PM", value: "15:00" },
  { label: "4:00 PM", value: "16:00" },
]

const appointmentTypes = [
  { value: "phone_call", label: "Phone Call", icon: PhoneCall },
  { value: "video_consultation", label: "Video Call", icon: Video },
  { value: "pickup", label: "In-person Pickup", icon: Store },
]

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function getMaxDate() {
  const date = new Date()
  date.setDate(date.getDate() + 14)
  return date.toISOString().slice(0, 10)
}

function combineDateAndTime(date, time) {
  return new Date(`${date}T${time}:00`)
}

function formatAppointmentDate(date, time) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(combineDateAndTime(date, time))
}

export default function PatientAppointment() {
  const { pharmacyId } = usePatient()
  const rememberedSession = getPatientPortalSession(pharmacyId)
  const [patient, setPatient] = useState(null)
  const [lookupMessage, setLookupMessage] = useState({ type: "", message: "" })
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [appointmentType, setAppointmentType] = useState("phone_call")
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedSlot, setSelectedSlot] = useState("")
  const [conditionSummary, setConditionSummary] = useState("")
  const [bookedSlots, setBookedSlots] = useState([])
  const [slotMessage, setSlotMessage] = useState("")
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [submitMessage, setSubmitMessage] = useState({ type: "", message: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const autoLookupDoneRef = useRef(false)
  const { loading: authLoading, isAuthenticated, patientPhone, fullName } = usePatientPortalAuth()
  const loginPath = `/patient/login?pharmacy=${encodeURIComponent(pharmacyId)}`
  const registerPath = `/patient/register?pharmacy=${encodeURIComponent(pharmacyId)}`

  useEffect(() => {
    if (!selectedDate) {
      setBookedSlots([])
      setSlotMessage("")
      return
    }

    let ignore = false

    async function fetchSlots() {
      setIsLoadingSlots(true)
      setSlotMessage("")

      const dayStart = combineDateAndTime(selectedDate, "00:00")
      const dayEnd = combineDateAndTime(selectedDate, "23:59")

      const { data, error } = await pharmacyosClient
        .from("appointments")
        .select("slot_datetime, status")
        .eq("pharmacy_id", pharmacyId)
        .gte("slot_datetime", dayStart.toISOString())
        .lte("slot_datetime", dayEnd.toISOString())

      if (ignore) {
        return
      }

      if (error) {
        setBookedSlots([])
        setSlotMessage(error.message || "We could not load the available slots.")
        setIsLoadingSlots(false)
        return
      }

      const reservedSlots = (data || [])
        .filter((item) => (item.status || "").toLowerCase() !== "cancelled")
        .map((item) =>
          new Intl.DateTimeFormat("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(new Date(item.slot_datetime)),
        )

      setBookedSlots(reservedSlots)
      setIsLoadingSlots(false)
    }

    fetchSlots()

    return () => {
      ignore = true
    }
  }, [selectedDate, pharmacyId])

  useEffect(() => {
    if (selectedSlot && bookedSlots.includes(selectedSlot)) {
      setSelectedSlot("")
    }
  }, [bookedSlots, selectedSlot])

  const handleLookup = useCallback(async () => {
    const normalizedPhone = String(patientPhone || "").trim()

    if (!isAuthenticated) {
      setLookupMessage({ type: "error", message: "Sign in to your patient account before confirming your profile." })
      setPatient(null)
      return
    }

    if (!normalizedPhone) {
      setLookupMessage({ type: "error", message: "Your patient account does not have a linked phone number. Please contact the pharmacy team." })
      setPatient(null)
      return
    }

    setIsLookingUp(true)
    setLookupMessage({ type: "", message: "" })
    setSubmitMessage({ type: "", message: "" })

    const { data, error } = await pharmacyosClient.rpc("public_patient_portal_profile", {
      target_pharmacy_id: pharmacyId,
      target_phone: normalizedPhone,
    })

    if (error) {
      setLookupMessage({ type: "error", message: error?.message || "We could not verify this patient right now." })
      setPatient(null)
      setIsLookingUp(false)
      return
    }

    if (!data?.exists || !data?.patient) {
      setLookupMessage({ type: "info", message: "Please register first before booking an appointment." })
      setPatient(null)
      setIsLookingUp(false)
      return
    }

    setPatient(data.patient)
    savePatientPortalSession(pharmacyId, {
      phone: data.patient.phone || normalizedPhone,
      fullName: data.patient.full_name,
      patientId: data.patient.id,
    })
    setLookupMessage({ type: "success", message: `Welcome back ${data.patient.full_name}. Choose your appointment details below.` })
    setIsLookingUp(false)
  }, [isAuthenticated, patientPhone, pharmacyId])

  async function handleSubmit(event) {
    event.preventDefault()

    if (!patient) {
      setSubmitMessage({ type: "error", message: "Please confirm your profile first." })
      return
    }

    if (!selectedDate || !selectedSlot) {
      setSubmitMessage({ type: "error", message: "Choose both a date and an available time slot." })
      return
    }

    if (!conditionSummary.trim()) {
      setSubmitMessage({ type: "error", message: "Tell the pharmacist what you would like to discuss." })
      return
    }

    setIsSubmitting(true)
    setSubmitMessage({ type: "", message: "" })

    const slotDateTime = combineDateAndTime(selectedDate, selectedSlot)

    const { error } = await pharmacyosClient.from("appointments").insert({
      pharmacy_id: pharmacyId,
      patient_id: patient.id,
      patient_phone: patient.phone,
      patient_name: patient.full_name,
      appointment_type: appointmentType,
      slot_datetime: slotDateTime.toISOString(),
      condition_summary: conditionSummary.trim(),
      status: "pending",
    })

    if (error) {
      setSubmitMessage({ type: "error", message: error.message || "We could not book this appointment." })
      setIsSubmitting(false)
      return
    }

    setSubmitMessage({
      type: "success",
      message: `Appointment booked for ${formatAppointmentDate(selectedDate, selectedSlot)}. The pharmacist will confirm shortly.`,
    })
    setSelectedSlot("")
    setConditionSummary("")
    setIsSubmitting(false)
  }

  useEffect(() => {
    if (autoLookupDoneRef.current) {
      return
    }

    if (authLoading || !isAuthenticated || !patientPhone || patient) {
      return
    }

    autoLookupDoneRef.current = true
    void handleLookup()
  }, [authLoading, isAuthenticated, patientPhone, patient, handleLookup])

  return (
    <div className="patient-page">
      <section className="patient-card patient-card-muted patient-hero">
        <span className="patient-badge">Appointment booking</span>
        <h1>Speak with the pharmacy team</h1>
        <p className="patient-copy">Book a phone call, video call, or in-person pickup consultation in just a few steps.</p>
      </section>

      <section className="patient-card">
        <div className="patient-section-header">
          <div>
            <h2 className="patient-section-title">{patient ? "Patient account ready" : "Step 1: Confirm your patient account"}</h2>
            <p className="patient-form-help">
              {patient
                ? "You are already signed in and linked to this branch profile."
                : "We will find your registered patient profile using the phone number linked to your account."}
            </p>
          </div>
          <span className="patient-inline-icon">
            <ShieldCheck />
          </span>
        </div>

        {authLoading ? <div className="patient-form-help">Loading your patient account...</div> : null}

        {!authLoading && !isAuthenticated ? (
          <div className="patient-empty-state">
            <p className="patient-form-help" style={{ margin: 0 }}>
              Sign in first so appointment booking uses only your own patient profile.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.7rem" }}>
              <Link to={loginPath} className="patient-button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                Sign in to continue
              </Link>
              <Link to={registerPath} className="patient-button-secondary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                Create my account
              </Link>
            </div>
          </div>
        ) : null}

        {!authLoading && isAuthenticated ? (
          <div className="patient-auth-status">
            <p className="patient-form-help" style={{ margin: 0 }}>
              Signed in as <strong>{fullName || rememberedSession?.fullName || "Patient account"}</strong>{patientPhone ? ` on ${patientPhone}` : ""}.
            </p>
            <div className="patient-inline-actions">
              <button className="patient-button-secondary patient-button-inline" type="button" onClick={() => void handleLookup()} disabled={isLookingUp}>
                {isLookingUp ? "Checking profile..." : patient ? "Refresh profile" : "Load my profile"}
              </button>
            </div>
          </div>
        ) : null}

        {lookupMessage.message ? (
          <div
            className={`patient-message ${
              lookupMessage.type === "error"
                ? "patient-message-error"
                : lookupMessage.type === "success"
                  ? "patient-message-success"
                  : "patient-message-info"
            }`}
          >
            {lookupMessage.message}
          </div>
        ) : null}

        {patient ? (
          <div className="patient-list-item">
            <div className="patient-list-header">
              <div>
                <div className="patient-list-title">Welcome back {patient.full_name}</div>
                <div className="patient-list-meta">Patient reference: {patient.phone}</div>
              </div>
              <span className="patient-badge">Verified</span>
            </div>
          </div>
        ) : null}
      </section>

      {patient ? (
        <section className="patient-card">
          <div className="patient-section-header">
            <div>
              <h2 className="patient-section-title">Step 2: Choose a slot</h2>
              <p className="patient-form-help">Booked time slots are automatically hidden for the selected date.</p>
            </div>
            <span className="patient-inline-icon">
              <CalendarClock />
            </span>
          </div>

          <form className="patient-form" onSubmit={handleSubmit}>
            <div className="patient-form-group">
              <span className="patient-label">Appointment type</span>
              <div className="patient-radio-grid">
                {appointmentTypes.map(({ value, label, icon }) => (
                  <label key={value} className="patient-radio">
                    <input
                      type="radio"
                      name="appointmentType"
                      value={value}
                      checked={appointmentType === value}
                      onChange={(event) => setAppointmentType(event.target.value)}
                    />
                    <span className="patient-radio-card">
                      <span className="patient-action-icon">
                        {createElement(icon)}
                      </span>
                      <span>{label}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="patient-grid-2">
              <div className="patient-form-group">
                <label className="patient-label" htmlFor="appointmentDate">
                  Date
                </label>
                <input
                  id="appointmentDate"
                  className="patient-input"
                  type="date"
                  min={getToday()}
                  max={getMaxDate()}
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                />
              </div>

              <div className="patient-form-group">
                <span className="patient-label">Available time slots</span>
                {isLoadingSlots ? <p className="patient-form-help">Loading available time slots...</p> : null}
                {slotMessage ? <p className="patient-form-help">{slotMessage}</p> : null}
                <div className="patient-slot-grid">
                  {slotOptions
                    .filter((slot) => !bookedSlots.includes(slot.value))
                    .map((slot) => (
                      <button
                        key={slot.value}
                        type="button"
                        className={`patient-slot${selectedSlot === slot.value ? " active" : ""}`}
                        onClick={() => setSelectedSlot(slot.value)}
                      >
                        {slot.label}
                      </button>
                    ))}
                </div>
                {selectedDate && !isLoadingSlots && !slotOptions.some((slot) => !bookedSlots.includes(slot.value)) ? (
                  <p className="patient-form-help">No open slots remain for this date. Please choose another date.</p>
                ) : null}
              </div>
            </div>

            <div className="patient-form-group">
              <label className="patient-label" htmlFor="conditionSummary">
                What would you like to discuss?
              </label>
              <textarea
                id="conditionSummary"
                className="patient-textarea"
                value={conditionSummary}
                onChange={(event) => setConditionSummary(event.target.value)}
                placeholder="Describe the symptoms, follow-up, or advice you need."
              />
            </div>

            {submitMessage.message ? (
              <div className={`patient-message ${submitMessage.type === "error" ? "patient-message-error" : "patient-message-success"}`}>
                {submitMessage.message}
              </div>
            ) : null}

            <button className="patient-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Booking appointment..." : "Book appointment"}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  )
}
