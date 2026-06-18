import { pharmacyosClient } from "./pharmacyosClient"

const SESSION_KEY = "pharmacourse.website.session_id"
const LAST_EVENT_KEY = "pharmacourse.website.last_event"

function getStorage(storageName) {
  if (typeof window === "undefined") return null
  try {
    return window[storageName]
  } catch {
    return null
  }
}

function ensureSessionId() {
  if (typeof window === "undefined") return ""

  const storage = getStorage("sessionStorage")
  if (!storage) return ""

  const existing = storage.getItem(SESSION_KEY)
  if (existing) return existing

  const created = window.crypto?.randomUUID?.() || `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  storage.setItem(SESSION_KEY, created)
  return created
}

function getDeviceCategory() {
  if (typeof window === "undefined") return "unknown"

  const width = window.innerWidth || 0
  if (width < 768) return "mobile"
  if (width < 1120) return "tablet"
  return "desktop"
}

function getBrowserLocale() {
  if (typeof window === "undefined") return ""

  const candidates = [
    window.navigator?.language,
    ...(Array.isArray(window.navigator?.languages) ? window.navigator.languages : []),
  ]

  return candidates.find((value) => String(value || "").trim()) || ""
}

function getBrowserLanguage() {
  const locale = String(getBrowserLocale() || "").trim()
  if (!locale) return ""
  return locale.split("-")[0]?.toLowerCase() || ""
}

function getBrowserTimeZone() {
  if (typeof Intl === "undefined") return ""

  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || ""
  } catch {
    return ""
  }
}

function getLocaleCountryHint(locale) {
  const normalized = String(locale || "").trim()
  if (!normalized) return ""

  const parts = normalized.split(/[-_]/).map((part) => part.trim()).filter(Boolean)
  if (parts.length < 2) return ""

  const region = parts.find((part) => /^[A-Za-z]{2}$/.test(part) || /^\d{3}$/.test(part))
  return region ? region.toUpperCase() : ""
}

function getGeoSignals() {
  const locale = getBrowserLocale()
  const language = getBrowserLanguage()
  const timeZone = getBrowserTimeZone()
  const countryHint = getLocaleCountryHint(locale)
  const languages = typeof window !== "undefined" && Array.isArray(window.navigator?.languages)
    ? window.navigator.languages.slice(0, 3).filter(Boolean)
    : []

  return {
    locale: locale || "",
    language: language || "",
    country_hint: countryHint || "",
    time_zone: timeZone || "",
    languages,
    source: "browser",
  }
}

function getRouteGroup(pathname) {
  const path = String(pathname || "/")

  if (path === "/") return "home"
  if (path.startsWith("/courses")) return "courses"
  if (path.startsWith("/blog")) return "blog"
  if (path.startsWith("/workshops")) return "workshops"
  if (path.startsWith("/community")) return "community"
  if (path.startsWith("/patient") || path === "/patient-portal" || path.startsWith("/activate")) return "patient"
  if (path.startsWith("/dashboard")) return "dashboard"
  if (path.startsWith("/pharmacyos") || path.startsWith("/remedacare")) return "product"
  return "other"
}

function shouldSkipPath(pathname) {
  const path = String(pathname || "")
  return path.startsWith("/admin")
}

function shouldSkipDuplicate(eventName, pathname, search) {
  const storage = getStorage("sessionStorage")
  if (!storage) return false

  const key = `${eventName}:${pathname}${search || ""}`
  const raw = storage.getItem(LAST_EVENT_KEY)
  if (!raw) {
    storage.setItem(LAST_EVENT_KEY, JSON.stringify({ key, at: Date.now() }))
    return false
  }

  try {
    const parsed = JSON.parse(raw)
    const isRecentDuplicate = parsed.key === key && Date.now() - Number(parsed.at || 0) < 1800
    storage.setItem(LAST_EVENT_KEY, JSON.stringify({ key, at: Date.now() }))
    return isRecentDuplicate
  } catch {
    storage.setItem(LAST_EVENT_KEY, JSON.stringify({ key, at: Date.now() }))
    return false
  }
}

export async function recordWebsiteEvent({ eventName, pathname, title, referrer, search = "", metadata = {} }) {
  if (typeof window === "undefined") return
  if (shouldSkipPath(pathname)) return
  if (shouldSkipDuplicate(eventName, pathname, search)) return

  const sessionId = ensureSessionId()
  if (!sessionId) return

  const payload = {
    event_name: eventName,
    path: pathname || "/",
    title: title || document.title || "",
    referrer: referrer || document.referrer || "",
    session_id: sessionId,
    device_category: getDeviceCategory(),
    viewport_width: window.innerWidth || null,
    viewport_height: window.innerHeight || null,
    metadata: {
      ...metadata,
      geo: {
        ...getGeoSignals(),
        ...(metadata && typeof metadata.geo === "object" ? metadata.geo : {}),
      },
      search,
      route_group: getRouteGroup(pathname),
      url: window.location.href,
    },
  }

  try {
    await pharmacyosClient.rpc("record_website_event", payload)
  } catch {
    // Analytics should never block the page experience.
  }
}
