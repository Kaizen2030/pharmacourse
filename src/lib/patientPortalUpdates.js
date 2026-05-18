import { pharmacyosClient } from "./pharmacyosClient"

function normalizeUpdates(data) {
  return {
    requests: data?.requests || [],
    appointments: data?.appointments || [],
    deliveries: data?.deliveries || [],
    notifications: data?.notifications || [],
  }
}

export async function fetchPatientPortalUpdates({ pharmacyId, phone }) {
  const normalizedPharmacyId = String(pharmacyId || "").trim()

  if (!normalizedPharmacyId) {
    return {
      data: normalizeUpdates(),
      error: new Error("Pharmacy is required."),
      source: "input",
    }
  }

  const rpcResult = await pharmacyosClient.rpc("public_patient_portal_updates", {
    target_pharmacy_id: normalizedPharmacyId,
    target_phone: String(phone || "").trim() || null,
  })

  if (!rpcResult.error) {
    return {
      data: normalizeUpdates(rpcResult.data),
      error: null,
      source: "rpc-fallback",
    }
  }

  const message =
    rpcResult.error?.message ||
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
