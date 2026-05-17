function getStorageKey(pharmacyId) {
  return `patientPortalSession:${String(pharmacyId || "").trim()}`
}

export function getPatientPortalSession(pharmacyId) {
  if (!pharmacyId || typeof window === "undefined") {
    return null
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(pharmacyId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && parsed.phone ? parsed : null
  } catch {
    return null
  }
}

export function savePatientPortalSession(pharmacyId, session) {
  if (!pharmacyId || !session?.phone || typeof window === "undefined") {
    return
  }

  const nextValue = {
    phone: String(session.phone || "").trim(),
    fullName: String(session.fullName || "").trim(),
    patientId: session.patientId || null,
    updatedAt: new Date().toISOString(),
  }

  window.localStorage.setItem(getStorageKey(pharmacyId), JSON.stringify(nextValue))
}

export function clearPatientPortalSession(pharmacyId) {
  if (!pharmacyId || typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(getStorageKey(pharmacyId))
}
