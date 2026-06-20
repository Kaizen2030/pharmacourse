import { pharmacyosClient } from "./pharmacyosClient"
import { isSupabaseAccessBlocked } from "./supabaseAccess"

const DIRECTORY_SELECT = "id, name, location, parent_pharmacy_id, county, subcounty, town, area"
const BRANCH_LOOKUP_SELECT = "id, name, location, town, subcounty, county, parent_pharmacy_id, area"

async function loadDirectoryFromTable() {
  return pharmacyosClient
    .from("pharmacies")
    .select(DIRECTORY_SELECT)
    .order("name", { ascending: true })
}

async function loadDirectoryFromRpc() {
  return pharmacyosClient.rpc("public_patient_portal_pharmacies")
}

function normalizeDirectoryRows(rows) {
  return Array.isArray(rows) ? rows : []
}

export async function fetchPatientPortalPharmacies() {
  const rpcResult = await loadDirectoryFromRpc()
  const rpcRows = normalizeDirectoryRows(rpcResult.data)

  if (rpcRows.length) {
    return {
      data: rpcRows,
      error: null,
      source: "rpc",
    }
  }

  const tableResult = await loadDirectoryFromTable()

  if (!tableResult.error) {
    return {
      data: normalizeDirectoryRows(tableResult.data),
      error: null,
      source: "table",
    }
  }

  const blockedError = isSupabaseAccessBlocked(tableResult.error) || isSupabaseAccessBlocked(rpcResult.error)

  return {
    data: [],
    error: new Error(
      blockedError
        ? tableResult.error?.message || rpcResult.error?.message || "Supabase access is blocked for the patient portal directory."
        : tableResult.error?.message || rpcResult.error?.message || "We could not load the pharmacy list.",
    ),
    source: blockedError ? "blocked" : "failed",
  }
}

export async function fetchPatientPortalPharmacyById(pharmacyId) {
  const normalizedPharmacyId = String(pharmacyId || "").trim()

  if (!normalizedPharmacyId) {
    return {
      data: null,
      error: new Error("Pharmacy id is required."),
      source: "input",
    }
  }

  const rpcResult = await loadDirectoryFromRpc()
  const rpcRows = normalizeDirectoryRows(rpcResult.data)
  const rpcMatch = rpcRows.find((row) => String(row?.id) === normalizedPharmacyId) || null

  if (rpcMatch) {
    return {
      data: rpcMatch,
      error: null,
      source: "rpc",
    }
  }

  const tableResult = await pharmacyosClient
    .from("pharmacies")
    .select(BRANCH_LOOKUP_SELECT)
    .eq("id", normalizedPharmacyId)
    .maybeSingle()

  if (!tableResult.error && tableResult.data) {
    return {
      data: tableResult.data,
      error: null,
      source: "table",
    }
  }

  const blockedError = isSupabaseAccessBlocked(tableResult.error) || isSupabaseAccessBlocked(rpcResult.error)

  return {
    data: null,
    error: new Error(
      blockedError
        ? tableResult.error?.message || rpcResult.error?.message || "Supabase access is blocked for branch details."
        : tableResult.error?.message || rpcResult.error?.message || "We could not load the branch details.",
    ),
    source: blockedError ? "blocked" : "failed",
  }
}
