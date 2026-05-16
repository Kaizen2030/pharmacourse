import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import SEO from "../components/SEO"
import "./PatientPortal.css"

const PORTAL_TABS = [
  { id: "prescription", label: "Prescription Request" },
  { id: "appointment", label: "Book Appointment" },
  { id: "delivery", label: "Delivery Request" },
  { id: "updates", label: "Check Updates" },
]

const APPOINTMENT_OPTIONS = [
  { value: "video_consultation", label: "Video consultation" },
  { value: "phone_call", label: "Phone call" },
  { value: "pickup", label: "In-person pickup" },
]

function createEmptyPrescription() {
  return {
    patientName: "",
    patientPhone: "",
    conditionNotes: "",
    drugRequested: "",
  }
}

function createEmptyAppointment() {
  return {
    patientName: "",
    patientPhone: "",
    appointmentType: "phone_call",
    slotDatetime: defaultSlotValue(),
    patientNotes: "",
    conditionSummary: "",
  }
}

function createEmptyDelivery() {
  return {
    patientName: "",
    patientPhone: "",
    patientAddress: "",
    patientLocationLat: "",
    patientLocationLng: "",
    riderName: "",
    riderPhone: "",
    items: [
      { drug_name: "", qty: "1", price: "" },
    ],
  }
}

function defaultSlotValue() {
  const date = new Date()
  date.setHours(date.getHours() + 2, 0, 0, 0)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - (offset * 60000))
  return local.toISOString().slice(0, 16)
}

function normalizePhone(value) {
  return String(value || "").trim().replace(/\s+/g, "")
}

function formatDateTime(value) {
  if (!value) return "-"
  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function timeAgo(value) {
  if (!value) return "just now"
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function getStatusTone(status) {
  const normalized = String(status || "").toLowerCase()
  if (["approved", "confirmed"].includes(normalized)) return "success"
  if (["declined", "cancelled"].includes(normalized)) return "danger"
  if (["dispensed", "delivered", "completed"].includes(normalized)) return "muted"
  if (["dispatched", "in_progress", "packed"].includes(normalized)) return "info"
  return "warning"
}

function formatAppointmentType(value) {
  if (!value) return "Appointment"
  return String(value)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function buildTrackingFeed({ requests = [], appointments = [], deliveries = [], notifications = [] }) {
  return [
    ...requests.map((item) => ({
      id: `request-${item.id}`,
      type: "Prescription request",
      title: item.drug_requested || "Prescription request",
      status: item.status || "pending",
      summary: item.condition_notes || "Waiting for pharmacist review.",
      createdAt: item.created_at,
    })),
    ...appointments.map((item) => ({
      id: `appointment-${item.id}`,
      type: "Appointment",
      title: formatAppointmentType(item.appointment_type),
      status: item.status || "pending",
      summary: item.condition_summary || item.patient_notes || formatDateTime(item.slot_datetime),
      createdAt: item.created_at,
    })),
    ...deliveries.map((item) => ({
      id: `delivery-${item.id}`,
      type: "Delivery",
      title: item.patient_address || "Delivery request",
      status: item.status || "pending",
      summary: Array.isArray(item.items) && item.items.length
        ? item.items.map((row) => `${row.drug_name || "Drug"} x${row.qty || 1}`).join(", ")
        : "Awaiting packing details.",
      createdAt: item.created_at,
    })),
    ...notifications.map((item) => ({
      id: `notification-${item.id}`,
      type: "Update",
      title: item.type || "Notification",
      status: item.read ? "read" : "new",
      summary: item.message || "Pharmacy update",
      createdAt: item.created_at,
    })),
  ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
}

export default function PatientPortal() {
  const [searchParams] = useSearchParams()
  const pharmacyId = searchParams.get("pharmacy") || searchParams.get("branch") || ""
  const [activeTab, setActiveTab] = useState("prescription")
  const [pharmacy, setPharmacy] = useState(null)
  const [portalLoading, setPortalLoading] = useState(true)
  const [portalError, setPortalError] = useState("")
  const [prescriptionForm, setPrescriptionForm] = useState(createEmptyPrescription)
  const [prescriptionFile, setPrescriptionFile] = useState(null)
  const [appointmentForm, setAppointmentForm] = useState(createEmptyAppointment)
  const [deliveryForm, setDeliveryForm] = useState(createEmptyDelivery)
  const [trackerPhone, setTrackerPhone] = useState("")
  const [trackingFeed, setTrackingFeed] = useState([])
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [trackingMessage, setTrackingMessage] = useState("")
  const [submitting, setSubmitting] = useState("")
  const [submitMessage, setSubmitMessage] = useState("")
  const [submitError, setSubmitError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadPharmacy() {
      if (!pharmacyId) {
        setPortalError("This link is missing a pharmacy id. Ask your pharmacy to share the full patient portal link.")
        setPortalLoading(false)
        return
      }

      setPortalLoading(true)
      setPortalError("")

      const { data, error } = await supabase
        .from("pharmacies")
        .select("id, name, location")
        .eq("id", pharmacyId)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.warn("Pharmacy lookup failed:", error.message)
        setPharmacy(null)
      } else {
        setPharmacy(data || null)
      }

      setPortalLoading(false)
    }

    loadPharmacy()

    return () => {
      cancelled = true
    }
  }, [pharmacyId])

  const deliveryTotal = useMemo(() => (
    deliveryForm.items.reduce((sum, item) => {
      const qty = Number(item.qty || 0)
      const price = Number(item.price || 0)
      return sum + ((qty > 0 ? qty : 0) * (price > 0 ? price : 0))
    }, 0)
  ), [deliveryForm.items])

  function updatePrescription(field, value) {
    setPrescriptionForm((prev) => ({ ...prev, [field]: value }))
  }

  function updateAppointment(field, value) {
    setAppointmentForm((prev) => ({ ...prev, [field]: value }))
  }

  function updateDelivery(field, value) {
    setDeliveryForm((prev) => ({ ...prev, [field]: value }))
  }

  function updateDeliveryItem(index, field, value) {
    setDeliveryForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      )),
    }))
  }

  function addDeliveryItem() {
    setDeliveryForm((prev) => ({
      ...prev,
      items: [...prev.items, { drug_name: "", qty: "1", price: "" }],
    }))
  }

  function removeDeliveryItem(index) {
    setDeliveryForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  async function uploadPrescriptionImage() {
    if (!prescriptionFile) return ""

    const extension = prescriptionFile.name.includes(".")
      ? prescriptionFile.name.split(".").pop()
      : "jpg"
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`
    const filePath = `${pharmacyId}/${fileName}`

    const { error } = await supabase.storage
      .from("prescription-photos")
      .upload(filePath, prescriptionFile, { upsert: false })

    if (error) throw error

    const { data } = supabase.storage
      .from("prescription-photos")
      .getPublicUrl(filePath)

    return data?.publicUrl || ""
  }

  async function handlePrescriptionSubmit(event) {
    event.preventDefault()
    setSubmitting("prescription")
    setSubmitMessage("")
    setSubmitError("")

    try {
      const patientName = prescriptionForm.patientName.trim()
      const patientPhone = normalizePhone(prescriptionForm.patientPhone)
      const conditionNotes = prescriptionForm.conditionNotes.trim()

      if (!patientName || !patientPhone || !conditionNotes) {
        throw new Error("Name, phone number, and condition details are required.")
      }

      const prescriptionImageUrl = await uploadPrescriptionImage()

      const { error } = await supabase.from("prescription_requests").insert([{
        pharmacy_id: pharmacyId,
        branch_id: pharmacyId,
        patient_name: patientName,
        patient_phone: patientPhone,
        condition_notes: conditionNotes,
        drug_requested: prescriptionForm.drugRequested.trim() || null,
        prescription_image_url: prescriptionImageUrl || null,
      }])

      if (error) throw error

      setPrescriptionForm(createEmptyPrescription())
      setPrescriptionFile(null)
      setTrackerPhone(patientPhone)
      setSubmitMessage("Your prescription request has been sent to the pharmacy. They will review it shortly.")
      setActiveTab("updates")
      await fetchTrackingFeed(patientPhone, { showEmptySuccess: true })
    } catch (error) {
      setSubmitError(error?.message || "Unable to send your prescription request right now.")
    } finally {
      setSubmitting("")
    }
  }

  async function handleAppointmentSubmit(event) {
    event.preventDefault()
    setSubmitting("appointment")
    setSubmitMessage("")
    setSubmitError("")

    try {
      const patientName = appointmentForm.patientName.trim()
      const patientPhone = normalizePhone(appointmentForm.patientPhone)
      const conditionSummary = appointmentForm.conditionSummary.trim()

      if (!patientName || !patientPhone || !conditionSummary || !appointmentForm.slotDatetime) {
        throw new Error("Name, phone number, appointment time, and condition summary are required.")
      }

      const { error } = await supabase.from("appointments").insert([{
        pharmacy_id: pharmacyId,
        patient_name: patientName,
        patient_phone: patientPhone,
        appointment_type: appointmentForm.appointmentType,
        slot_datetime: new Date(appointmentForm.slotDatetime).toISOString(),
        status: "pending",
        patient_notes: appointmentForm.patientNotes.trim() || null,
        condition_summary: conditionSummary,
      }])

      if (error) throw error

      setAppointmentForm(createEmptyAppointment())
      setTrackerPhone(patientPhone)
      setSubmitMessage("Your appointment request has been sent. The pharmacy will confirm the slot soon.")
      setActiveTab("updates")
      await fetchTrackingFeed(patientPhone, { showEmptySuccess: true })
    } catch (error) {
      setSubmitError(error?.message || "Unable to book that appointment right now.")
    } finally {
      setSubmitting("")
    }
  }

  async function handleDeliverySubmit(event) {
    event.preventDefault()
    setSubmitting("delivery")
    setSubmitMessage("")
    setSubmitError("")

    try {
      const patientName = deliveryForm.patientName.trim()
      const patientPhone = normalizePhone(deliveryForm.patientPhone)
      const patientAddress = deliveryForm.patientAddress.trim()
      const items = deliveryForm.items
        .map((item) => ({
          drug_name: item.drug_name.trim(),
          qty: Math.max(1, Number(item.qty || 1)),
          price: Number(item.price || 0),
        }))
        .filter((item) => item.drug_name)

      if (!patientName || !patientPhone || !patientAddress || items.length === 0) {
        throw new Error("Name, phone number, delivery address, and at least one item are required.")
      }

      const { error } = await supabase.from("deliveries").insert([{
        pharmacy_id: pharmacyId,
        patient_name: patientName,
        patient_phone: patientPhone,
        patient_address: patientAddress,
        patient_location_lat: deliveryForm.patientLocationLat ? Number(deliveryForm.patientLocationLat) : null,
        patient_location_lng: deliveryForm.patientLocationLng ? Number(deliveryForm.patientLocationLng) : null,
        items,
        total_kes: items.reduce((sum, item) => sum + (item.qty * item.price), 0),
        rider_name: deliveryForm.riderName.trim() || null,
        rider_phone: normalizePhone(deliveryForm.riderPhone) || null,
      }])

      if (error) throw error

      setDeliveryForm(createEmptyDelivery())
      setTrackerPhone(patientPhone)
      setSubmitMessage("Your delivery request has been received. The pharmacy will update you when it is packed.")
      setActiveTab("updates")
      await fetchTrackingFeed(patientPhone, { showEmptySuccess: true })
    } catch (error) {
      setSubmitError(error?.message || "Unable to create the delivery request right now.")
    } finally {
      setSubmitting("")
    }
  }

  async function fetchTrackingFeed(phoneOverride, options = {}) {
    const phone = normalizePhone(phoneOverride ?? trackerPhone)

    if (!phone) {
      setTrackingMessage("Enter the same phone number you used when submitting the request.")
      setTrackingFeed([])
      return
    }

    setTrackingLoading(true)
    setTrackingMessage("")

    try {
      const [requestsResult, appointmentsResult, deliveriesResult, notificationsResult] = await Promise.all([
        supabase
          .from("prescription_requests")
          .select("id, drug_requested, condition_notes, status, created_at")
          .eq("pharmacy_id", pharmacyId)
          .eq("patient_phone", phone)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("appointments")
          .select("id, appointment_type, slot_datetime, condition_summary, patient_notes, status, created_at")
          .eq("pharmacy_id", pharmacyId)
          .eq("patient_phone", phone)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("deliveries")
          .select("id, patient_address, items, status, created_at")
          .eq("pharmacy_id", pharmacyId)
          .eq("patient_phone", phone)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("patient_notifications")
          .select("id, type, message, read, created_at")
          .eq("pharmacy_id", pharmacyId)
          .eq("patient_phone", phone)
          .order("created_at", { ascending: false })
          .limit(12),
      ])

      if (requestsResult.error) throw requestsResult.error
      if (appointmentsResult.error) throw appointmentsResult.error
      if (deliveriesResult.error) throw deliveriesResult.error
      if (notificationsResult.error) throw notificationsResult.error

      const feed = buildTrackingFeed({
        requests: requestsResult.data || [],
        appointments: appointmentsResult.data || [],
        deliveries: deliveriesResult.data || [],
        notifications: notificationsResult.data || [],
      })

      setTrackingFeed(feed)
      if (!feed.length) {
        setTrackingMessage(options.showEmptySuccess
          ? "Your request was submitted. Updates will appear here once the pharmacy reviews it."
          : "No records were found for that phone number at this pharmacy yet.")
      }
    } catch (error) {
      setTrackingFeed([])
      setTrackingMessage(error?.message || "Unable to load updates right now.")
    } finally {
      setTrackingLoading(false)
    }
  }

  function renderFeedback() {
    if (!submitMessage && !submitError) return null

    return (
      <div className={`patient-portal-feedback ${submitError ? "error" : "success"}`}>
        {submitError || submitMessage}
      </div>
    )
  }

  function renderPrescriptionForm() {
    return (
      <form className="patient-portal-form" onSubmit={handlePrescriptionSubmit}>
        <div className="patient-portal-grid">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={prescriptionForm.patientName} onChange={(event) => updatePrescription("patientName", event.target.value)} placeholder="Your full name" />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input className="form-input" value={prescriptionForm.patientPhone} onChange={(event) => updatePrescription("patientPhone", event.target.value)} placeholder="e.g. 07..." />
          </div>
          <div className="form-group patient-portal-span-full">
            <label className="form-label">What are you suffering from?</label>
            <textarea rows="5" value={prescriptionForm.conditionNotes} onChange={(event) => updatePrescription("conditionNotes", event.target.value)} placeholder="Describe your symptoms or condition briefly." />
          </div>
          <div className="form-group">
            <label className="form-label">Drug Needed</label>
            <input className="form-input" value={prescriptionForm.drugRequested} onChange={(event) => updatePrescription("drugRequested", event.target.value)} placeholder="If you know the medicine name, enter it here." />
          </div>
          <div className="form-group">
            <label className="form-label">Upload Prescription Photo</label>
            <input className="form-input" type="file" accept="image/*" onChange={(event) => setPrescriptionFile(event.target.files?.[0] || null)} />
          </div>
        </div>
        <button type="submit" className="btn btn-primary patient-portal-submit" disabled={submitting === "prescription"}>
          {submitting === "prescription" ? "Sending request..." : "Send Prescription Request"}
        </button>
      </form>
    )
  }

  function renderAppointmentForm() {
    return (
      <form className="patient-portal-form" onSubmit={handleAppointmentSubmit}>
        <div className="patient-portal-grid">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={appointmentForm.patientName} onChange={(event) => updateAppointment("patientName", event.target.value)} placeholder="Your full name" />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input className="form-input" value={appointmentForm.patientPhone} onChange={(event) => updateAppointment("patientPhone", event.target.value)} placeholder="e.g. 07..." />
          </div>
          <div className="form-group">
            <label className="form-label">Appointment Type</label>
            <select value={appointmentForm.appointmentType} onChange={(event) => updateAppointment("appointmentType", event.target.value)}>
              {APPOINTMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Preferred Time</label>
            <input className="form-input" type="datetime-local" value={appointmentForm.slotDatetime} onChange={(event) => updateAppointment("slotDatetime", event.target.value)} />
          </div>
          <div className="form-group patient-portal-span-full">
            <label className="form-label">Condition Summary</label>
            <textarea rows="4" value={appointmentForm.conditionSummary} onChange={(event) => updateAppointment("conditionSummary", event.target.value)} placeholder="What would you like to discuss with the pharmacist?" />
          </div>
          <div className="form-group patient-portal-span-full">
            <label className="form-label">Extra Notes</label>
            <textarea rows="4" value={appointmentForm.patientNotes} onChange={(event) => updateAppointment("patientNotes", event.target.value)} placeholder="Any extra details, allergies, or preferred contact instructions." />
          </div>
        </div>
        <button type="submit" className="btn btn-primary patient-portal-submit" disabled={submitting === "appointment"}>
          {submitting === "appointment" ? "Booking appointment..." : "Book Appointment"}
        </button>
      </form>
    )
  }

  function renderDeliveryForm() {
    return (
      <form className="patient-portal-form" onSubmit={handleDeliverySubmit}>
        <div className="patient-portal-grid">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={deliveryForm.patientName} onChange={(event) => updateDelivery("patientName", event.target.value)} placeholder="Your full name" />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input className="form-input" value={deliveryForm.patientPhone} onChange={(event) => updateDelivery("patientPhone", event.target.value)} placeholder="e.g. 07..." />
          </div>
          <div className="form-group patient-portal-span-full">
            <label className="form-label">Delivery Address</label>
            <textarea rows="3" value={deliveryForm.patientAddress} onChange={(event) => updateDelivery("patientAddress", event.target.value)} placeholder="Estate, building, floor, landmark, and any rider notes." />
          </div>
          <div className="form-group">
            <label className="form-label">Latitude</label>
            <input className="form-input" value={deliveryForm.patientLocationLat} onChange={(event) => updateDelivery("patientLocationLat", event.target.value)} placeholder="Optional" />
          </div>
          <div className="form-group">
            <label className="form-label">Longitude</label>
            <input className="form-input" value={deliveryForm.patientLocationLng} onChange={(event) => updateDelivery("patientLocationLng", event.target.value)} placeholder="Optional" />
          </div>
        </div>

        <div className="patient-portal-items-card">
          <div className="patient-portal-section-head">
            <div>
              <h3>Items Needed</h3>
              <p>Add one or more items for delivery.</p>
            </div>
            <button type="button" className="btn btn-outline" onClick={addDeliveryItem}>Add Item</button>
          </div>

          <div className="patient-portal-items-list">
            {deliveryForm.items.map((item, index) => (
              <div className="patient-portal-item-row" key={`item-${index}`}>
                <input className="form-input" value={item.drug_name} onChange={(event) => updateDeliveryItem(index, "drug_name", event.target.value)} placeholder="Drug name" />
                <input className="form-input" type="number" min="1" value={item.qty} onChange={(event) => updateDeliveryItem(index, "qty", event.target.value)} placeholder="Qty" />
                <input className="form-input" type="number" min="0" value={item.price} onChange={(event) => updateDeliveryItem(index, "price", event.target.value)} placeholder="Price (KES)" />
                <button type="button" className="patient-portal-remove" onClick={() => removeDeliveryItem(index)} disabled={deliveryForm.items.length === 1}>
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="patient-portal-total">Estimated total: <strong>KES {deliveryTotal.toLocaleString()}</strong></div>
        </div>

        <button type="submit" className="btn btn-primary patient-portal-submit" disabled={submitting === "delivery"}>
          {submitting === "delivery" ? "Sending delivery request..." : "Send Delivery Request"}
        </button>
      </form>
    )
  }

  function renderUpdatesPanel() {
    return (
      <div className="patient-portal-updates">
        <div className="patient-portal-track-bar">
          <input
            className="form-input"
            value={trackerPhone}
            onChange={(event) => setTrackerPhone(event.target.value)}
            placeholder="Enter your phone number"
          />
          <button type="button" className="btn btn-primary" onClick={() => fetchTrackingFeed()} disabled={trackingLoading}>
            {trackingLoading ? "Checking..." : "Check Updates"}
          </button>
        </div>

        {trackingMessage && <div className="patient-portal-track-message">{trackingMessage}</div>}

        {trackingFeed.length > 0 && (
          <div className="patient-portal-timeline">
            {trackingFeed.map((item) => (
              <div key={item.id} className="patient-portal-update-card">
                <div className="patient-portal-update-top">
                  <span className="patient-portal-update-type">{item.type}</span>
                  <span className={`patient-portal-status ${getStatusTone(item.status)}`}>{item.status}</span>
                </div>
                <div className="patient-portal-update-title">{item.title}</div>
                <div className="patient-portal-update-text">{item.summary}</div>
                <div className="patient-portal-update-time">{formatDateTime(item.createdAt)} · {timeAgo(item.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (portalLoading) {
    return <div className="patient-portal-loading">Loading patient portal...</div>
  }

  return (
    <>
      <SEO
        title={pharmacy?.name ? `${pharmacy.name} Patient Portal | PharmaCourse` : "Patient Portal | PharmaCourse"}
        description="Send prescription requests, book pharmacist appointments, request deliveries, and check updates online."
      />

      <div className="patient-portal-page">
        <section className="patient-portal-hero">
          <div className="patient-portal-hero-inner">
            <div className="patient-portal-badge">Patient Self-Service</div>
            <h1>{pharmacy?.name || "Patient Portal"}</h1>
            <p>
              Send your request directly to the pharmacy, book a consultation, or request delivery using one secure link.
            </p>
            {pharmacy && (
              <div className="patient-portal-branch-card">
                <div>
                  <strong>{pharmacy.name}</strong>
                  <span>{pharmacy.location || "Location not provided"}</span>
                </div>
              </div>
            )}
            {portalError && <div className="patient-portal-feedback error">{portalError}</div>}
          </div>
        </section>

        {!portalError && (
          <section className="patient-portal-content">
            <div className="patient-portal-shell">
              <aside className="patient-portal-sidebar">
                <div className="patient-portal-sidebar-card">
                  <h2>What do you need?</h2>
                  <p>Choose one option below. The pharmacy will receive it in PharmacyOS instantly.</p>
                  <div className="patient-portal-tab-list">
                    {PORTAL_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        className={`patient-portal-tab ${activeTab === tab.id ? "active" : ""}`}
                        onClick={() => {
                          setActiveTab(tab.id)
                          setSubmitMessage("")
                          setSubmitError("")
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="patient-portal-sidebar-card muted">
                  <h3>Emergency note</h3>
                  <p>
                    For chest pain, severe bleeding, difficulty breathing, stroke symptoms, or collapse, go to the nearest hospital or call emergency services immediately.
                  </p>
                </div>
              </aside>

              <main className="patient-portal-main">
                <div className="patient-portal-panel">
                  <div className="patient-portal-panel-head">
                    <div>
                      <h2>{PORTAL_TABS.find((tab) => tab.id === activeTab)?.label}</h2>
                      <p>
                        {activeTab === "prescription" && "Tell the pharmacist what you are suffering from and upload a prescription if you have one."}
                        {activeTab === "appointment" && "Book a pharmacist callback, video consultation, or pickup discussion."}
                        {activeTab === "delivery" && "Request medicine delivery and share the items plus your address."}
                        {activeTab === "updates" && "Check the current status of your submissions using your phone number."}
                      </p>
                    </div>
                  </div>

                  {renderFeedback()}
                  {activeTab === "prescription" && renderPrescriptionForm()}
                  {activeTab === "appointment" && renderAppointmentForm()}
                  {activeTab === "delivery" && renderDeliveryForm()}
                  {activeTab === "updates" && renderUpdatesPanel()}
                </div>
              </main>
            </div>
          </section>
        )}
      </div>
    </>
  )
}
