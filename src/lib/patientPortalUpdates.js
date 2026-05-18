import { pharmacyosClient } from "./pharmacyosClient"

function normalizeUpdates(data) {
  return {
    requests: data?.requests || [],
    appointments: data?.appointments || [],
    deliveries: data?.deliveries || [],
    notifications: data?.notifications || [],
  }
}

function hasTrackingRows(data) {
  const normalized = normalizeUpdates(data)
  return (
    normalized.requests.length > 0 ||
    normalized.appointments.length > 0 ||
    normalized.deliveries.length > 0 ||
    normalized.notifications.length > 0
  )
}

async function fetchPatientPortalUpdatesDirect({ pharmacyId, phone }) {
  const normalizedPhone = String(phone || "").trim()
  const normalizedPharmacyId = String(pharmacyId || "").trim()

  if (!normalizedPharmacyId || !normalizedPhone) {
    return {
      data: normalizeUpdates(),
      error: new Error("Pharmacy and patient phone are required."),
      source: "direct-input",
    }
  }

  const [requestsResult, appointmentsResult, deliveriesResult, notificationsResult] = await Promise.all([
    pharmacyosClient
      .from("prescription_requests")
      .select("*")
      .eq("pharmacy_id", normalizedPharmacyId)
      .eq("patient_phone", normalizedPhone)
      .order("created_at", { ascending: false })
      .limit(20),
    pharmacyosClient
      .from("appointments")
      .select("*")
      .eq("pharmacy_id", normalizedPharmacyId)
      .eq("patient_phone", normalizedPhone)
      .order("created_at", { ascending: false })
      .limit(10),
    pharmacyosClient
      .from("deliveries")
      .select("*")
      .eq("pharmacy_id", normalizedPharmacyId)
      .eq("patient_phone", normalizedPhone)
      .order("created_at", { ascending: false })
      .limit(20),
    pharmacyosClient
      .from("patient_notifications")
      .select("*")
      .eq("pharmacy_id", normalizedPharmacyId)
      .eq("patient_phone", normalizedPhone)
      .order("created_at", { ascending: false })
      .limit(12),
  ])

  const firstError =
    requestsResult.error ||
    appointmentsResult.error ||
    deliveriesResult.error ||
    notificationsResult.error

  if (firstError) {
    return {
      data: normalizeUpdates(),
      error: new Error(firstError.message || "We could not load your updates right now."),
      source: "direct-failed",
    }
  }

  const deliveryRows = Array.isArray(deliveriesResult.data) ? deliveriesResult.data : []
  const latestDeliveryStatusByRequest = new Map(
    deliveryRows
      .filter((row) => row?.prescription_request_id)
      .map((row) => [String(row.prescription_request_id), row.status || ""]),
  )

  const requestRows = (Array.isArray(requestsResult.data) ? requestsResult.data : []).map((row) => ({
    ...row,
    linked_delivery_status: latestDeliveryStatusByRequest.get(String(row.id)) || "",
  }))

  return {
    data: normalizeUpdates({
      requests: requestRows,
      appointments: appointmentsResult.data || [],
      deliveries: deliveryRows,
      notifications: notificationsResult.data || [],
    }),
    error: null,
    source: "direct-select",
  }
}

export async function fetchPatientPortalUpdates({ pharmacyId, phone }) {
  const normalizedPharmacyId = String(pharmacyId || "").trim()
  const normalizedPhone = String(phone || "").trim()

  if (!normalizedPharmacyId) {
    return {
      data: normalizeUpdates(),
      error: new Error("Pharmacy is required."),
      source: "input",
    }
  }

  const rpcResult = await pharmacyosClient.rpc("public_patient_portal_updates", {
    target_pharmacy_id: normalizedPharmacyId,
    target_phone: normalizedPhone || null,
  })

  if (!rpcResult.error && hasTrackingRows(rpcResult.data)) {
    return {
      data: normalizeUpdates(rpcResult.data),
      error: null,
      source: "rpc",
    }
  }

  const directResult = await fetchPatientPortalUpdatesDirect({
    pharmacyId: normalizedPharmacyId,
    phone: normalizedPhone,
  })

  if (!directResult.error) {
    return directResult
  }

  const message =
    rpcResult.error?.message ||
    directResult.error?.message ||
    "We could not load your updates right now."

  return {
    data: normalizeUpdates(),
    error: new Error(message),
    source: "failed",
  }
}

export async function fetchCurrentPatientPortalMatches({ phone } = {}) {
  const rpcResult = await pharmacyosClient.rpc("public_patient_portal_updates_by_phone", {
    target_phone: String(phone || "").trim() || null,
  })

  if (!rpcResult.error) {
    return {
      data: {
        matches: Array.isArray(rpcResult.data?.matches) ? rpcResult.data.matches : [],
      },
      error: null,
    }
  }

  return {
    data: { matches: [] },
    error: new Error(rpcResult.error?.message || "We could not load your updates right now."),
  }
}
