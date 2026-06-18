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

