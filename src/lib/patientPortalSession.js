function getStorageKey(pharmacyId) {
  return `patientPortalSession:${String(pharmacyId || "").trim()}`
}

function getProfileDraftKey() {
  return "patientPortalProfileDraft"
}

export function getPatientPortalProfileDraft() {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const raw = window.localStorage.getItem(getProfileDraftKey())
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && (parsed.phone || parsed.fullName || parsed.email) ? parsed : null
  } catch {
    return null
  }
}

export function savePatientPortalProfileDraft(profile) {
  if (typeof window === "undefined") {
    return
  }

  const nextValue = {
    phone: String(profile?.phone || "").trim(),
    fullName: String(profile?.fullName || "").trim(),
    email: String(profile?.email || "").trim().toLowerCase(),
    patientId: profile?.patientId || null,
    updatedAt: new Date().toISOString(),
  }

  if (!nextValue.phone && !nextValue.fullName && !nextValue.email) {
    return
  }

  window.localStorage.setItem(getProfileDraftKey(), JSON.stringify(nextValue))
}

export function clearPatientPortalProfileDraft() {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(getProfileDraftKey())
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
    email: String(session.email || "").trim().toLowerCase(),
    patientId: session.patientId || null,
    updatedAt: new Date().toISOString(),
  }

  window.localStorage.setItem(getStorageKey(pharmacyId), JSON.stringify(nextValue))
  savePatientPortalProfileDraft(nextValue)
}

export function clearPatientPortalSession(pharmacyId) {
  if (!pharmacyId || typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(getStorageKey(pharmacyId))
}
