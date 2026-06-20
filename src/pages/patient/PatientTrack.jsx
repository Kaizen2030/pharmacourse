import { useCallback, useEffect, useMemo, useState } from "react"
import { jsPDF } from "jspdf"
import { ArrowUpRight, BellRing, CalendarClock, ClipboardList, PackageSearch, Video, X } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import TurnstileWidget from "../../components/TurnstileWidget"
import { usePatient } from "../../components/PatientLayout"
import { usePatientPortalAuth } from "../../hooks/usePatientPortalAuth"
import { pharmacyosClient } from "../../lib/pharmacyosClient"
import { fetchPatientPortalUpdates } from "../../lib/patientPortalUpdates"
import {
  clearPatientPortalProfileDraft,
  clearPatientPortalSession,
  getPatientPortalSession,
  savePatientPortalSession,
} from "../../lib/patientPortalSession"

const deliverySteps = ["pending", "packed", "dispatched", "delivered"]
const TRACK_PAGE_SIZE = 5
const FULFILLMENT_ACTIONS = {
  pickup: {
    label: "I Will Pick Up at Pharmacy",
    successMessage: "Pickup confirmed. The pharmacy will keep your order ready for collection.",
    requiresAddress: false,
  },
  delivery_requested: {
    label: "Request Delivery",
    successMessage: "Your delivery request has been sent to the pharmacy.",
    requiresAddress: true,
  },
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

function getTimeValue(value) {
  const timestamp = new Date(value || 0).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function sortNewestFirst(rows = [], getValue = (row) => row?.updated_at || row?.created_at || row?.dispensed_at || row?.slot_datetime || "") {
  return [...rows].sort((left, right) => getTimeValue(getValue(right)) - getTimeValue(getValue(left)))
}

function getStatusClass(status) {
  const normalizedStatus = (status || "").toLowerCase().replace(/\s+/g, "-")

  if (
    ["pending", "packed", "dispatched", "delivered", "confirmed", "ready", "completed", "cancelled", "rejected", "approved", "dispensed"].includes(
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

function formatMoney(value) {
  return `KES ${Number(value || 0).toLocaleString()}`
}

function truncateText(value, maxLength = 140) {
  const normalized = String(value || "").trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

function buildPaymentLabel(paymentStatus, paymentMethod, paymentReference = "") {
  const normalizedStatus = String(paymentStatus || "").trim().toLowerCase()
  const normalizedMethod = String(paymentMethod || "").trim()
  const normalizedReference = String(paymentReference || "").trim()

  if (normalizedStatus === "paid") {
    if (normalizedReference) {
      return `${normalizedMethod || "Paid"} · Ref ${normalizedReference}`
    }
    return normalizedMethod || "Paid"
  }

  if (normalizedStatus === "unpaid") {
    return "Not paid yet"
  }

  return "Awaiting confirmation"
}

function buildReceiptEntries(requests = []) {
  return requests
    .filter((request) => {
      const hasItems = Array.isArray(request?.fulfillment_items) && request.fulfillment_items.length > 0
      if (!hasItems) return false

      const choice = String(request?.patient_fulfillment_choice || "").trim()
      const linkedDeliveryStatus = String(request?.linked_delivery_status || "").trim().toLowerCase()
      const status = String(request?.status || "").trim().toLowerCase()

      return (choice === "pickup" && status === "dispensed") || linkedDeliveryStatus === "delivered"
    })
    .map((request) => {
      const items = Array.isArray(request.fulfillment_items) ? request.fulfillment_items : []
      const total = Number(
        request.receipt_total_kes != null
          ? request.receipt_total_kes
          : items.reduce((sum, item) => sum + Number(item?.total || 0), 0),
      )

      return {
        id: request.id,
        receiptNumber: request.receipt_number || `RX-${String(request.id).slice(0, 8).toUpperCase()}`,
        items,
        total,
        fulfilledAt: request.dispensed_at || request.updated_at || request.created_at,
        mode: String(request.linked_delivery_status || "").trim().toLowerCase() === "delivered" ? "Delivery completed" : "Pickup at pharmacy",
        paymentStatus: request.payment_status || "",
        paymentMethod: request.payment_method || "",
        paymentReference: request.payment_reference || "",
        documentLabel: String(request.payment_status || "").trim().toLowerCase() === "paid" ? "Receipt" : "Invoice",
      }
    })
}

function uniqueCompactList(values = []) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)))
}

function getRequestedDrugs(request) {
  const fulfillmentItems = Array.isArray(request?.fulfillment_items) ? request.fulfillment_items : []
  const itemNames = uniqueCompactList(
    fulfillmentItems.flatMap((item) => [item?.drug_name, item?.requestedDrug, item?.requested_drug]),
  )

  if (itemNames.length) {
    return itemNames
  }

  const requested = String(request?.drug_requested || request?.fulfillment_drug_name || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)

  return uniqueCompactList(requested)
}

function getRequestHeadline(request) {
  const drugs = getRequestedDrugs(request)
  if (!drugs.length) {
    return "Prescription request"
  }
  if (drugs.length === 1) {
    return drugs[0]
  }
  return `${drugs[0]} +${drugs.length - 1} more`
}

function getRequestProgressState(request) {
  const linkedDeliveryStatus = String(request?.linked_delivery_status || "").trim().toLowerCase()
  const fulfillmentChoice = String(request?.patient_fulfillment_choice || "").trim().toLowerCase()
  const status = String(request?.status || "").trim().toLowerCase()

  if (linkedDeliveryStatus === "delivered") {
    return { label: "Delivered", tone: "delivered" }
  }
  if (linkedDeliveryStatus === "dispatched") {
    return { label: "Dispatched", tone: "dispatched" }
  }
  if (linkedDeliveryStatus === "packed") {
    return { label: "Packed", tone: "packed" }
  }
  if (fulfillmentChoice === "delivery_requested" && !linkedDeliveryStatus) {
    return { label: "Delivery requested", tone: "pending" }
  }
  if (status === "dispensed" && fulfillmentChoice === "pickup") {
    return { label: "Ready for pickup", tone: "ready" }
  }
  if (status === "dispensed") {
    return { label: "Dispensed", tone: "dispensed" }
  }
  if (status === "approved" && !fulfillmentChoice) {
    return { label: "Action needed", tone: "approved" }
  }
  if (status === "approved") {
    return { label: "Approved", tone: "approved" }
  }
  if (status === "rejected") {
    return { label: "Rejected", tone: "rejected" }
  }
  if (status === "cancelled") {
    return { label: "Cancelled", tone: "cancelled" }
  }

  return { label: "Under review", tone: "pending" }
}

function getRequestProgressSummary(request) {
  const linkedDeliveryStatus = String(request?.linked_delivery_status || "").trim().toLowerCase()
  const fulfillmentChoice = String(request?.patient_fulfillment_choice || "").trim().toLowerCase()
  const status = String(request?.status || "").trim().toLowerCase()

  if (linkedDeliveryStatus === "delivered") {
    if (String(request?.payment_status || "").trim().toLowerCase() === "paid") {
      return "This order was delivered and payment was confirmed. The completed receipt is available below."
    }
    return "This order was delivered, but payment still needs confirmation with the branch. The invoice is available below."
  }
  if (linkedDeliveryStatus) {
    return "The pharmacy has started the live delivery run and will keep updating this order until it reaches you."
  }
  if (fulfillmentChoice === "delivery_requested") {
    return "Delivery was requested. The branch now needs to dispense the order and create the live dispatch card."
  }
  if (status === "approved" && !fulfillmentChoice) {
    return "The pharmacist approved this request. Choose pickup or delivery to keep the order moving."
  }
  if (status === "approved") {
    return "The pharmacist approved this request and is waiting for the next fulfillment step."
  }
  if (status === "dispensed" && fulfillmentChoice === "pickup") {
    return "This order is ready for collection at the branch."
  }
  if (status === "rejected") {
    return "This request was not approved. Review the pharmacist note and decide on the next step."
  }

  return "The branch is still reviewing this request."
}

function findLinkedDelivery(deliveries, request) {
  return deliveries.find((delivery) => String(delivery?.prescription_request_id || "").trim() === String(request?.id || "").trim()) || null
}

function getRelatedNotifications(request, notifications = [], deliveries = []) {
  const linkedDelivery = findLinkedDelivery(deliveries, request)
  const relatedIds = new Set([
    String(request?.id || "").trim(),
    String(linkedDelivery?.id || "").trim(),
  ].filter(Boolean))

  return notifications.filter((notification) => relatedIds.has(String(notification?.reference_id || "").trim()))
}

function getNoticeTone(notification) {
  const type = String(notification?.type || "").trim().toLowerCase()
  if (type.includes("delivery")) return "dispatched"
  if (type.includes("appointment")) return "approved"
  if (type.includes("reject")) return "rejected"
  return "pending"
}

function buildProgressEvents(request, notifications = []) {
  const events = [
    {
      id: `${request?.id || "request"}-submitted`,
      title: "Request submitted",
      note: "The patient request reached the branch for review.",
      at: request?.created_at || "",
      tone: "pending",
    },
  ]

  const status = String(request?.status || "").trim().toLowerCase()
  const fulfillmentChoice = String(request?.patient_fulfillment_choice || "").trim().toLowerCase()
  const linkedDeliveryStatus = String(request?.linked_delivery_status || "").trim().toLowerCase()

  if (status === "approved") {
    events.push({
      id: `${request?.id}-approved`,
      title: "Approved by pharmacist",
      note: request?.pharmacist_notes || "The branch approved the request and is waiting for the next fulfillment choice.",
      at: request?.updated_at || request?.created_at || "",
      tone: "approved",
    })
  }

  if (status === "rejected") {
    events.push({
      id: `${request?.id}-rejected`,
      title: "Request not approved",
      note: request?.pharmacist_notes || "The branch declined this request.",
      at: request?.updated_at || request?.created_at || "",
      tone: "rejected",
    })
  }

  if (fulfillmentChoice === "pickup") {
    events.push({
      id: `${request?.id}-pickup`,
      title: "Pickup selected",
      note: "The patient confirmed branch pickup for this order.",
      at: request?.updated_at || request?.created_at || "",
      tone: "ready",
    })
  }

  if (fulfillmentChoice === "delivery_requested") {
    events.push({
      id: `${request?.id}-delivery-requested`,
      title: "Delivery requested",
      note: request?.fulfillment_address || "The patient asked for delivery after approval.",
      at: request?.updated_at || request?.created_at || "",
      tone: "pending",
    })
  }

  if (status === "dispensed") {
    events.push({
      id: `${request?.id}-dispensed`,
      title: "Dispensed by branch",
      note: request?.pharmacist_notes || "The branch issued the medicines for pickup or delivery.",
      at: request?.dispensed_at || request?.updated_at || request?.created_at || "",
      tone: "dispensed",
    })
  }

  if (linkedDeliveryStatus) {
    events.push({
      id: `${request?.id}-delivery-live`,
      title: linkedDeliveryStatus.charAt(0).toUpperCase() + linkedDeliveryStatus.slice(1),
      note:
        linkedDeliveryStatus === "delivered"
          ? "The branch marked this delivery as completed."
          : "The branch is actively moving this order through delivery.",
      at: request?.updated_at || request?.created_at || "",
      tone: linkedDeliveryStatus,
    })
  }

  notifications.forEach((notification) => {
    events.push({
      id: `notification-${notification.id}`,
      title: getNotificationTypeLabel(notification.type),
      note: notification.message || "The branch sent an update for this order.",
      at: notification.created_at || request?.updated_at || request?.created_at || "",
      tone: getNoticeTone(notification),
    })
  })

  return events
    .sort((first, second) => new Date(first.at || 0).getTime() - new Date(second.at || 0).getTime())
    .filter((event, index, list) => list.findIndex((item) => item.id === event.id) === index)
}

export default function PatientTrack() {
  const { pharmacyId, branchName, createPatientPath } = usePatient()
  const navigate = useNavigate()
  const rememberedSession = getPatientPortalSession(pharmacyId)
  const [notifications, setNotifications] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [appointments, setAppointments] = useState([])
  const [visibleCounts, setVisibleCounts] = useState({
    notifications: TRACK_PAGE_SIZE,
    deliveries: TRACK_PAGE_SIZE,
    prescriptions: TRACK_PAGE_SIZE,
    receipts: TRACK_PAGE_SIZE,
    appointments: TRACK_PAGE_SIZE,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState({ type: "", message: "" })
  const [lastUpdated, setLastUpdated] = useState("")
  const [respondingActionKey, setRespondingActionKey] = useState("")
  const [trackingActionMessage, setTrackingActionMessage] = useState("")
  const [trackingActionError, setTrackingActionError] = useState("")
  const [trackingFulfillmentNotes, setTrackingFulfillmentNotes] = useState({})
  const [trackingDeliveryAddresses, setTrackingDeliveryAddresses] = useState({})
  const [turnstileToken, setTurnstileToken] = useState("")
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)
  const [selectedRequestId, setSelectedRequestId] = useState("")
  const [activeTrackSection, setActiveTrackSection] = useState("")
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false)
  const { loading: authLoading, isAuthenticated, patientPhone, fullName, signOut } = usePatientPortalAuth()
  const patientLoginPath = createPatientPath("/patient/login")
  const unreadCount = notifications.filter((notification) => !notification.read).length
  const displayName = fullName || rememberedSession?.fullName || ""
  const sortedNotifications = useMemo(() => sortNewestFirst(notifications), [notifications])
  const sortedDeliveries = useMemo(() => sortNewestFirst(deliveries), [deliveries])
  const sortedPrescriptions = useMemo(() => sortNewestFirst(prescriptions), [prescriptions])
  const receiptEntries = useMemo(() => sortNewestFirst(buildReceiptEntries(sortedPrescriptions), (entry) => entry.fulfilledAt), [sortedPrescriptions])
  const sortedAppointments = useMemo(() => sortNewestFirst(appointments, (appointment) => appointment?.updated_at || appointment?.created_at || appointment?.slot_datetime || ""), [appointments])
  const sortedBranchNotices = useMemo(
    () =>
      sortNewestFirst(
        notifications.filter((notification) => {
          const referenceId = String(notification?.reference_id || "").trim()
          return ![
            ...sortedPrescriptions.map((request) => String(request?.id || "").trim()),
            ...sortedDeliveries.map((delivery) => String(delivery?.id || "").trim()),
            ...sortedAppointments.map((appointment) => String(appointment?.id || "").trim()),
          ].includes(referenceId)
        }),
      ),
    [notifications, sortedAppointments, sortedDeliveries, sortedPrescriptions],
  )
  const completedReceiptRequestIds = useMemo(
    () => new Set(receiptEntries.map((entry) => String(entry.id))),
    [receiptEntries],
  )
  const progressCards = useMemo(() => (
    sortedPrescriptions.map((request) => {
      const drugs = getRequestedDrugs(request)
      const linkedDelivery = findLinkedDelivery(sortedDeliveries, request)
      const relatedNotifications = getRelatedNotifications(request, sortedNotifications, sortedDeliveries)

      return {
        request,
        drugs,
        linkedDelivery,
        relatedNotifications,
        headline: getRequestHeadline(request),
        progressState: getRequestProgressState(request),
        summary: getRequestProgressSummary(request),
        lastUpdatedAt: request?.dispensed_at || request?.updated_at || request?.created_at || "",
      }
    })
  ), [sortedDeliveries, sortedNotifications, sortedPrescriptions])
  const selectedProgressCard = progressCards.find((card) => String(card.request.id) === String(selectedRequestId)) || null
  const selectedRequest = selectedProgressCard?.request || null
  const visibleProgressCards = progressCards.slice(0, visibleCounts.notifications)
  const activeDeliveries = useMemo(
    () => sortedDeliveries.filter((delivery) => !["delivered", "cancelled"].includes(String(delivery?.status || "").trim().toLowerCase())),
    [sortedDeliveries],
  )
  const visibleDeliveries = activeDeliveries.slice(0, visibleCounts.deliveries)
  const openPrescriptions = useMemo(
    () => sortedPrescriptions.filter((request) => !completedReceiptRequestIds.has(String(request.id))),
    [completedReceiptRequestIds, sortedPrescriptions],
  )
  const visiblePrescriptions = openPrescriptions.slice(0, visibleCounts.prescriptions)
  const visibleReceipts = receiptEntries.slice(0, visibleCounts.receipts)
  const visibleAppointments = sortedAppointments.slice(0, visibleCounts.appointments)
  const standaloneBranchNotices = sortedBranchNotices
  const visibleStandaloneBranchNotices = standaloneBranchNotices.slice(0, visibleCounts.notifications)
  const latestNotification = sortedNotifications[0] || null
  const latestTrackEvent = useMemo(() => {
    if (progressCards[0]) {
      return {
        section: "prescriptions",
        label: progressCards[0].headline,
        status: progressCards[0].progressState.label,
        detail: progressCards[0].summary,
        timestamp: progressCards[0].lastUpdatedAt || progressCards[0].request.created_at || "",
      }
    }

    if (activeDeliveries[0]) {
      return {
        section: "deliveries",
        label: activeDeliveries[0].patient_name || "Delivery request",
        status: String(activeDeliveries[0].status || "Pending"),
        detail:
          activeDeliveries[0].delivery_partner_type ||
          activeDeliveries[0].rider_name ||
          "A delivery update is waiting here.",
        timestamp: activeDeliveries[0].updated_at || activeDeliveries[0].created_at || "",
      }
    }

    if (sortedAppointments[0]) {
      return {
        section: "appointments",
        label: formatAppointmentType(sortedAppointments[0].appointment_type),
        status: sortedAppointments[0].status || "Pending",
        detail: sortedAppointments[0].pharmacist_response || sortedAppointments[0].condition_summary || "An appointment update is waiting here.",
        timestamp: sortedAppointments[0].updated_at || sortedAppointments[0].created_at || sortedAppointments[0].slot_datetime || "",
      }
    }

    if (latestNotification) {
      return {
        section: "notices",
        label: getNotificationTypeLabel(latestNotification.type),
        status: unreadCount ? "Unread" : "Latest notice",
        detail: latestNotification.message || "The branch shared a new notice.",
        timestamp: latestNotification.created_at || "",
      }
    }

    return null
  }, [activeDeliveries, latestNotification, progressCards, sortedAppointments, unreadCount])
  const trackSectionCards = useMemo(() => {
    const latestPrescription = progressCards[0]
    const latestDelivery = activeDeliveries[0]
    const latestAppointment = sortedAppointments[0]
    const latestReceipt = receiptEntries[0]
    const latestNotice = standaloneBranchNotices[0]

    return [
      {
        id: "prescriptions",
        label: "Prescriptions",
        count: openPrescriptions.length,
        latest: latestPrescription ? `${latestPrescription.progressState.label} · ${formatRelativeTime(latestPrescription.lastUpdatedAt || latestPrescription.request.created_at)}` : "No active requests",
        icon: ClipboardList,
      },
      {
        id: "deliveries",
        label: "Deliveries",
        count: activeDeliveries.length,
        latest: latestDelivery ? `${String(latestDelivery.status || "Pending").toLowerCase()} · ${formatRelativeTime(latestDelivery.updated_at || latestDelivery.created_at)}` : "No active deliveries",
        icon: PackageSearch,
      },
      {
        id: "appointments",
        label: "Appointments",
        count: visibleAppointments.length,
        latest: latestAppointment ? `${formatAppointmentType(latestAppointment.appointment_type)} · ${formatRelativeTime(latestAppointment.slot_datetime || latestAppointment.updated_at || latestAppointment.created_at)}` : "No upcoming bookings",
        icon: CalendarClock,
      },
      {
        id: "receipts",
        label: "Receipts",
        count: receiptEntries.length,
        latest: latestReceipt ? `${latestReceipt.documentLabel} · ${formatRelativeTime(latestReceipt.fulfilledAt)}` : "No receipts yet",
        icon: ClipboardList,
      },
      {
        id: "notices",
        label: "Branch notices",
        count: standaloneBranchNotices.length,
        latest: latestNotice ? `${getNotificationTypeLabel(latestNotice.type)} · ${formatRelativeTime(latestNotice.created_at)}` : "No extra notices",
        icon: BellRing,
      },
    ]
  }, [activeDeliveries, openPrescriptions.length, progressCards, receiptEntries, sortedAppointments, standaloneBranchNotices, visibleAppointments.length])
  const trackSectionLabel = useMemo(() => {
    const currentCard = trackSectionCards.find((card) => card.id === activeTrackSection)
    return currentCard?.label || "Updates"
  }, [activeTrackSection, trackSectionCards])

  useEffect(() => {
    if (!isSwitchModalOpen) {
      return undefined
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closeSwitchModal()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isSwitchModalOpen])

  const handleTurnstileVerify = useCallback((token) => {
    setTurnstileToken(token || "")
  }, [])
  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken("")
  }, [])

  function openSwitchModal() {
    setIsSwitchModalOpen(true)
  }

  function closeSwitchModal() {
    setIsSwitchModalOpen(false)
  }

  function handleSwitchBranch() {
    closeSwitchModal()
    navigate("/patient-portal?switch=1")
  }

  async function handleStartFreshSwitch() {
    closeSwitchModal()
    clearPatientPortalSession(pharmacyId)
    clearPatientPortalProfileDraft()

    try {
      if (isAuthenticated) {
        await signOut()
      }
    } catch {
      // If sign-out fails, still continue to branch selection so the user can restart.
    }

    navigate("/patient-portal?switch=1")
  }

  function downloadReceipt(receipt) {
    const doc = new jsPDF({ unit: "mm", format: "a4" })
    const patientLabel = `${displayName || "Patient account"}${patientPhone ? ` (${patientPhone})` : ""}`
    let currentY = 18

    doc.setFontSize(18)
    doc.text(branchName || "RemedacarePOS", 16, currentY)
    currentY += 8

    doc.setFontSize(11)
    doc.text(`${receipt.documentLabel}: ${receipt.receiptNumber}`, 16, currentY)
    currentY += 6
    doc.text(`Patient: ${patientLabel}`, 16, currentY)
    currentY += 6
    doc.text(`Mode: ${receipt.mode}`, 16, currentY)
    currentY += 6
    doc.text(`Payment: ${buildPaymentLabel(receipt.paymentStatus, receipt.paymentMethod, receipt.paymentReference)}`, 16, currentY)
    currentY += 6
    doc.text(`Issued: ${formatDateTime(receipt.fulfilledAt)}`, 16, currentY)
    currentY += 10

    doc.setFontSize(12)
    doc.text("Items", 16, currentY)
    currentY += 8

    receipt.items.forEach((item) => {
      const drugName = item?.drug_name || item?.requestedDrug || "Drug"
      const qty = Number(item?.qty || 1)
      const lineTotal = Number(item?.total || 0)
      doc.setFontSize(10)
      doc.text(`${drugName} x${qty}`, 16, currentY)
      doc.text(formatMoney(lineTotal), 170, currentY, { align: "right" })
      currentY += 6
    })

    currentY += 4
    doc.setFontSize(12)
    doc.text(`Total: ${formatMoney(receipt.total)}`, 16, currentY)
    currentY += 12
    doc.setFontSize(10)
    doc.text("Issued through RemedacarePOS patient portal.", 16, currentY)

    doc.save(`${receipt.documentLabel}-${receipt.receiptNumber}.pdf`)
  }

  async function handleFulfillmentChoice(request, fulfillmentChoice) {
    const config = FULFILLMENT_ACTIONS[fulfillmentChoice]
    const requestId = request?.id
    const fulfillmentNotes = String(trackingFulfillmentNotes[requestId] || "").trim()
    const fulfillmentAddress = String(trackingDeliveryAddresses[requestId] || "").trim()

    if (!requestId || !config) return
    if (!turnstileToken) {
      setTrackingActionError("Complete the security check before sending your pickup or delivery choice.")
      return
    }
    if (config.requiresAddress && !fulfillmentAddress) {
      setTrackingActionError("Add your delivery address before requesting delivery.")
      return
    }

    setRespondingActionKey(`${requestId}-${fulfillmentChoice}`)
    setTrackingActionError("")
    setTrackingActionMessage("")

    try {
      const { data, error } = await pharmacyosClient.functions.invoke("patient-portal-fulfillment", {
        body: {
          requestId,
          patientPhone: String(patientPhone || "").trim(),
          fulfillmentChoice,
          fulfillmentNotes: fulfillmentNotes || null,
          fulfillmentAddress: fulfillmentChoice === "delivery_requested" ? fulfillmentAddress : null,
          turnstileToken,
        },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      setTrackingActionMessage(data?.message || config.successMessage)
      setTrackingFulfillmentNotes((prev) => ({ ...prev, [requestId]: "" }))
      setTrackingDeliveryAddresses((prev) => ({ ...prev, [requestId]: "" }))
      setTurnstileToken("")
      setTurnstileResetKey((current) => current + 1)
      await loadTrackingData()
    } catch (error) {
      setTrackingActionError(error?.message || "Unable to send your pickup or delivery choice right now.")
    } finally {
      setRespondingActionKey("")
    }
  }

  async function handleCancelOrder(request) {
    if (!request?.id) return
    if (!turnstileToken) {
      setTrackingActionError("Complete the security check before sending your cancellation request.")
      return
    }

    const requestId = request.id
    const responseNotes = String(trackingFulfillmentNotes[requestId] || "").trim()
    setRespondingActionKey(`${requestId}-cancel`)
    setTrackingActionError("")
    setTrackingActionMessage("")

    try {
      const { data, error } = await pharmacyosClient.functions.invoke("patient-portal-respond", {
        body: {
          requestId,
          patientPhone: String(patientPhone || "").trim(),
          responseAction: "cancel_request",
          responseNotes: responseNotes || null,
          turnstileToken,
        },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      setTrackingActionMessage(data?.message || "Your cancellation request has been sent to the pharmacy.")
      setTrackingFulfillmentNotes((prev) => ({ ...prev, [requestId]: "" }))
      setTurnstileToken("")
      setTurnstileResetKey((current) => current + 1)
      await loadTrackingData()
    } catch (error) {
      setTrackingActionError(error?.message || "Unable to send your cancellation request right now.")
    } finally {
      setRespondingActionKey("")
    }
  }

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
      phone: patientPhone,
    })

    if (error) {
      setFeedback({ type: "error", message: error.message || "We could not load your tracking updates right now." })
      if (!silent) {
        setIsLoading(false)
      }
      return
    }

    const notificationRows = data?.notifications || []
    const deliveryRows = data?.deliveries || []
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

  useEffect(() => {
    setVisibleCounts({
      notifications: TRACK_PAGE_SIZE,
      deliveries: TRACK_PAGE_SIZE,
      prescriptions: TRACK_PAGE_SIZE,
      receipts: TRACK_PAGE_SIZE,
      appointments: TRACK_PAGE_SIZE,
    })
  }, [notifications.length, deliveries.length, prescriptions.length, receiptEntries.length, appointments.length])

  function renderLoadMore(sectionKey, total, showing) {
    if (total <= showing) return null

    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.8rem", flexWrap: "wrap" }}>
        <span className="patient-form-help">Showing {showing} of {total}</span>
        <button
          type="button"
          className="patient-button-secondary"
          onClick={() => setVisibleCounts((prev) => ({ ...prev, [sectionKey]: prev[sectionKey] + TRACK_PAGE_SIZE }))}
        >
          Load more
        </button>
      </div>
    )
  }

  return (
    <div className="patient-page">
      <section className="patient-card patient-card-muted patient-hero">
        <span className="patient-badge">Tracking and notifications</span>
        <div className="patient-track-hero-grid">
          <div className="patient-track-hero-copy">
            <h1 style={{ margin: 0 }}>{getGreeting(displayName)}</h1>
            <p>Track your latest prescription responses, delivery status, appointment replies, and branch notices from one calm dashboard.</p>
            <div className="patient-track-hero-pills">
              <span className="patient-track-hero-pill">{unreadCount ? `${unreadCount} unread updates` : "No unread updates"}</span>
              <span className="patient-track-hero-pill">Refreshed every 30 seconds</span>
              <span className="patient-track-hero-pill">Current branch: {branchName}</span>
            </div>
          </div>

          <div className="patient-track-hero-bell">
            <div className="patient-track-hero-bell-icon" style={{ position: "relative" }}>
              <BellRing />
              {unreadCount ? <span className="patient-track-hero-bell-badge">{unreadCount}</span> : null}
            </div>
            <div className="patient-track-hero-bell-copy">
              <span className="patient-kicker">Latest update</span>
              {latestTrackEvent ? (
                <>
                  <div className="patient-meta-title">{latestTrackEvent.label}</div>
                  <p>
                    {latestTrackEvent.status}
                    {latestTrackEvent.timestamp ? ` · ${formatRelativeTime(latestTrackEvent.timestamp)}` : ""}
                  </p>
                  <p>{latestTrackEvent.detail}</p>
                </>
              ) : (
                <p>Nothing has been sent from the branch yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="patient-card">
        <div className="patient-toolbar patient-track-toolbar">
          <div className="patient-meta-copy">
            <span className="patient-kicker">Private patient updates</span>
            <div className="patient-meta-title">This page refreshes every 30 seconds for the signed-in patient account.</div>
            <p>{lastUpdated ? `Last updated ${lastUpdated}` : "Auto-refresh every 30s"}</p>
          </div>
          <div className="patient-toolbar-actions">
            <button
              type="button"
              className="patient-button-secondary"
              onClick={openSwitchModal}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
            >
              Change branch
            </button>
            <button className="patient-button-secondary" type="button" onClick={() => void loadTrackingData()} disabled={isLoading || !isAuthenticated}>
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="patient-track-switch-hint">
          <div>
            <span className="patient-kicker">Branch switch</span>
            <div className="patient-meta-title">Moved to another area?</div>
            <p>Tap change branch, confirm the transfer, then pick the new pharmacy. Your saved profile can follow you and stay editable before you submit it again.</p>
          </div>
          <span className="patient-badge">Open {trackSectionLabel}</span>
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

        {trackingActionMessage ? (
          <div className="patient-message patient-message-success">{trackingActionMessage}</div>
        ) : null}

        {trackingActionError ? (
          <div className="patient-message patient-message-error">{trackingActionError}</div>
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
        <>
          <section className="patient-card patient-track-nav-panel">
            <div className="patient-section-header">
              <div>
                <h2 className="patient-section-title">Choose what you want to read</h2>
                <p className="patient-form-help">Tap one card at a time so the latest response is easy to follow.</p>
              </div>
              <span className="patient-badge">{unreadCount ? `${unreadCount} unread` : "All clear"}</span>
            </div>

            <div className="patient-track-nav-grid">
              {trackSectionCards.map((card) => {
                const Icon = card.icon
                const isActive = activeTrackSection === card.id

                return (
                  <button
                    key={card.id}
                    type="button"
                    className={`patient-track-nav-card${isActive ? " active" : ""}`}
                    onClick={() => setActiveTrackSection(card.id)}
                  >
                    <div className="patient-track-nav-top">
                      <span className="patient-track-nav-icon">
                        <Icon size={18} />
                      </span>
                      <span className="patient-track-nav-count">{card.count}</span>
                    </div>
                    <div className="patient-track-nav-title">{card.label}</div>
                    <div className="patient-track-nav-latest">{card.latest}</div>
                  </button>
                )
              })}
            </div>
          </section>

          {!activeTrackSection ? (
            <section className="patient-card patient-track-select-prompt">
              <div className="patient-section-header">
                <div>
                  <h2 className="patient-section-title">Select a section to open</h2>
                  <p className="patient-form-help">Tap one card to see the latest tracking details, notifications, receipts, or appointments.</p>
                </div>
              </div>
              <div className="patient-empty-state">
                <p className="patient-empty">Your patient updates are ready. Tap a card above to view the section details.</p>
              </div>
            </section>
          ) : null}

          {activeTrackSection ? (
            <div className="patient-dashboard-grid">
          <section className={`patient-card ${activeTrackSection === "prescriptions" ? "" : "patient-track-section-hidden"}`}>
            <div className="patient-section-header">
              <div>
                <h2 className="patient-section-title">Order progress</h2>
                <p className="patient-form-help">Each request stays in one card. Open it to see the full product and delivery progress.</p>
              </div>
              <span className="patient-inline-icon">
                <BellRing />
              </span>
            </div>

            {progressCards.length ? (
              <div className="patient-list">
                {visibleProgressCards.map(({ request, drugs, headline, progressState, summary, lastUpdatedAt, relatedNotifications }) => (
                  <article key={request.id} className="patient-list-item patient-progress-card">
                    <div className="patient-list-header">
                      <div style={{ minWidth: 0 }}>
                        <div className="patient-list-title">{headline}</div>
                        <div className="patient-list-meta">
                          {drugs.length} {drugs.length === 1 ? "product" : "products"} · Last updated {formatRelativeTime(lastUpdatedAt || request.created_at)}
                        </div>
                      </div>
                      <span className={`patient-status-badge ${getStatusClass(progressState.tone)}`}>{progressState.label}</span>
                    </div>

                    <p className="patient-list-text" style={{ marginBottom: "0.75rem" }}>{summary}</p>

                    <div className="patient-progress-chip-row">
                      {drugs.slice(0, 3).map((drug) => (
                        <span key={`${request.id}-${drug}`} className="patient-progress-chip">{drug}</span>
                      ))}
                      {drugs.length > 3 ? <span className="patient-progress-chip patient-progress-chip-muted">+{drugs.length - 3} more</span> : null}
                    </div>

                    <div className="patient-progress-actions">
                      {relatedNotifications.length ? (
                        <span className="patient-form-help">{relatedNotifications.length} branch update{relatedNotifications.length === 1 ? "" : "s"} inside</span>
                      ) : null}
                      <button type="button" className="patient-button-secondary" onClick={() => setSelectedRequestId(String(request.id))}>
                        View progress
                      </button>
                    </div>
                  </article>
                ))}
                {renderLoadMore("notifications", progressCards.length, visibleProgressCards.length)}
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

          <section className={`patient-card patient-track-section-full ${activeTrackSection === "deliveries" ? "" : "patient-track-section-hidden"}`}>
            <div className="patient-section-header">
              <div>
                <h2 className="patient-section-title">Delivery tracking</h2>
                <p className="patient-form-help">Open deliveries appear here with a live status timeline.</p>
              </div>
              <span className="patient-inline-icon">
                <PackageSearch />
              </span>
            </div>

            {activeDeliveries.length ? (
              <div className="patient-list">
                {visibleDeliveries.map((delivery) => {
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
                {renderLoadMore("deliveries", activeDeliveries.length, visibleDeliveries.length)}
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

          <section className={`patient-card ${activeTrackSection === "prescriptions" ? "" : "patient-track-section-hidden"}`}>
            <div className="patient-section-header">
              <div>
                <h2 className="patient-section-title">Open prescription requests</h2>
                <p className="patient-form-help">Only active request cards stay here. Delivered and completed orders move to receipts so this view stays readable.</p>
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

            {openPrescriptions.length ? (
              <div className="patient-list">
                {visiblePrescriptions.map((request) => (
                  <article key={request.id} className="patient-list-item">
                    <div className="patient-list-header">
                      <div>
                        <div className="patient-list-title">{request.fulfillment_drug_name || request.drug_requested || "Prescription request"}</div>
                        <div className="patient-list-meta">
                          Submitted {formatDateTime(request.created_at)} · {getRequestedDrugs(request).length} {getRequestedDrugs(request).length === 1 ? "product" : "products"}
                        </div>
                      </div>
                      <span className={`patient-status-badge ${getStatusClass(request.status)}`}>{request.status || "Pending"}</span>
                    </div>
                    <div className="patient-progress-chip-row" style={{ marginBottom: "0.8rem" }}>
                      {getRequestedDrugs(request).slice(0, 4).map((drug) => (
                        <span key={`${request.id}-request-${drug}`} className="patient-progress-chip">{drug}</span>
                      ))}
                      {getRequestedDrugs(request).length > 4 ? (
                        <span className="patient-progress-chip patient-progress-chip-muted">+{getRequestedDrugs(request).length - 4} more</span>
                      ) : null}
                    </div>
                    {request.condition_notes ? (
                      <p
                        className="patient-list-text"
                        style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                      >
                        {truncateText(request.condition_notes, 180)}
                      </p>
                    ) : null}
                    {request.pharmacist_notes ? (
                      <p
                        className="patient-list-text"
                        style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                      >
                        Pharmacist note: {truncateText(request.pharmacist_notes, 120)}
                      </p>
                    ) : null}
                    {request.patient_fulfillment_choice ? <p className="patient-list-text">Next step: {request.patient_fulfillment_choice}</p> : null}

                    <div className="patient-progress-actions" style={{ marginTop: "0.85rem" }}>
                      <button type="button" className="patient-button-secondary" onClick={() => setSelectedRequestId(String(request.id))}>
                        Open request
                      </button>
                    </div>

                    {String(request.status || "").toLowerCase() === "approved" && !request.patient_fulfillment_choice ? (
                      <div style={{ marginTop: "0.9rem", display: "grid", gap: "0.75rem", padding: "0.9rem", borderRadius: 14, border: "0.5px solid #d7e1dc", background: "#fbfefd" }}>
                        <div>
                          <div style={{ fontWeight: 800, color: "#163329", marginBottom: 4 }}>Order approved. Choose the next step.</div>
                          <div style={{ color: "#5f746b", fontSize: "0.9rem", lineHeight: 1.5 }}>
                            Tell the pharmacy whether you will pick up at the branch or want delivery arranged.
                          </div>
                        </div>

                        <input
                          className="patient-input"
                          value={trackingDeliveryAddresses[request.id] || ""}
                          onChange={(event) => setTrackingDeliveryAddresses((prev) => ({ ...prev, [request.id]: event.target.value }))}
                          placeholder="Delivery address for this order (required only for delivery)"
                        />

                        <textarea
                          className="patient-textarea"
                          style={{ minHeight: 90 }}
                          value={trackingFulfillmentNotes[request.id] || ""}
                          onChange={(event) => setTrackingFulfillmentNotes((prev) => ({ ...prev, [request.id]: event.target.value }))}
                          placeholder="Add any note for pickup or delivery (optional)."
                        />

                        <TurnstileWidget
                          formId={`patient-track-fulfillment-${request.id}`}
                          resetSignal={turnstileResetKey}
                          onVerify={handleTurnstileVerify}
                          onExpire={handleTurnstileExpire}
                        />

                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.7rem" }}>
                          {Object.entries(FULFILLMENT_ACTIONS).map(([choice, config]) => {
                            const actionKey = `${request.id}-${choice}`
                            return (
                              <button
                                key={choice}
                                type="button"
                                className={choice === "pickup" ? "patient-button-secondary" : "patient-button"}
                                onClick={() => void handleFulfillmentChoice(request, choice)}
                                disabled={respondingActionKey === actionKey}
                              >
                                {respondingActionKey === actionKey ? "Sending..." : config.label}
                              </button>
                            )
                          })}
                          <button
                            type="button"
                            className="patient-button-secondary"
                            onClick={() => void handleCancelOrder(request)}
                            disabled={respondingActionKey === `${request.id}-cancel`}
                          >
                            {respondingActionKey === `${request.id}-cancel` ? "Sending..." : "Cancel order"}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {String(request.status || "").toLowerCase() === "rejected" ? (
                      <div style={{ marginTop: "0.9rem", padding: "0.9rem", borderRadius: 14, border: "0.5px solid #fecaca", background: "#fff7f7", display: "grid", gap: "0.7rem" }}>
                        <div style={{ fontWeight: 800, color: "#b42318" }}>This request was not approved.</div>
                        <div style={{ color: "#6b2c2c", fontSize: "0.9rem", lineHeight: 1.5 }}>
                          Review the pharmacist note above, then send a new request or contact the branch if you need clarification.
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.7rem" }}>
                          <Link to={createPatientPath("/patient/prescription")} className="patient-button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                            Send a new request
                          </Link>
                          <Link to={createPatientPath("/patient/appointment")} className="patient-button-secondary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                            Book a pharmacist call
                          </Link>
                        </div>
                      </div>
                    ) : null}

                    {String(request.status || "").toLowerCase() === "dispensed" && String(request.patient_fulfillment_choice || "").trim() === "pickup" ? (
                      <div style={{ marginTop: "0.9rem", padding: "0.9rem", borderRadius: 14, border: "0.5px solid #d7e1dc", background: "#f6fbf8" }}>
                        <div style={{ fontWeight: 800, color: "#163329", marginBottom: 4 }}>Ready for pickup</div>
                        <div style={{ color: "#5f746b", fontSize: "0.9rem", lineHeight: 1.5 }}>
                          The pharmacy has issued your order for branch collection. Bring your phone number or receipt reference when you go to pick it up.
                        </div>
                      </div>
                    ) : null}

                    {String(request.patient_fulfillment_choice || "").trim() === "delivery_requested" ? (
                      <div style={{ marginTop: "0.9rem", padding: "0.9rem", borderRadius: 14, border: "0.5px solid #d7e1dc", background: "#f6fbf8" }}>
                        <div style={{ fontWeight: 800, color: "#163329", marginBottom: 4 }}>
                          {String(request.linked_delivery_status || "").toLowerCase() === "delivered"
                            ? "Delivery completed"
                            : String(request.linked_delivery_status || "").trim()
                              ? "Delivery in progress"
                              : "Delivery requested"}
                        </div>
                        <div style={{ color: "#5f746b", fontSize: "0.9rem", lineHeight: 1.5 }}>
                          {String(request.linked_delivery_status || "").toLowerCase() === "delivered"
                            ? "The branch marked this delivery as completed. Your receipt is available below."
                            : String(request.linked_delivery_status || "").trim()
                              ? "The pharmacy can now prepare, dispatch, and update this order all the way to delivery."
                              : "Your delivery choice has been sent to the pharmacy. They will review it, dispense the order, then start dispatch updates here."}
                        </div>
                      </div>
                    ) : null}
                  </article>
                ))}
                {renderLoadMore("prescriptions", openPrescriptions.length, visiblePrescriptions.length)}
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

          <section className={`patient-card patient-track-section-full ${activeTrackSection === "receipts" ? "" : "patient-track-section-hidden"}`}>
            <div className="patient-section-header">
              <div>
                <h2 className="patient-section-title">Completed orders and receipts</h2>
                <p className="patient-form-help">Paid orders show a receipt. Delivered but unpaid orders stay here as invoices until the branch confirms payment.</p>
              </div>
              <span className="patient-inline-icon">
                <ClipboardList />
              </span>
            </div>

            {receiptEntries.length ? (
              <div className="patient-list">
                {visibleReceipts.map((receipt) => (
                  <article key={`receipt-${receipt.id}`} className="patient-list-item">
                    <div className="patient-list-header">
                      <div>
                        <div className="patient-list-title">{receipt.receiptNumber}</div>
                        <div className="patient-list-meta">{receipt.mode} · {formatDateTime(receipt.fulfilledAt)}</div>
                      </div>
                      <span className="patient-status-badge patient-status-completed">{receipt.documentLabel}</span>
                    </div>

                    <div className="patient-info-list">
                      <div>Payment: {buildPaymentLabel(receipt.paymentStatus, receipt.paymentMethod, receipt.paymentReference)}</div>
                      <div>Total: {formatMoney(receipt.total)}</div>
                      {receipt.items.map((item, index) => (
                        <div key={`${receipt.id}-item-${index}`}>
                          {(item?.drug_name || item?.requestedDrug || "Drug")} x{Number(item?.qty || 1)}{item?.total != null ? ` · ${formatMoney(item.total)}` : ""}
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: "0.9rem" }}>
                      <button className="patient-button-secondary" type="button" onClick={() => downloadReceipt(receipt)}>
                        Download {receipt.documentLabel.toLowerCase()}
                      </button>
                    </div>
                  </article>
                ))}
                {renderLoadMore("receipts", receiptEntries.length, visibleReceipts.length)}
              </div>
            ) : (
              <div className="patient-empty-state">
                <span className="patient-empty-icon">
                  <ClipboardList />
                </span>
                <p className="patient-empty">Receipts will appear here after a pickup order is issued or a delivery is marked completed.</p>
              </div>
            )}
          </section>

          <section className={`patient-card patient-track-section-full ${activeTrackSection === "notices" ? "" : "patient-track-section-hidden"}`}>
            <div className="patient-section-header">
              <div>
                <h2 className="patient-section-title">Branch notices</h2>
                <p className="patient-form-help">Only stand-alone branch notices appear here. Order and delivery updates stay grouped inside their own cards above.</p>
              </div>
              <span className="patient-inline-icon">
                <BellRing />
              </span>
            </div>

            {standaloneBranchNotices.length ? (
              <div className="patient-list">
                {visibleStandaloneBranchNotices.map((notification) => (
                  <article key={notification.id} className="patient-progress-notice-row">
                    <div className="patient-note-header">
                      <span className={`patient-type-badge ${getStatusClass(notification.type)}`}>{getNotificationTypeLabel(notification.type)}</span>
                      <span className="patient-note-time">{formatRelativeTime(notification.created_at)}</span>
                    </div>
                    <p className="patient-note-message">{notification.message}</p>
                  </article>
                ))}
                {renderLoadMore("notifications", standaloneBranchNotices.length, visibleStandaloneBranchNotices.length)}
              </div>
            ) : (
              <div className="patient-empty-state">
                <span className="patient-empty-icon">
                  <BellRing />
                </span>
                <p className="patient-empty">No extra branch-wide notices are waiting right now.</p>
              </div>
            )}
          </section>

          <section className={`patient-card patient-track-section-full ${activeTrackSection === "appointments" ? "" : "patient-track-section-hidden"}`}>
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
                {visibleAppointments.map((appointment) => (
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
                {renderLoadMore("appointments", appointments.length, visibleAppointments.length)}
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

      {selectedRequest ? (
        <div className="patient-detail-overlay" role="dialog" aria-modal="true" aria-label="Prescription request progress">
          <div className="patient-detail-backdrop" onClick={() => setSelectedRequestId("")} />
          <div className="patient-detail-sheet">
            <div className="patient-detail-head">
              <div>
                <div className="patient-kicker">Request progress</div>
                <h2 className="patient-detail-title">{getRequestHeadline(selectedRequest)}</h2>
                <p className="patient-form-help">
                  Submitted {formatDateTime(selectedRequest.created_at)} · Last updated {formatDateTime(selectedRequest.dispensed_at || selectedRequest.updated_at || selectedRequest.created_at)}
                </p>
              </div>
              <div className="patient-detail-head-actions">
                <span className={`patient-status-badge ${getStatusClass(getRequestProgressState(selectedRequest).tone)}`}>
                  {getRequestProgressState(selectedRequest).label}
                </span>
                <button type="button" className="patient-detail-close" onClick={() => setSelectedRequestId("")} aria-label="Close progress view">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="patient-detail-grid">
              <section className="patient-detail-card">
                <h3 className="patient-detail-card-title">Requested products</h3>
                <div className="patient-progress-chip-row">
                  {getRequestedDrugs(selectedRequest).map((drug) => (
                    <span key={`${selectedRequest.id}-detail-${drug}`} className="patient-progress-chip">{drug}</span>
                  ))}
                </div>
                {selectedRequest.condition_notes ? (
                  <p className="patient-list-text" style={{ marginTop: "0.9rem" }}>{selectedRequest.condition_notes}</p>
                ) : null}
                <p className="patient-list-text" style={{ marginTop: "0.9rem" }}>
                  Payment: {buildPaymentLabel(selectedRequest.payment_status, selectedRequest.payment_method, selectedRequest.payment_reference)}
                </p>
              </section>

              <section className="patient-detail-card">
                <h3 className="patient-detail-card-title">What happens next</h3>
                <p className="patient-list-text">{getRequestProgressSummary(selectedRequest)}</p>
                {selectedRequest.pharmacist_notes ? (
                  <p className="patient-list-text" style={{ marginTop: "0.8rem" }}>
                    Pharmacist note: {selectedRequest.pharmacist_notes}
                  </p>
                ) : null}
              </section>
            </div>

            <section className="patient-detail-card">
              <h3 className="patient-detail-card-title">Progress timeline</h3>
              <div className="patient-progress-event-list">
                {buildProgressEvents(selectedRequest, selectedProgressCard?.relatedNotifications || []).map((event) => (
                  <article key={event.id} className="patient-progress-event">
                    <span className={`patient-progress-event-dot ${getStatusClass(event.tone)}`} />
                    <div style={{ minWidth: 0 }}>
                      <div className="patient-progress-event-top">
                        <strong>{event.title}</strong>
                        <span>{formatDateTime(event.at)}</span>
                      </div>
                      <p>{event.note}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {isSwitchModalOpen ? (
        <div className="patient-switch-modal" role="dialog" aria-modal="true" aria-label="Switch pharmacy confirmation">
          <button type="button" className="patient-switch-modal-backdrop" onClick={closeSwitchModal} aria-label="Close switch confirmation" />
          <div className="patient-switch-modal-sheet">
            <div className="patient-switch-modal-head">
              <div>
                <div className="patient-kicker">Branch change</div>
                <h2 className="patient-section-title" style={{ marginTop: 4 }}>
                  Switch to a new pharmacy?
                </h2>
                <p className="patient-form-help" style={{ marginTop: 6 }}>
                  We will carry your saved name, phone number, and email to the next branch so you can edit them before you submit. If these details are wrong, choose start fresh instead.
                </p>
              </div>
              <button type="button" className="patient-detail-close" onClick={closeSwitchModal} aria-label="Close switch confirmation">
                <X size={18} />
              </button>
            </div>

            <div className="patient-switch-modal-summary">
              <div>
                <strong>Saved profile</strong>
                <p>{displayName || "Patient account"}{patientPhone ? ` - ${patientPhone}` : ""}</p>
              </div>
              <div>
                <strong>What happens next</strong>
                <p>Continue switch to pick a new pharmacy. Start fresh to sign out and register again with a new account.</p>
              </div>
            </div>

            <div className="patient-switch-modal-actions">
              <button type="button" className="patient-button" onClick={handleSwitchBranch}>
                Continue switch
              </button>
              <button type="button" className="patient-button-secondary" onClick={() => void handleStartFreshSwitch()}>
                Start fresh and sign out
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
