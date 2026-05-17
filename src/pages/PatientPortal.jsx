import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { pharmacyPortalSupabase as supabase } from "../lib/pharmacyPortalSupabase"
import SEO from "../components/SEO"
import "./PatientPortal.css"

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAADQ4Srgs_Q53E-3H"
let turnstileScriptPromise = null

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

const DIRECTORY_BATCH_SIZES = {
  mains: 12,
  branches: 18,
}

const PATIENT_RESPONSE_ACTIONS = {
  accept_alternative: {
    label: "Accept Alternative",
    shortLabel: "Accepted alternative",
    helper: "Tell the pharmacist you are okay with the substitute and ready for the next step.",
    successMessage: "Your acceptance has been sent to the pharmacy.",
    tone: "success",
  },
  request_callback: {
    label: "Request Pharmacist Call",
    shortLabel: "Requested pharmacist call",
    helper: "Ask the pharmacist to call you before you decide on the substitute.",
    successMessage: "Your callback request has been sent to the pharmacy.",
    tone: "info",
  },
  ask_another_option: {
    label: "Ask for Another Option",
    shortLabel: "Asked for another option",
    helper: "Let the pharmacy know this substitute is not the right fit and you need another option.",
    requiresNotes: true,
    successMessage: "Your request for another option has been sent to the pharmacy.",
    tone: "warning",
  },
  cancel_request: {
    label: "Cancel Request",
    shortLabel: "Asked to cancel request",
    helper: "Tell the pharmacy to stop preparing this request.",
    successMessage: "Your cancellation request has been sent to the pharmacy.",
    requiresNotes: true,
    tone: "danger",
  },
}

const FULFILLMENT_ACTIONS = {
  pickup: {
    label: "I Will Pick Up at Pharmacy",
    shortLabel: "Pickup selected",
    helper: "Tell the pharmacy you will collect the medicine at the branch.",
    successMessage: "Pickup confirmed. The pharmacy will keep your order ready for collection.",
    tone: "info",
  },
  delivery_requested: {
    label: "Request Delivery",
    shortLabel: "Delivery requested",
    helper: "Ask the pharmacy to arrange delivery for this prescription.",
    successMessage: "Your delivery request has been sent to the pharmacy.",
    requiresAddress: true,
    tone: "warning",
  },
}

function loadTurnstileScript() {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.turnstile) return Promise.resolve()
  if (turnstileScriptPromise) return turnstileScriptPromise

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-turnstile-script="true"]')

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener("error", () => reject(new Error("Unable to load security check.")), { once: true })
      return
    }

    const script = document.createElement("script")
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
    script.async = true
    script.defer = true
    script.dataset.turnstileScript = "true"
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Unable to load security check."))
    document.head.appendChild(script)
  })

  return turnstileScriptPromise
}

function TurnstileWidget({ formId, resetSignal, onVerify, onExpire }) {
  const [loadError, setLoadError] = useState("")
  const [widgetReady, setWidgetReady] = useState(false)
  const containerId = `turnstile-${formId}`
  const widgetIdRef = useRef(null)
  const renderTimeoutRef = useRef(null)
  const solvedRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function renderWidget() {
      if (!TURNSTILE_SITE_KEY) {
        setLoadError("Security check is not configured right now. Please try again later.")
        return
      }

      setLoadError("")
      setWidgetReady(false)
      solvedRef.current = false

      try {
        await loadTurnstileScript()
        if (cancelled || !window.turnstile) return

        const container = document.getElementById(containerId)
        if (!container) return

        container.innerHTML = ""
        widgetIdRef.current = window.turnstile.render(container, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "light",
          callback: (token) => {
            if (renderTimeoutRef.current) {
              window.clearTimeout(renderTimeoutRef.current)
            }
            solvedRef.current = true
            onVerify(token)
            setWidgetReady(true)
          },
          "expired-callback": () => {
            solvedRef.current = false
            onExpire()
            setWidgetReady(false)
          },
          "error-callback": () => {
            solvedRef.current = false
            onExpire()
            setLoadError("Security check failed. Please refresh and try again.")
            setWidgetReady(false)
          },
        })

        renderTimeoutRef.current = window.setTimeout(() => {
          if (!cancelled && !solvedRef.current) {
            setLoadError("Security check is taking too long. Please refresh it and try again.")
          }
        }, 12000)
      } catch (error) {
        setLoadError(error?.message || "Unable to load security check.")
      }
    }

    renderWidget()

    return () => {
      cancelled = true
      if (renderTimeoutRef.current) {
        window.clearTimeout(renderTimeoutRef.current)
      }
    }
  }, [containerId, onExpire, onVerify, resetSignal])

  function handleResetWidget() {
    setLoadError("")
    setWidgetReady(false)
    solvedRef.current = false
    onExpire()

    if (window.turnstile && widgetIdRef.current !== null) {
      window.turnstile.reset(widgetIdRef.current)
      return
    }

    setLoadError("Security check refreshed. Please wait a moment and try again.")
  }

  return (
    <div className="patient-portal-turnstile-wrap">
      <div id={containerId} className="patient-portal-turnstile" />
      {widgetReady && !loadError ? (
        <div className="patient-portal-turnstile-note">Security check complete. You can submit now.</div>
      ) : null}
      {loadError ? (
        <div className="patient-portal-turnstile-error">
          <span>{loadError}</span>
          <button type="button" className="patient-portal-turnstile-reset" onClick={handleResetWidget}>
            Refresh security check
          </button>
        </div>
      ) : null}
    </div>
  )
}

function createEmptyPrescription() {
  return {
    patientName: "",
    patientPhone: "",
    patientEmail: "",
    conditionNotes: "",
    requestedDrugs: [""],
  }
}

function createEmptyAppointment() {
  return {
    patientName: "",
    patientPhone: "",
    patientEmail: "",
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
    patientEmail: "",
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

function formatTokenLabel(value, fallback = "Pending") {
  if (!value) return fallback
  return String(value)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function getPatientResponseMeta(action) {
  if (!action) return null
  const config = PATIENT_RESPONSE_ACTIONS[action]
  if (!config) {
    return {
      label: formatTokenLabel(action, "Patient responded"),
      shortLabel: formatTokenLabel(action, "Patient responded"),
      helper: "The pharmacy has received the patient's reply.",
      tone: "info",
    }
  }
  return config
}

function buildPatientResponseSummary(item) {
  const responseMeta = getPatientResponseMeta(item.patient_response_action)
  if (!responseMeta) return ""
  const note = item.patient_response_notes ? `: ${item.patient_response_notes}` : ""
  return `Your response: ${responseMeta.shortLabel || responseMeta.label}${note}`
}

function getFulfillmentMeta(choice) {
  return FULFILLMENT_ACTIONS[choice] || null
}

function buildFulfillmentSummary(item) {
  const fulfillmentMeta = getFulfillmentMeta(item.patient_fulfillment_choice)
  if (!fulfillmentMeta) return ""

  const parts = [fulfillmentMeta.shortLabel || fulfillmentMeta.label]
  if (item.patient_fulfillment_address) {
    parts.push(`Address: ${item.patient_fulfillment_address}`)
  }
  if (item.patient_fulfillment_notes) {
    parts.push(`Note: ${item.patient_fulfillment_notes}`)
  }
  if (item.linked_delivery_status) {
    parts.push(`Delivery: ${formatTokenLabel(item.linked_delivery_status)}`)
  }

  return parts.join(" · ")
}

function normalizePortalActionLink(value) {
  const raw = String(value || "").trim()
  if (!raw) return ""

  if (/^(https?:\/\/|tel:|mailto:)/i.test(raw)) {
    return raw
  }

  if (/^\+?[0-9][0-9\s()-]{6,}$/.test(raw)) {
    const normalized = raw.replace(/[^\d+]/g, "")
    return normalized ? `tel:${normalized}` : ""
  }

  if (/^www\./i.test(raw)) {
    return `https://${raw}`
  }

  return `https://${raw}`
}

function buildTrackingFeed({ requests = [], appointments = [], deliveries = [], notifications = [] }) {
  return [
    ...requests.map((item) => ({
      id: `request-${item.id}`,
      requestId: item.id,
      typeKey: "request",
      type: "Prescription request",
      title: item.drug_requested || "Prescription request",
      status: item.status || "pending",
      statusLabel: formatTokenLabel(item.status),
      activityAt: item.patient_fulfillment_at || item.patient_response_at || item.updated_at || item.created_at,
      pharmacistNotes: item.pharmacist_notes || "",
      patientResponseAction: item.patient_response_action || "",
      patientResponseNotes: item.patient_response_notes || "",
      patientResponseAt: item.patient_response_at || "",
      patientFulfillmentChoice: item.patient_fulfillment_choice || "",
      patientFulfillmentNotes: item.patient_fulfillment_notes || "",
      patientFulfillmentAddress: item.patient_fulfillment_address || "",
      patientFulfillmentAt: item.patient_fulfillment_at || "",
      linkedDeliveryId: item.linked_delivery_id || "",
      linkedDeliveryStatus: item.linked_delivery_status || "",
      canRespond: item.status === "alternative_offered" && !item.patient_response_action,
      canChooseFulfillment: !item.patient_fulfillment_choice
        && !item.linked_delivery_id
        && (
          item.status === "approved"
          || item.status === "dispensed"
          || item.patient_response_action === "accept_alternative"
        ),
      summary: [
        item.condition_notes,
        item.pharmacist_notes ? `Pharmacist update: ${item.pharmacist_notes}` : "",
        buildPatientResponseSummary(item),
        buildFulfillmentSummary(item),
      ].filter(Boolean).join(" · ") || "Waiting for pharmacist review.",
      createdAt: item.created_at,
    })),
    ...appointments.map((item) => ({
      id: `appointment-${item.id}`,
      typeKey: "appointment",
      type: "Appointment",
      title: formatAppointmentType(item.appointment_type),
      status: item.status || "pending",
      statusLabel: formatTokenLabel(item.status),
      activityAt: item.updated_at || item.created_at,
      pharmacistResponse: item.pharmacist_response || "",
      videoLink: item.video_link || "",
      actionLink: normalizePortalActionLink(item.video_link || ""),
      summary: [
        item.condition_summary || item.patient_notes || "",
        item.pharmacist_response ? `Pharmacist note: ${item.pharmacist_response}` : "",
        item.video_link ? "Join or call link ready" : "",
      ].filter(Boolean).join(" Â· ") || formatDateTime(item.slot_datetime),
      createdAt: item.created_at,
    })),
    ...deliveries.map((item) => ({
      id: `delivery-${item.id}`,
      typeKey: "delivery",
      type: "Delivery",
      title: item.patient_address || "Delivery request",
      status: item.status || "pending",
      statusLabel: formatTokenLabel(item.status),
      activityAt: item.created_at,
      deliveryAddress: item.patient_address || "",
      deliveryItems: Array.isArray(item.items) ? item.items : [],
      deliveryPartnerType: item.delivery_partner_type || "",
      deliveryPartnerName: item.rider_name || "",
      deliveryPartnerPhone: item.rider_phone || "",
      deliveryEtaMinutes: item.estimated_delivery_minutes || "",
      summary: [
        Array.isArray(item.items) && item.items.length
          ? item.items.map((row) => `${row.drug_name || "Drug"} x${row.qty || 1}`).join(", ")
          : "Awaiting packing details.",
        item.delivery_partner_type || item.rider_name
          ? `Delivery partner: ${[item.delivery_partner_type, item.rider_name].filter(Boolean).join(" - ")}${item.rider_phone ? ` (${item.rider_phone})` : ""}`
          : "",
        item.estimated_delivery_minutes ? `ETA: ${item.estimated_delivery_minutes} min` : "",
      ].filter(Boolean).join(" · "),
      createdAt: item.created_at,
    })),
    ...notifications.map((item) => ({
      id: `notification-${item.id}`,
      typeKey: "notification",
      type: "Update",
      title: formatTokenLabel(item.type, "Notification"),
      status: item.read ? "read" : "new",
      statusLabel: item.read ? "Read" : "New",
      activityAt: item.created_at,
      summary: item.message || "Pharmacy update",
      createdAt: item.created_at,
    })),
  ].sort((a, b) => new Date(b.activityAt || b.createdAt || 0) - new Date(a.activityAt || a.createdAt || 0))
}

function buildGlobalTrackingMatches(matches = []) {
  return matches
    .map((match) => {
      const feed = buildTrackingFeed({
        requests: Array.isArray(match?.requests) ? match.requests : [],
        appointments: Array.isArray(match?.appointments) ? match.appointments : [],
        deliveries: Array.isArray(match?.deliveries) ? match.deliveries : [],
        notifications: Array.isArray(match?.notifications) ? match.notifications : [],
      })

      return {
        pharmacyId: match?.pharmacy_id || "",
        pharmacyName: match?.pharmacy_name || "Pharmacy",
        pharmacyLocation: match?.pharmacy_location || "Location not provided",
        lastActivityAt: match?.last_activity_at || feed[0]?.activityAt || feed[0]?.createdAt || "",
        feed,
      }
    })
    .filter((match) => match.pharmacyId && match.feed.length > 0)
    .sort((first, second) => new Date(second.lastActivityAt || 0) - new Date(first.lastActivityAt || 0))
}

function normalizeTrackingPayload(payload) {
  return {
    requests: Array.isArray(payload?.requests) ? payload.requests : [],
    appointments: Array.isArray(payload?.appointments) ? payload.appointments : [],
    deliveries: Array.isArray(payload?.deliveries) ? payload.deliveries : [],
    notifications: Array.isArray(payload?.notifications) ? payload.notifications : [],
  }
}

function parseLocationMeta(value) {
  const parts = String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => part.toLowerCase() !== "kenya")

  return {
    county: parts[0] || "",
    town: parts[1] || "",
    area: parts.slice(2).join(", "),
  }
}

function buildPharmacyOptions(rows = []) {
  const map = new Map(rows.map((row) => [row.id, row]))

  return rows
    .map((row) => {
      const parsedLocation = parseLocationMeta(row.location || "")
      const county = row.county || parsedLocation.county || ""
      const subcounty = row.subcounty || ""
      const town = row.town || parsedLocation.town || ""
      const area = row.area || parsedLocation.area || ""

      return {
        ...row,
        county,
        subcounty,
        town,
        area,
        isBranch: Boolean(row.parent_pharmacy_id),
        parentName: row.parent_pharmacy_id ? map.get(row.parent_pharmacy_id)?.name || "Main pharmacy" : "",
        locationLabel: [area, town, subcounty, county].filter(Boolean).join(", ") || row.location || "Location not provided",
      }
    })
    .sort((first, second) => {
      if (first.isBranch !== second.isBranch) return first.isBranch ? 1 : -1
      return `${first.parentName} ${first.name}`.localeCompare(`${second.parentName} ${second.name}`)
    })
}

export default function PatientPortal() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const pharmacyId = searchParams.get("pharmacy") || searchParams.get("branch") || ""
  const [activeTab, setActiveTab] = useState("prescription")
  const [pharmacy, setPharmacy] = useState(null)
  const [pharmacyOptions, setPharmacyOptions] = useState([])
  const [portalLoading, setPortalLoading] = useState(true)
  const [portalError, setPortalError] = useState("")
  const [directoryError, setDirectoryError] = useState("")
  const [branchSearch, setBranchSearch] = useState("")
  const [countyFilter, setCountyFilter] = useState("")
  const [subcountyFilter, setSubcountyFilter] = useState("")
  const [townFilter, setTownFilter] = useState("")
  const [selectedDirectoryMainId, setSelectedDirectoryMainId] = useState("")
  const [visibleMainCount, setVisibleMainCount] = useState(DIRECTORY_BATCH_SIZES.mains)
  const [visibleBranchCount, setVisibleBranchCount] = useState(DIRECTORY_BATCH_SIZES.branches)
  const [prescriptionForm, setPrescriptionForm] = useState(createEmptyPrescription)
  const [prescriptionFile, setPrescriptionFile] = useState(null)
  const [appointmentForm, setAppointmentForm] = useState(createEmptyAppointment)
  const [deliveryForm, setDeliveryForm] = useState(createEmptyDelivery)
  const [trackerPhone, setTrackerPhone] = useState("")
  const [trackingFeed, setTrackingFeed] = useState([])
  const [trackingMatches, setTrackingMatches] = useState([])
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [trackingMessage, setTrackingMessage] = useState("")
  const [trackingActionMessage, setTrackingActionMessage] = useState("")
  const [trackingActionError, setTrackingActionError] = useState("")
  const [trackingResponseNotes, setTrackingResponseNotes] = useState({})
  const [trackingFulfillmentNotes, setTrackingFulfillmentNotes] = useState({})
  const [trackingDeliveryAddresses, setTrackingDeliveryAddresses] = useState({})
  const [respondingActionKey, setRespondingActionKey] = useState("")
  const [submitting, setSubmitting] = useState("")
  const [submitMessage, setSubmitMessage] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [turnstileTokens, setTurnstileTokens] = useState({
    prescription: "",
    appointment: "",
    delivery: "",
    response: "",
  })
  const [turnstileResetKeys, setTurnstileResetKeys] = useState({
    prescription: 0,
    appointment: 0,
    delivery: 0,
    response: 0,
  })

  useEffect(() => {
    let cancelled = false

    async function loadPharmacy() {
      setPortalLoading(true)
      setPortalError("")
      setDirectoryError("")

      const { data, error } = await supabase.rpc("public_patient_portal_pharmacies")

      if (cancelled) return

      if (error) {
        console.warn("Pharmacy directory lookup failed:", error.message)
        setDirectoryError("We could not load the branch directory right now. Please try again in a moment.")
        setPharmacy(null)
        setPharmacyOptions([])
        if (pharmacyId) {
          setPortalError("We could not verify that pharmacy right now. Please choose a branch again.")
        }
      } else {
        const rows = Array.isArray(data) ? data : []
        const options = buildPharmacyOptions(rows)
        setPharmacyOptions(options)

        if (!pharmacyId) {
          setPharmacy(null)
        } else {
          const matchedPharmacy = options.find((option) => String(option.id) === String(pharmacyId)) || null
          setPharmacy(matchedPharmacy)
          if (!matchedPharmacy) {
            setPortalError("We could not find that pharmacy or branch. Please choose from the directory below.")
          }
        }
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

  const visiblePharmacyOptions = useMemo(() => {
    const query = branchSearch.trim().toLowerCase()
    return pharmacyOptions.filter((option) => {
      const matchesQuery = !query || (
        `${option.name} ${option.parentName} ${option.locationLabel} ${option.county} ${option.subcounty || ""} ${option.town} ${option.area}`
          .toLowerCase()
          .includes(query)
      )

      const matchesCounty = !countyFilter || option.county === countyFilter
      const matchesSubcounty = !subcountyFilter || option.subcounty === subcountyFilter
      const matchesTown = !townFilter || option.town === townFilter || option.area === townFilter

      return matchesQuery && matchesCounty && matchesSubcounty && matchesTown
    })
  }, [branchSearch, countyFilter, subcountyFilter, townFilter, pharmacyOptions])

  const mainPharmacies = useMemo(
    () => visiblePharmacyOptions.filter((option) => !option.isBranch),
    [visiblePharmacyOptions]
  )

  const selectedDirectoryMain = useMemo(
    () => mainPharmacies.find((option) => option.id === selectedDirectoryMainId) || null,
    [mainPharmacies, selectedDirectoryMainId]
  )

  const branchCountsByParent = useMemo(() => (
    pharmacyOptions.reduce((map, option) => {
      if (!option.isBranch || !option.parent_pharmacy_id) return map
      map.set(option.parent_pharmacy_id, (map.get(option.parent_pharmacy_id) || 0) + 1)
      return map
    }, new Map())
  ), [pharmacyOptions])

  const branchPharmacies = useMemo(() => {
    const query = branchSearch.trim().toLowerCase()
    const rows = pharmacyOptions.filter((option) => option.isBranch)
    const scopedRows = selectedDirectoryMainId
      ? rows.filter((option) => option.parent_pharmacy_id === selectedDirectoryMainId)
      : rows

    if (!query) return scopedRows

    return scopedRows.filter((option) => (
      `${option.name} ${option.parentName} ${option.locationLabel} ${option.county} ${option.subcounty || ""} ${option.town} ${option.area}`
        .toLowerCase()
        .includes(query)
    ))
  }, [branchSearch, pharmacyOptions, selectedDirectoryMainId])

  const visibleMainPharmacies = useMemo(
    () => mainPharmacies.slice(0, visibleMainCount),
    [mainPharmacies, visibleMainCount]
  )

  const visibleBranchPharmacies = useMemo(
    () => branchPharmacies.slice(0, visibleBranchCount),
    [branchPharmacies, visibleBranchCount]
  )

  const groupedVisibleBranches = useMemo(() => {
    const nearest = []
    const sameCounty = []
    const others = []

    visibleBranchPharmacies.forEach((option) => {
      const matchesTown = townFilter && (option.town === townFilter || option.area === townFilter)
      const matchesSubcounty = subcountyFilter && option.subcounty === subcountyFilter
      const matchesCounty = countyFilter && option.county === countyFilter
      const matchesMainCounty = !countyFilter && !townFilter && selectedDirectoryMain?.county && option.county === selectedDirectoryMain.county

      if (matchesTown) {
        nearest.push(option)
        return
      }

      if (matchesSubcounty) {
        sameCounty.push(option)
        return
      }

      if (matchesCounty || matchesMainCounty) {
        sameCounty.push(option)
        return
      }

      others.push(option)
    })

    return { nearest, sameCounty, others }
  }, [countyFilter, selectedDirectoryMain?.county, subcountyFilter, townFilter, visibleBranchPharmacies])

  const branchGroupLabels = useMemo(() => ({
    nearest: townFilter
      ? `Nearest branches in ${townFilter}`
      : subcountyFilter
        ? `Branches in ${subcountyFilter}`
      : countyFilter
        ? `Best matches in ${countyFilter}`
        : selectedDirectoryMain?.county
          ? `Branches in ${selectedDirectoryMain.county}`
          : "Best local matches",
    sameCounty: countyFilter
      ? `Other branches outside ${countyFilter}`
      : subcountyFilter
        ? `Other branches outside ${subcountyFilter}`
      : selectedDirectoryMain?.county
        ? `Other branches outside ${selectedDirectoryMain.county}`
        : "Other branches",
    others: "Other branches in this pharmacy",
  }), [countyFilter, selectedDirectoryMain?.county, subcountyFilter, townFilter])

  const countyOptions = useMemo(() => (
    [...new Set(
      pharmacyOptions
        .map((option) => option.county)
        .filter(Boolean)
    )].sort((first, second) => first.localeCompare(second))
  ), [pharmacyOptions])

  const subcountyOptions = useMemo(() => (
    [...new Set(
      pharmacyOptions
        .filter((option) => {
          if (!countyFilter || option.county === countyFilter) {
            if (!selectedDirectoryMainId) return true
            return !option.isBranch || option.parent_pharmacy_id === selectedDirectoryMainId || option.id === selectedDirectoryMainId
          }
          return false
        })
        .map((option) => option.subcounty)
        .filter(Boolean)
    )].sort((first, second) => first.localeCompare(second))
  ), [countyFilter, pharmacyOptions, selectedDirectoryMainId])

  const townOptions = useMemo(() => (
    [...new Set(
      pharmacyOptions
        .filter((option) => {
          if ((!countyFilter || option.county === countyFilter) && (!subcountyFilter || option.subcounty === subcountyFilter)) {
            if (!selectedDirectoryMainId) return true
            return !option.isBranch || option.parent_pharmacy_id === selectedDirectoryMainId || option.id === selectedDirectoryMainId
          }
          return false
        })
        .flatMap((option) => [option.town, option.area])
        .filter(Boolean)
    )].sort((first, second) => first.localeCompare(second))
  ), [countyFilter, subcountyFilter, pharmacyOptions, selectedDirectoryMainId])

  const hasActivePharmacy = Boolean(pharmacyId && pharmacy)

  useEffect(() => {
    setVisibleMainCount(DIRECTORY_BATCH_SIZES.mains)
    setVisibleBranchCount(DIRECTORY_BATCH_SIZES.branches)
  }, [branchSearch, countyFilter, subcountyFilter, townFilter])

  useEffect(() => {
    if (selectedDirectoryMainId && !mainPharmacies.some((option) => option.id === selectedDirectoryMainId)) {
      setSelectedDirectoryMainId(mainPharmacies[0]?.id || "")
      return
    }

    if (!selectedDirectoryMainId && mainPharmacies.length === 1) {
      setSelectedDirectoryMainId(mainPharmacies[0].id)
    }
  }, [mainPharmacies, selectedDirectoryMainId])

  function updatePrescription(field, value) {
    setPrescriptionForm((prev) => ({ ...prev, [field]: value }))
  }

  function updateAppointment(field, value) {
    setAppointmentForm((prev) => ({ ...prev, [field]: value }))
  }

  function updateRequestedDrug(index, value) {
    setPrescriptionForm((prev) => ({
      ...prev,
      requestedDrugs: prev.requestedDrugs.map((item, itemIndex) => (
        itemIndex === index ? value : item
      )),
    }))
  }

  function addRequestedDrug() {
    setPrescriptionForm((prev) => ({
      ...prev,
      requestedDrugs: [...prev.requestedDrugs, ""],
    }))
  }

  function removeRequestedDrug(index) {
    setPrescriptionForm((prev) => ({
      ...prev,
      requestedDrugs: prev.requestedDrugs.filter((_, itemIndex) => itemIndex !== index),
    }))
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

  function handleSelectPharmacy(option) {
    navigate(
      `/patient?pharmacy=${encodeURIComponent(option.id)}&branch_name=${encodeURIComponent(option.name || "")}&branch_location=${encodeURIComponent(option.locationLabel || option.location || "")}`,
    )
    setPortalError("")
    setSubmitError("")
    setSubmitMessage("")
    setTrackingMessage("")
    setTrackingActionMessage("")
    setTrackingActionError("")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function clearSelectedPharmacy() {
    setSearchParams({})
    setPharmacy(null)
    setPortalError("")
    setSubmitError("")
    setSubmitMessage("")
    setTrackingFeed([])
    setTrackingMessage("")
    setTrackingActionMessage("")
    setTrackingActionError("")
    setBranchSearch("")
    setCountyFilter("")
    setSubcountyFilter("")
    setTownFilter("")
    setSelectedDirectoryMainId("")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function clearDirectoryFilters() {
    setBranchSearch("")
    setCountyFilter("")
    setSubcountyFilter("")
    setTownFilter("")
  }

  function browseMainPharmacy(option) {
    setSelectedDirectoryMainId(option.id)
    window.scrollTo({ top: 260, behavior: "smooth" })
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

  function setTurnstileToken(formId, token) {
    setTurnstileTokens((prev) => ({ ...prev, [formId]: token || "" }))
  }

  function resetTurnstile(formId) {
    setTurnstileTokens((prev) => ({ ...prev, [formId]: "" }))
    setTurnstileResetKeys((prev) => ({ ...prev, [formId]: prev[formId] + 1 }))
  }

  async function submitPortalRequest(submissionType, payload, formId) {
    const turnstileToken = turnstileTokens[formId]

    if (!TURNSTILE_SITE_KEY) {
      throw new Error("Security check is not configured right now. Please try again later.")
    }

    if (!turnstileToken) {
      throw new Error("Complete the security check before submitting.")
    }

    const { data, error } = await supabase.functions.invoke("patient-portal-submit", {
      body: {
        submissionType,
        turnstileToken,
        payload,
      },
    })

    if (error) throw error
    if (data?.error) throw new Error(data.error)

    resetTurnstile(formId)
    return data
  }

  async function submitPortalResponse(requestId, responseAction) {
    const turnstileToken = turnstileTokens.response
    const responseMeta = getPatientResponseMeta(responseAction)
    const responseNotes = String(trackingResponseNotes[requestId] || "").trim()

    if (!TURNSTILE_SITE_KEY) {
      throw new Error("Security check is not configured right now. Please try again later.")
    }

    if (!turnstileToken) {
      throw new Error("Complete the security check before replying to the pharmacist.")
    }

    if (responseMeta?.requiresNotes && !responseNotes) {
      throw new Error("Add a short note so the pharmacist understands what you need.")
    }

    const { data, error } = await supabase.functions.invoke("patient-portal-respond", {
      body: {
        requestId,
        patientPhone: normalizePhone(trackerPhone),
        responseAction,
        responseNotes: responseNotes || null,
        turnstileToken,
      },
    })

    if (error) throw error
    if (data?.error) throw new Error(data.error)

    resetTurnstile("response")
    setTrackingResponseNotes((prev) => ({ ...prev, [requestId]: "" }))
    return data
  }

  async function submitPortalFulfillment(requestId, fulfillmentChoice) {
    const turnstileToken = turnstileTokens.response
    const fulfillmentMeta = getFulfillmentMeta(fulfillmentChoice)
    const fulfillmentNotes = String(trackingFulfillmentNotes[requestId] || "").trim()
    const fulfillmentAddress = String(trackingDeliveryAddresses[requestId] || "").trim()

    if (!TURNSTILE_SITE_KEY) {
      throw new Error("Security check is not configured right now. Please try again later.")
    }

    if (!turnstileToken) {
      throw new Error("Complete the security check before replying to the pharmacist.")
    }

    if (fulfillmentMeta?.requiresAddress && !fulfillmentAddress) {
      throw new Error("Add your delivery address before requesting delivery.")
    }

    const { data, error } = await supabase.functions.invoke("patient-portal-fulfillment", {
      body: {
        requestId,
        patientPhone: normalizePhone(trackerPhone),
        fulfillmentChoice,
        fulfillmentNotes: fulfillmentNotes || null,
        fulfillmentAddress: fulfillmentChoice === "delivery_requested" ? fulfillmentAddress : null,
        turnstileToken,
      },
    })

    if (error) throw error
    if (data?.error) throw new Error(data.error)

    resetTurnstile("response")
    setTrackingFulfillmentNotes((prev) => ({ ...prev, [requestId]: "" }))
    setTrackingDeliveryAddresses((prev) => ({ ...prev, [requestId]: "" }))
    return data
  }

  const handlePrescriptionVerify = useCallback((token) => setTurnstileToken("prescription", token), [])
  const handlePrescriptionExpire = useCallback(() => setTurnstileToken("prescription", ""), [])
  const handleAppointmentVerify = useCallback((token) => setTurnstileToken("appointment", token), [])
  const handleAppointmentExpire = useCallback(() => setTurnstileToken("appointment", ""), [])
  const handleDeliveryVerify = useCallback((token) => setTurnstileToken("delivery", token), [])
  const handleDeliveryExpire = useCallback(() => setTurnstileToken("delivery", ""), [])
  const handleResponseVerify = useCallback((token) => setTurnstileToken("response", token), [])
  const handleResponseExpire = useCallback(() => setTurnstileToken("response", ""), [])

  async function handlePrescriptionSubmit(event) {
    event.preventDefault()
    setSubmitting("prescription")
    setSubmitMessage("")
    setSubmitError("")

    try {
      const patientName = prescriptionForm.patientName.trim()
      const patientPhone = normalizePhone(prescriptionForm.patientPhone)
      const patientEmail = prescriptionForm.patientEmail.trim().toLowerCase()
      const conditionNotes = prescriptionForm.conditionNotes.trim()
      const requestedDrugs = prescriptionForm.requestedDrugs
        .map((item) => String(item || "").trim())
        .filter(Boolean)
      const drugRequested = requestedDrugs.join(", ")

      if (!patientName || !patientPhone || !conditionNotes) {
        throw new Error("Name, phone number, and condition details are required.")
      }

      const prescriptionImageUrl = await uploadPrescriptionImage()

      await submitPortalRequest("prescription", {
        pharmacy_id: pharmacyId,
        branch_id: pharmacyId,
        patient_name: patientName,
        patient_phone: patientPhone,
        patient_email: patientEmail || null,
        condition_notes: conditionNotes,
        drug_requested: drugRequested || null,
        prescription_image_url: prescriptionImageUrl || null,
      }, "prescription")

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
      const patientEmail = appointmentForm.patientEmail.trim().toLowerCase()
      const conditionSummary = appointmentForm.conditionSummary.trim()

      if (!patientName || !patientPhone || !conditionSummary || !appointmentForm.slotDatetime) {
        throw new Error("Name, phone number, appointment time, and condition summary are required.")
      }

      await submitPortalRequest("appointment", {
        pharmacy_id: pharmacyId,
        patient_name: patientName,
        patient_phone: patientPhone,
        patient_email: patientEmail || null,
        appointment_type: appointmentForm.appointmentType,
        slot_datetime: new Date(appointmentForm.slotDatetime).toISOString(),
        status: "pending",
        patient_notes: appointmentForm.patientNotes.trim() || null,
        condition_summary: conditionSummary,
      }, "appointment")

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
      const patientEmail = deliveryForm.patientEmail.trim().toLowerCase()
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

      await submitPortalRequest("delivery", {
        pharmacy_id: pharmacyId,
        patient_name: patientName,
        patient_phone: patientPhone,
        patient_email: patientEmail || null,
        patient_address: patientAddress,
        patient_location_lat: deliveryForm.patientLocationLat ? Number(deliveryForm.patientLocationLat) : null,
        patient_location_lng: deliveryForm.patientLocationLng ? Number(deliveryForm.patientLocationLng) : null,
        items,
        total_kes: items.reduce((sum, item) => sum + (item.qty * item.price), 0),
        rider_name: deliveryForm.riderName.trim() || null,
        rider_phone: normalizePhone(deliveryForm.riderPhone) || null,
      }, "delivery")

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

  async function handleAlternativeResponse(item, responseAction) {
    const responseMeta = getPatientResponseMeta(responseAction)
    if (!item?.requestId || !responseMeta) return

    setRespondingActionKey(`${item.requestId}-${responseAction}`)
    setTrackingActionMessage("")
    setTrackingActionError("")

    try {
      const data = await submitPortalResponse(item.requestId, responseAction)
      await fetchTrackingFeed(trackerPhone)
      setTrackingActionMessage(data?.message || responseMeta.successMessage || "Your response has been sent to the pharmacy.")
    } catch (error) {
      setTrackingActionError(error?.message || "Unable to send your response right now.")
    } finally {
      setRespondingActionKey("")
    }
  }

  async function handleFulfillmentChoice(item, fulfillmentChoice) {
    const fulfillmentMeta = getFulfillmentMeta(fulfillmentChoice)
    if (!item?.requestId || !fulfillmentMeta) return

    setRespondingActionKey(`${item.requestId}-${fulfillmentChoice}`)
    setTrackingActionMessage("")
    setTrackingActionError("")

    try {
      const data = await submitPortalFulfillment(item.requestId, fulfillmentChoice)
      await fetchTrackingFeed(trackerPhone)
      setTrackingActionMessage(data?.message || fulfillmentMeta.successMessage || "Your preference has been sent to the pharmacy.")
    } catch (error) {
      setTrackingActionError(error?.message || "Unable to send your pickup or delivery choice right now.")
    } finally {
      setRespondingActionKey("")
    }
  }

  async function fetchTrackingFeed(phoneOverride, options = {}) {
    const phone = normalizePhone(phoneOverride ?? trackerPhone)

    if (!phone) {
      setTrackingMessage("Enter the same phone number you used when submitting the request.")
      setTrackingFeed([])
      setTrackingMatches([])
      return
    }

    setTrackingLoading(true)
    setTrackingMessage("")
    setTrackingActionMessage("")
    setTrackingActionError("")
    setTrackingFeed([])
    setTrackingMatches([])

    try {
      if (pharmacyId) {
        const { data, error } = await supabase.rpc("public_patient_portal_updates", {
          target_pharmacy_id: pharmacyId,
          target_phone: phone,
        })

        if (error) throw error

        const normalized = normalizeTrackingPayload(data)
        const feed = buildTrackingFeed(normalized)

        setTrackingFeed(feed)
        if (!feed.length) {
          setTrackingMessage(options.showEmptySuccess
            ? "Your request was submitted. Updates will appear here once the pharmacy reviews it."
            : "No records were found for that phone number at this pharmacy yet.")
        }
      } else {
        const { data, error } = await supabase.rpc("public_patient_portal_updates_by_phone", {
          target_phone: phone,
        })

        if (error) throw error

        const matches = buildGlobalTrackingMatches(Array.isArray(data?.matches) ? data.matches : [])
        setTrackingMatches(matches)

        if (!matches.length) {
          setTrackingMessage("No records were found for that phone number yet.")
        } else if (matches.length === 1) {
          setTrackingMessage("We found your latest update. Open the pharmacy below if you want to continue there.")
        } else {
          setTrackingMessage(`We found updates in ${matches.length} pharmacy locations. Choose the right one below.`)
        }
      }
    } catch (error) {
      setTrackingFeed([])
      setTrackingMatches([])
      setTrackingMessage(error?.message || "Unable to load updates right now.")
    } finally {
      setTrackingLoading(false)
    }
  }

  function openTrackedPharmacy(match) {
    if (!match?.pharmacyId) return
    navigate(
      `/patient/track?pharmacy=${encodeURIComponent(match.pharmacyId)}&phone=${encodeURIComponent(trackerPhone.trim())}&branch_name=${encodeURIComponent(match.pharmacyName || "")}&branch_location=${encodeURIComponent(match.pharmacyLocation || "")}`,
    )
    setTrackingMessage("")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function renderFeedback() {
    if (!submitMessage && !submitError) return null

    return (
      <div className={`patient-portal-feedback ${submitError ? "error" : "success"}`}>
        {submitError || submitMessage}
      </div>
    )
  }

  function renderDeliveryDetailsBox(item) {
    if (item.typeKey !== "delivery") return null

    const detailLines = []
    if (item.deliveryAddress) detailLines.push(`Address: ${item.deliveryAddress}`)
    if (item.deliveryItems?.length) {
      detailLines.push(`Items: ${item.deliveryItems.map((row) => `${row.drug_name || "Drug"} x${row.qty || 1}`).join(", ")}`)
    }

    const partnerLabel = [item.deliveryPartnerType, item.deliveryPartnerName].filter(Boolean).join(" - ")
    if (partnerLabel) {
      detailLines.push(`Delivery partner: ${partnerLabel}${item.deliveryPartnerPhone ? ` (${item.deliveryPartnerPhone})` : ""}`)
    }

    if (item.deliveryEtaMinutes) {
      detailLines.push(`Estimated arrival: about ${item.deliveryEtaMinutes} minutes`)
    }

    if (!detailLines.length) return null

    return (
      <div className="patient-portal-response-box info">
        <strong>Delivery details</strong>
        {detailLines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </div>
    )
  }

  function renderPatientResponseBox(item) {
    const responseMeta = getPatientResponseMeta(item.patientResponseAction)
    if (!responseMeta) return null

    return (
      <div className={`patient-portal-response-box ${responseMeta.tone || "info"}`}>
        <strong>{responseMeta.shortLabel || responseMeta.label}</strong>
        <span>{responseMeta.helper}</span>
        {item.patientResponseNotes && (
          <div className="patient-portal-response-note">Your note: {item.patientResponseNotes}</div>
        )}
        {item.patientResponseAt && (
          <div className="patient-portal-response-time">
            Sent {formatDateTime(item.patientResponseAt)} · {timeAgo(item.patientResponseAt)}
          </div>
        )}
      </div>
    )
  }

  function renderFulfillmentChoiceBox(item) {
    const fulfillmentMeta = getFulfillmentMeta(item.patientFulfillmentChoice)
    if (!fulfillmentMeta) return null

    return (
      <div className={`patient-portal-response-box ${fulfillmentMeta.tone || "info"}`}>
        <strong>{fulfillmentMeta.shortLabel || fulfillmentMeta.label}</strong>
        <span>{fulfillmentMeta.helper}</span>
        {item.patientFulfillmentAddress && (
          <div className="patient-portal-response-note">Address: {item.patientFulfillmentAddress}</div>
        )}
        {item.patientFulfillmentNotes && (
          <div className="patient-portal-response-note">Your note: {item.patientFulfillmentNotes}</div>
        )}
        {item.linkedDeliveryStatus && (
          <div className="patient-portal-response-note">Delivery status: {formatTokenLabel(item.linkedDeliveryStatus)}</div>
        )}
        {item.patientFulfillmentAt && (
          <div className="patient-portal-response-time">
            Sent {formatDateTime(item.patientFulfillmentAt)} · {timeAgo(item.patientFulfillmentAt)}
          </div>
        )}
      </div>
    )
  }

  function renderAppointmentActionBox(item) {
    if (item.typeKey !== "appointment") return null
    if (!item.pharmacistResponse && !item.actionLink) return null

    return (
      <div className="patient-portal-response-box info">
        <strong>Appointment details</strong>
        <span>
          {item.pharmacistResponse || "The pharmacist has shared the next step for your appointment."}
        </span>
        {item.actionLink && (
          <a
            className="btn btn-outline patient-portal-inline-action"
            href={item.actionLink}
            target="_blank"
            rel="noreferrer"
          >
            {item.status === "confirmed" ? "Open appointment link" : "Open call details"}
          </a>
        )}
      </div>
    )
  }

  function renderRequestResponseActions(item) {
    if (!item?.canRespond) return null

    return (
      <div className="patient-portal-response-actions">
        <div className="patient-portal-response-head">
          <strong>Choose your next step</strong>
          <span>The pharmacist has offered a substitute. Reply here so they know how to continue.</span>
        </div>

        <textarea
          rows="3"
          value={trackingResponseNotes[item.requestId] || ""}
          onChange={(event) => setTrackingResponseNotes((prev) => ({ ...prev, [item.requestId]: event.target.value }))}
          placeholder="Add any extra note for the pharmacist (optional unless you need another option or want to cancel)."
        />

        <div className="patient-portal-response-button-row">
          {Object.entries(PATIENT_RESPONSE_ACTIONS).map(([action, config]) => {
            const actionKey = `${item.requestId}-${action}`
            return (
              <button
                key={action}
                type="button"
                className={`btn ${action === "cancel_request" ? "btn-outline" : "btn-primary"} patient-response-btn ${config.tone || "info"}`}
                onClick={() => handleAlternativeResponse(item, action)}
                disabled={respondingActionKey === actionKey}
              >
                {respondingActionKey === actionKey ? "Sending..." : config.label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  function renderFulfillmentActions(item) {
    if (!item?.canChooseFulfillment) return null

    return (
      <div className="patient-portal-response-actions">
        <div className="patient-portal-response-head">
          <strong>How would you like to receive this order?</strong>
          <span>Choose pickup if you will collect the medicine yourself, or request delivery so the pharmacy can arrange dispatch.</span>
        </div>

        <input
          className="form-input"
          value={trackingDeliveryAddresses[item.requestId] || ""}
          onChange={(event) => setTrackingDeliveryAddresses((prev) => ({ ...prev, [item.requestId]: event.target.value }))}
          placeholder="Delivery address for this order (required only for delivery)"
        />

        <textarea
          rows="3"
          value={trackingFulfillmentNotes[item.requestId] || ""}
          onChange={(event) => setTrackingFulfillmentNotes((prev) => ({ ...prev, [item.requestId]: event.target.value }))}
          placeholder="Add any note for pickup or delivery (optional)."
        />

        <div className="patient-portal-response-button-row">
          {Object.entries(FULFILLMENT_ACTIONS).map(([choice, config]) => {
            const actionKey = `${item.requestId}-${choice}`
            return (
              <button
                key={choice}
                type="button"
                className={`btn ${choice === "pickup" ? "btn-outline" : "btn-primary"} patient-response-btn ${config.tone || "info"}`}
                onClick={() => handleFulfillmentChoice(item, choice)}
                disabled={respondingActionKey === actionKey}
              >
                {respondingActionKey === actionKey ? "Sending..." : config.label}
              </button>
            )
          })}
        </div>
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
            <label className="form-label">Email Address (optional)</label>
            <input className="form-input" type="email" value={prescriptionForm.patientEmail} onChange={(event) => updatePrescription("patientEmail", event.target.value)} placeholder="For email updates" />
          </div>
          <div className="form-group patient-portal-span-full">
            <label className="form-label">What are you suffering from?</label>
            <textarea rows="5" value={prescriptionForm.conditionNotes} onChange={(event) => updatePrescription("conditionNotes", event.target.value)} placeholder="Describe your symptoms or condition briefly." />
          </div>
          <div className="form-group patient-portal-span-full">
            <div className="patient-portal-section-head compact">
              <div>
                <label className="form-label">Drugs Needed</label>
                <p>Add one or more medicines if you know their names.</p>
              </div>
              <button type="button" className="btn btn-outline" onClick={addRequestedDrug}>Add Drug</button>
            </div>
            <div className="patient-portal-items-list compact">
              {prescriptionForm.requestedDrugs.map((drug, index) => (
                <div className="patient-portal-item-row compact" key={`rx-drug-${index}`}>
                  <input
                    className="form-input"
                    value={drug}
                    onChange={(event) => updateRequestedDrug(index, event.target.value)}
                    placeholder={`Drug ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="patient-portal-remove"
                    onClick={() => removeRequestedDrug(index)}
                    disabled={prescriptionForm.requestedDrugs.length === 1}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Upload Prescription Photo</label>
            <input className="form-input" type="file" accept="image/*" onChange={(event) => setPrescriptionFile(event.target.files?.[0] || null)} />
          </div>
        </div>
        <TurnstileWidget
          formId="prescription"
          resetSignal={turnstileResetKeys.prescription}
          onVerify={handlePrescriptionVerify}
          onExpire={handlePrescriptionExpire}
        />
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
          <div className="form-group patient-portal-span-full">
            <label className="form-label">Email Address (optional)</label>
            <input className="form-input" type="email" value={appointmentForm.patientEmail} onChange={(event) => updateAppointment("patientEmail", event.target.value)} placeholder="For email updates" />
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
        <TurnstileWidget
          formId="appointment"
          resetSignal={turnstileResetKeys.appointment}
          onVerify={handleAppointmentVerify}
          onExpire={handleAppointmentExpire}
        />
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
            <label className="form-label">Email Address (optional)</label>
            <input className="form-input" type="email" value={deliveryForm.patientEmail} onChange={(event) => updateDelivery("patientEmail", event.target.value)} placeholder="For email updates" />
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
        <TurnstileWidget
          formId="delivery"
          resetSignal={turnstileResetKeys.delivery}
          onVerify={handleDeliveryVerify}
          onExpire={handleDeliveryExpire}
        />

        <button type="submit" className="btn btn-primary patient-portal-submit" disabled={submitting === "delivery"}>
          {submitting === "delivery" ? "Sending delivery request..." : "Send Delivery Request"}
        </button>
      </form>
    )
  }

  function renderUpdatesPanel() {
    const hasActionableRequest = trackingFeed.some((item) => item.canRespond || item.canChooseFulfillment)

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
        {trackingActionMessage && <div className="patient-portal-feedback success">{trackingActionMessage}</div>}
        {trackingActionError && <div className="patient-portal-feedback error">{trackingActionError}</div>}

        {hasActionableRequest && (
          <div className="patient-portal-response-gate">
            <div className="patient-portal-response-head">
              <strong>Reply to the pharmacist</strong>
              <span>Complete the security check once, then choose how you want the pharmacy to continue.</span>
            </div>
            <TurnstileWidget
              formId="response"
              resetSignal={turnstileResetKeys.response}
              onVerify={handleResponseVerify}
              onExpire={handleResponseExpire}
            />
          </div>
        )}

        {trackingFeed.length > 0 && (
          <div className="patient-portal-timeline">
            {trackingFeed.map((item) => (
              <div key={item.id} className="patient-portal-update-card">
                <div className="patient-portal-update-top">
                  <span className="patient-portal-update-type">{item.type}</span>
                  <span className={`patient-portal-status ${getStatusTone(item.status)}`}>{item.statusLabel || formatTokenLabel(item.status)}</span>
                </div>
                <div className="patient-portal-update-title">{item.title}</div>
                <div className="patient-portal-update-text">{item.summary}</div>
                {renderAppointmentActionBox(item)}
                {renderDeliveryDetailsBox(item)}
                {renderPatientResponseBox(item)}
                {renderFulfillmentChoiceBox(item)}
                {renderRequestResponseActions(item)}
                {renderFulfillmentActions(item)}
                <div className="patient-portal-update-time">{formatDateTime(item.activityAt || item.createdAt)} · {timeAgo(item.activityAt || item.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  function renderGlobalUpdatesFinder() {
    return (
      <div className="patient-portal-global-updates">
        <div className="patient-portal-panel-head">
          <div>
            <h2>Already Submitted a Request?</h2>
            <p>Use your phone number to find updates even if you forgot the branch you selected earlier.</p>
          </div>
        </div>

        <div className="patient-portal-track-bar">
          <input
            className="form-input"
            value={trackerPhone}
            onChange={(event) => setTrackerPhone(event.target.value)}
            placeholder="Enter your phone number"
          />
          <button type="button" className="btn btn-primary" onClick={() => fetchTrackingFeed()} disabled={trackingLoading}>
            {trackingLoading ? "Checking..." : "Find My Updates"}
          </button>
        </div>

        {trackingMessage && <div className="patient-portal-track-message">{trackingMessage}</div>}

        {trackingMatches.length > 0 && (
          <div className="patient-portal-global-groups">
            {trackingMatches.map((match) => (
              <div key={match.pharmacyId} className="patient-portal-global-group">
                <div className="patient-portal-global-group-head">
                  <div>
                    <h3>{match.pharmacyName}</h3>
                    <p>{match.pharmacyLocation}</p>
                  </div>
                  <button type="button" className="btn btn-outline" onClick={() => openTrackedPharmacy(match)}>
                    Open this pharmacy
                  </button>
                </div>

                <div className="patient-portal-timeline">
                  {match.feed.map((item) => (
                    <div key={`${match.pharmacyId}-${item.id}`} className="patient-portal-update-card">
                      <div className="patient-portal-update-top">
                        <span className="patient-portal-update-type">{item.type}</span>
                        <span className={`patient-portal-status ${getStatusTone(item.status)}`}>{item.statusLabel || formatTokenLabel(item.status)}</span>
                      </div>
                      <div className="patient-portal-update-title">{item.title}</div>
                      <div className="patient-portal-update-text">{item.summary}</div>
                      {renderAppointmentActionBox(item)}
                      {renderDeliveryDetailsBox(item)}
                      {renderPatientResponseBox(item)}
                      {renderFulfillmentChoiceBox(item)}
                      <div className="patient-portal-update-time">{formatDateTime(item.activityAt || item.createdAt)} · {timeAgo(item.activityAt || item.createdAt)}</div>
                    </div>
                  ))}
                </div>
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
        title={pharmacy?.name ? `${pharmacy.name} Patient Portal | PharmaCourse` : "Find a Pharmacy | PharmaCourse"}
        description="Send prescription requests, book pharmacist appointments, request deliveries, and check updates online."
      />

      <div className="patient-portal-page">
        <section className="patient-portal-hero">
          <div className="patient-portal-hero-inner">
            <div className="patient-portal-badge">Patient Self-Service</div>
            <h1>{pharmacy?.name || "Find Your Pharmacy"}</h1>
            <p>
              {hasActivePharmacy
                ? "Send your request directly to the pharmacy, book a consultation, or request delivery using one secure link."
                : "Choose the pharmacy or branch nearest to you first, then continue with your prescription request, appointment, or delivery."}
            </p>
            {hasActivePharmacy && (
              <div className="patient-portal-branch-card">
                <div>
                  <strong>{pharmacy.name}</strong>
                  <span>{pharmacy.locationLabel || pharmacy.location || "Location not provided"}</span>
                </div>
                {pharmacy.parentName && (
                  <div>
                    <strong>Main Pharmacy</strong>
                    <span>{pharmacy.parentName}</span>
                  </div>
                )}
              </div>
            )}
            {(portalError || directoryError) && <div className="patient-portal-feedback error">{portalError || directoryError}</div>}
          </div>
        </section>

        {(!hasActivePharmacy || !portalError) && (
          <section className="patient-portal-content">
            <div className="patient-portal-shell">
              <aside className="patient-portal-sidebar">
                <div className="patient-portal-sidebar-card">
                  {hasActivePharmacy ? (
                    <>
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
                      <button type="button" className="btn btn-outline patient-portal-switch-btn" onClick={clearSelectedPharmacy}>
                        Choose a different pharmacy
                      </button>
                    </>
                  ) : (
                    <>
                      <h2>Choose a pharmacy first</h2>
                      <p>Search by pharmacy name, branch, county, town, or area to find the right location.</p>
                      <input
                        className="form-input patient-portal-search"
                        value={branchSearch}
                        onChange={(event) => setBranchSearch(event.target.value)}
                        placeholder="Search pharmacy, branch, county, or area"
                      />
                      <div className="patient-portal-filter-stack">
                        <select value={countyFilter} onChange={(event) => {
                          setCountyFilter(event.target.value)
                          setSubcountyFilter("")
                          setTownFilter("")
                        }}>
                          <option value="">All counties</option>
                          {countyOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        <select value={subcountyFilter} onChange={(event) => {
                          setSubcountyFilter(event.target.value)
                          setTownFilter("")
                        }}>
                          <option value="">All subcounties</option>
                          {subcountyOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        <select value={townFilter} onChange={(event) => setTownFilter(event.target.value)}>
                          <option value="">All towns / areas</option>
                          {townOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        {(branchSearch || countyFilter || subcountyFilter || townFilter) && (
                          <button type="button" className="btn btn-outline patient-portal-filter-clear" onClick={clearDirectoryFilters}>
                            Clear filters
                          </button>
                        )}
                      </div>
                      <div className="patient-portal-sidebar-note">
                        Share this one link with patients:
                        <strong> pharmacourse.co.ke/patient</strong>
                      </div>
                    </>
                  )}
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
                  {!hasActivePharmacy ? (
                    <>
                      <div className="patient-portal-panel-head">
                        <div>
                          <h2>Select Your Pharmacy or Branch</h2>
                          <p>Patients should first choose the main pharmacy, then pick the exact branch nearest to them.</p>
                        </div>
                      </div>

                      {visiblePharmacyOptions.length === 0 ? (
                        <div className="patient-portal-empty">
                          No pharmacies matched that search yet.
                        </div>
                      ) : (
                        <div className="patient-portal-directory">
                          {renderGlobalUpdatesFinder()}
                          <div className="patient-portal-directory-summary">
                            Showing {visiblePharmacyOptions.length.toLocaleString()} matching locations
                            {countyFilter ? ` in ${countyFilter}` : ""}
                            {subcountyFilter ? ` · ${subcountyFilter}` : ""}
                            {townFilter ? ` · ${townFilter}` : ""}
                          </div>
                          {mainPharmacies.length > 0 && (
                            <div className="patient-portal-directory-section">
                              <div className="patient-portal-directory-head">
                                <h3>1. Choose Main Pharmacy</h3>
                                <span>{mainPharmacies.length}</span>
                              </div>
                              <div className="patient-portal-card-rail">
                                {visibleMainPharmacies.map((option) => (
                                  <div
                                    key={option.id}
                                    className={`patient-portal-choice-card directory-main-card ${selectedDirectoryMainId === option.id ? "selected" : ""}`}
                                  >
                                    <div className="patient-portal-choice-top">
                                      <span className="patient-portal-choice-badge">Main</span>
                                      <span className="patient-portal-choice-count">
                                        {branchCountsByParent.get(option.id) || 0} branches
                                      </span>
                                    </div>
                                    <div className="patient-portal-choice-title">{option.name}</div>
                                    <div className="patient-portal-choice-location-row">
                                      {option.county && <span className="patient-portal-choice-chip">{option.county}</span>}
                                      {option.subcounty && <span className="patient-portal-choice-chip">{option.subcounty}</span>}
                                      {option.town && <span className="patient-portal-choice-chip">{option.town}</span>}
                                    </div>
                                    <div className="patient-portal-choice-meta">{option.locationLabel}</div>
                                    <div className="patient-portal-choice-actions">
                                      <button type="button" className="btn btn-primary" onClick={() => browseMainPharmacy(option)}>
                                        {selectedDirectoryMainId === option.id ? "Browsing branches" : "Browse branches"}
                                      </button>
                                      <button type="button" className="btn btn-outline" onClick={() => handleSelectPharmacy(option)}>
                                        Use main pharmacy
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {mainPharmacies.length > visibleMainPharmacies.length && (
                                <button
                                  type="button"
                                  className="btn btn-outline patient-portal-load-more"
                                  onClick={() => setVisibleMainCount((count) => count + DIRECTORY_BATCH_SIZES.mains)}
                                >
                                  Show {Math.min(DIRECTORY_BATCH_SIZES.mains, mainPharmacies.length - visibleMainPharmacies.length)} more main pharmacies
                                </button>
                              )}
                            </div>
                          )}

                          {branchPharmacies.length > 0 && (
                            <div className="patient-portal-directory-section">
                              <div className="patient-portal-directory-head">
                                <div>
                                  <h3>2. Choose Branch</h3>
                                  {selectedDirectoryMain ? (
                                    <p>
                                      Showing branches for <strong>{selectedDirectoryMain.name}</strong>.
                                    </p>
                                  ) : (
                                    <p>Pick a main pharmacy above to narrow branches faster.</p>
                                  )}
                                </div>
                                <span>{branchPharmacies.length}</span>
                              </div>
                              {groupedVisibleBranches.nearest.length > 0 && (
                                <div className="patient-portal-branch-group">
                                  <div className="patient-portal-branch-group-head">
                                    <h4>{branchGroupLabels.nearest}</h4>
                                    <span>{groupedVisibleBranches.nearest.length}</span>
                                  </div>
                                  <div className="patient-portal-card-rail">
                                    {groupedVisibleBranches.nearest.map((option) => (
                                      <button key={option.id} type="button" className="patient-portal-choice-card branch" onClick={() => handleSelectPharmacy(option)}>
                                        <div className="patient-portal-choice-top">
                                          <span className="patient-portal-choice-badge branch">Branch</span>
                                        </div>
                                        <div className="patient-portal-choice-title">{option.name}</div>
                                        <div className="patient-portal-choice-parent">{option.parentName}</div>
                                        <div className="patient-portal-choice-location-row">
                                          {option.county && <span className="patient-portal-choice-chip">{option.county}</span>}
                                          {option.subcounty && <span className="patient-portal-choice-chip">{option.subcounty}</span>}
                                          {option.town && <span className="patient-portal-choice-chip">{option.town}</span>}
                                        </div>
                                        <div className="patient-portal-choice-meta">{option.locationLabel}</div>
                                        <div className="patient-portal-choice-action">Choose this branch</div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {groupedVisibleBranches.sameCounty.length > 0 && (
                                <div className="patient-portal-branch-group">
                                  <div className="patient-portal-branch-group-head">
                                    <h4>{groupedVisibleBranches.nearest.length > 0 ? branchGroupLabels.sameCounty : branchGroupLabels.nearest}</h4>
                                    <span>{groupedVisibleBranches.sameCounty.length}</span>
                                  </div>
                                  <div className="patient-portal-card-rail">
                                    {groupedVisibleBranches.sameCounty.map((option) => (
                                      <button key={option.id} type="button" className="patient-portal-choice-card branch" onClick={() => handleSelectPharmacy(option)}>
                                        <div className="patient-portal-choice-top">
                                          <span className="patient-portal-choice-badge branch">Branch</span>
                                        </div>
                                        <div className="patient-portal-choice-title">{option.name}</div>
                                        <div className="patient-portal-choice-parent">{option.parentName}</div>
                                        <div className="patient-portal-choice-location-row">
                                          {option.county && <span className="patient-portal-choice-chip">{option.county}</span>}
                                          {option.subcounty && <span className="patient-portal-choice-chip">{option.subcounty}</span>}
                                          {option.town && <span className="patient-portal-choice-chip">{option.town}</span>}
                                        </div>
                                        <div className="patient-portal-choice-meta">{option.locationLabel}</div>
                                        <div className="patient-portal-choice-action">Choose this branch</div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {groupedVisibleBranches.others.length > 0 && (
                                <div className="patient-portal-branch-group">
                                  <div className="patient-portal-branch-group-head">
                                    <h4>{branchGroupLabels.others}</h4>
                                    <span>{groupedVisibleBranches.others.length}</span>
                                  </div>
                                  <div className="patient-portal-card-rail">
                                    {groupedVisibleBranches.others.map((option) => (
                                      <button key={option.id} type="button" className="patient-portal-choice-card branch" onClick={() => handleSelectPharmacy(option)}>
                                        <div className="patient-portal-choice-top">
                                          <span className="patient-portal-choice-badge branch">Branch</span>
                                        </div>
                                        <div className="patient-portal-choice-title">{option.name}</div>
                                        <div className="patient-portal-choice-parent">{option.parentName}</div>
                                        <div className="patient-portal-choice-location-row">
                                          {option.county && <span className="patient-portal-choice-chip">{option.county}</span>}
                                          {option.subcounty && <span className="patient-portal-choice-chip">{option.subcounty}</span>}
                                          {option.town && <span className="patient-portal-choice-chip">{option.town}</span>}
                                        </div>
                                        <div className="patient-portal-choice-meta">{option.locationLabel}</div>
                                        <div className="patient-portal-choice-action">Choose this branch</div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {branchPharmacies.length > visibleBranchPharmacies.length && (
                                <button
                                  type="button"
                                  className="btn btn-outline patient-portal-load-more"
                                  onClick={() => setVisibleBranchCount((count) => count + DIRECTORY_BATCH_SIZES.branches)}
                                >
                                  Show {Math.min(DIRECTORY_BATCH_SIZES.branches, branchPharmacies.length - visibleBranchPharmacies.length)} more branches
                                </button>
                              )}
                            </div>
                          )}

                          {selectedDirectoryMain && branchPharmacies.length === 0 && (
                            <div className="patient-portal-empty">
                              No matching branches were found for <strong>{selectedDirectoryMain.name}</strong> with the current filters.
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </main>
            </div>
          </section>
        )}
      </div>
    </>
  )
}
