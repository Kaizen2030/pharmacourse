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
  const normalizedPhone = String(phone || "").trim()
  const normalizedPharmacyId = String(pharmacyId || "").trim()

  if (!normalizedPharmacyId || !normalizedPhone) {
    return {
      data: normalizeUpdates(),
      error: new Error("Pharmacy and phone number are required."),
      source: "input",
    }
  }

  const functionResult = await pharmacyosClient.functions.invoke("patient-portal-updates", {
    body: {
      pharmacy_id: normalizedPharmacyId,
      phone: normalizedPhone,
    },
  })

  if (!functionResult.error && !functionResult.data?.error) {
    return {
      data: normalizeUpdates(functionResult.data?.updates),
      error: null,
      source: "edge-function",
    }
  }

  const rpcResult = await pharmacyosClient.rpc("public_patient_portal_updates", {
    target_pharmacy_id: normalizedPharmacyId,
    target_phone: normalizedPhone,
  })

  if (!rpcResult.error) {
    return {
      data: normalizeUpdates(rpcResult.data),
      error: null,
      source: "rpc-fallback",
    }
  }

  const message =
    functionResult.error?.message ||
    functionResult.data?.error ||
    rpcResult.error?.message ||
    "We could not load your updates right now."

  return {
    data: normalizeUpdates(),
    error: new Error(message),
    source: "failed",
  }
}
