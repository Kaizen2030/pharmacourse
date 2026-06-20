import { supabase } from "./supabaseClient"

const SESSION_KEY = "pharmacourse.website.session_id"
const LAST_EVENT_KEY = "pharmacourse.website.last_event"
const GEO_CACHE_KEY = "pharmacourse.website.geo_profile"
const GEO_CACHE_TTL_MS = 24 * 60 * 60 * 1000
let geoProfilePromise = null

const GEO_PROVIDERS = [
  {
    name: "ipapi.co",
    url: "https://ipapi.co/json/",
    parse(payload) {
      return {
        country: payload?.country_name || "",
        country_code: payload?.country_code || "",
        region: payload?.region || payload?.region_code || "",
        city: payload?.city || "",
        latitude: Number.isFinite(Number(payload?.latitude)) ? Number(payload.latitude) : null,
        longitude: Number.isFinite(Number(payload?.longitude)) ? Number(payload.longitude) : null,
        timezone: payload?.timezone || "",
        ip: payload?.ip || "",
      }
    },
  },
  {
    name: "geojs",
    url: "https://get.geojs.io/v1/ip/geo.json",
    parse(payload) {
      return {
        country: payload?.country || "",
        country_code: payload?.country_code || "",
        region: payload?.region || "",
        city: payload?.city || "",
        latitude: Number.isFinite(Number(payload?.latitude)) ? Number(payload.latitude) : null,
        longitude: Number.isFinite(Number(payload?.longitude)) ? Number(payload.longitude) : null,
        timezone: payload?.timezone || "",
        ip: payload?.ip || "",
      }
    },
  },
  {
    name: "ipwho.is",
    url: "https://ipwho.is/",
    parse(payload) {
      return {
        country: payload?.country || "",
        country_code: payload?.country_code || "",
        region: payload?.region || "",
        city: payload?.city || "",
        latitude: Number.isFinite(Number(payload?.latitude)) ? Number(payload.latitude) : null,
        longitude: Number.isFinite(Number(payload?.longitude)) ? Number(payload.longitude) : null,
        timezone: payload?.timezone?.id || payload?.timezone || "",
        ip: payload?.ip || "",
      }
    },
  },
]

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

function getBrowserCountryHint() {
  const locale = getBrowserLocale()
  const region = getLocaleCountryHint(locale)
  return region || ""
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
  const countryHint = getBrowserCountryHint()
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

function readJsonStorage(key) {
  const storage = getStorage("localStorage")
  if (!storage) return null

  try {
    const raw = storage.getItem(key)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null
    return parsed
  } catch {
    return null
  }
}

function writeJsonStorage(key, value) {
  const storage = getStorage("localStorage")
  if (!storage) return

  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage failures.
  }
}

function getCachedGeoProfile() {
  const cached = readJsonStorage(GEO_CACHE_KEY)
  if (!cached?.at || !cached?.profile) return null

  if (Date.now() - Number(cached.at || 0) > GEO_CACHE_TTL_MS) {
    return null
  }

  return cached.profile
}

function saveCachedGeoProfile(profile) {
  if (!profile || typeof profile !== "object") return
  writeJsonStorage(GEO_CACHE_KEY, { at: Date.now(), profile })
}

function normalizeGeoProfile(profile, source = "") {
  const country = String(profile?.country || profile?.country_name || "").trim()
  const countryCode = String(profile?.country_code || profile?.countryCode || "").trim().toUpperCase()
  const region = String(profile?.region || profile?.region_name || profile?.state || "").trim()
  const city = String(profile?.city || profile?.town || "").trim()
  const timezone = String(profile?.timezone || profile?.time_zone || "").trim()
  const ip = String(profile?.ip || "").trim()
  const latitude = Number.isFinite(Number(profile?.latitude)) ? Number(profile.latitude) : null
  const longitude = Number.isFinite(Number(profile?.longitude)) ? Number(profile.longitude) : null

  return {
    country,
    country_code: countryCode,
    region,
    city,
    timezone,
    ip,
    latitude,
    longitude,
    source: source || profile?.source || "",
  }
}

async function fetchGeoProfileFromProvider(provider) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null
  const timeoutId = controller && typeof window !== "undefined"
    ? window.setTimeout(() => controller.abort(), 1500)
    : null

  try {
    const response = await fetch(provider.url, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      signal: controller?.signal,
    })

    if (!response.ok) {
      throw new Error(`${provider.name} returned ${response.status}`)
    }

    const payload = await response.json()
    return normalizeGeoProfile(provider.parse(payload), provider.name)
  } finally {
    if (timeoutId && typeof window !== "undefined") {
      window.clearTimeout(timeoutId)
    }
  }
}

async function resolveGeoProfile() {
  const cached = getCachedGeoProfile()
  if (cached) {
    return cached
  }

  if (geoProfilePromise) {
    return geoProfilePromise
  }

  geoProfilePromise = (async () => {
    for (const provider of GEO_PROVIDERS) {
      try {
        const profile = await fetchGeoProfileFromProvider(provider)
        if (profile.country || profile.country_code || profile.city || profile.region) {
          saveCachedGeoProfile(profile)
          return profile
        }
      } catch {
        // Try the next provider.
      }
    }

    const fallback = normalizeGeoProfile(getGeoSignals(), "browser")
    saveCachedGeoProfile(fallback)
    return fallback
  })()

  try {
    return await geoProfilePromise
  } finally {
    geoProfilePromise = null
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

  const geoProfile = await resolveGeoProfile()

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
        ...geoProfile,
        ...(metadata && typeof metadata.geo === "object" ? metadata.geo : {}),
      },
      search,
      route_group: getRouteGroup(pathname),
      url: window.location.href,
    },
  }

  try {
    await supabase.rpc("record_website_event", payload)
  } catch {
    // Analytics should never block the page experience.
  }
}
