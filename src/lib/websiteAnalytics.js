import { supabase } from "./supabaseClient"

// Privacy-safe website analytics.
// - Nothing is recorded until the visitor accepts (see AnalyticsConsentBanner).
// - Only public pages are recorded, as a path (never the ?query or #hash, which can hold sign-in tokens).
// - No IP lookups and no third-party services: country is estimated from the browser's time zone and language.
// The database enforces the same rules (supabase/security/2026-11-26_phase4_analytics_privacy.sql).

const SESSION_KEY = "pharmacourse.website.session_id"
const LAST_EVENT_KEY = "pharmacourse.website.last_event"
const CONSENT_KEY = "pharmacourse.analytics.consent"
export const CONSENT_EVENT = "pharmacourse:analytics-consent"

// Exact public paths and public sections that may be counted.
const TRACKED_EXACT = new Set(["/", "/login", "/register", "/courses", "/workshops", "/blog", "/community", "/team-plans", "/patient-portal", "/patient-flyer"])
const TRACKED_PREFIXES = ["/courses/", "/blog/", "/pharmacyos", "/remedacarepos", "/remedacarehms", "/remedacareos", "/remedacarehmis"]

// Time zones of the countries most visitors come from (country estimate without an IP lookup).
const TIME_ZONE_COUNTRY = {
  "Africa/Nairobi": "KE", "Africa/Kampala": "UG", "Africa/Dar_es_Salaam": "TZ", "Africa/Kigali": "RW", "Africa/Addis_Ababa": "ET",
  "Africa/Mogadishu": "SO", "Africa/Juba": "SS", "Africa/Bujumbura": "BI", "Africa/Lagos": "NG", "Africa/Accra": "GH",
  "Africa/Johannesburg": "ZA", "Africa/Cairo": "EG", "Africa/Lusaka": "ZM", "Africa/Harare": "ZW", "Africa/Blantyre": "MW",
  "Africa/Maputo": "MZ", "Africa/Kinshasa": "CD", "Africa/Lubumbashi": "CD", "Africa/Khartoum": "SD", "Africa/Djibouti": "DJ",
  "Europe/London": "GB", "Europe/Dublin": "IE", "Asia/Dubai": "AE", "Asia/Riyadh": "SA", "Asia/Qatar": "QA", "Asia/Kolkata": "IN",
  "America/New_York": "US", "America/Chicago": "US", "America/Los_Angeles": "US", "America/Toronto": "CA", "Australia/Sydney": "AU",
}

function storage(name) {
  if (typeof window === "undefined") return null
  try { return window[name] } catch { return null }
}

export function getAnalyticsConsent() {
  try { return storage("localStorage")?.getItem(CONSENT_KEY) || null } catch { return null }
}

export function setAnalyticsConsent(value) {
  try { storage("localStorage")?.setItem(CONSENT_KEY, value === "granted" ? "granted" : "denied") } catch { /* storage blocked */ }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CONSENT_EVENT))
}

export function isTrackablePath(pathname) {
  const path = String(pathname || "")
  if (TRACKED_EXACT.has(path)) return true
  return TRACKED_PREFIXES.some((prefix) => path.startsWith(prefix))
}

function sessionId() {
  const store = storage("sessionStorage")
  if (!store) return ""
  try {
    const existing = store.getItem(SESSION_KEY)
    if (existing) return existing
    const created = window.crypto?.randomUUID?.() || `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    store.setItem(SESSION_KEY, created)
    return created
  } catch {
    return ""
  }
}

function deviceCategory() {
  const width = window.innerWidth || 0
  if (width < 768) return "mobile"
  if (width < 1120) return "tablet"
  return "desktop"
}

function countryHints() {
  const locale = String(window.navigator?.language || "").trim()
  let timeZone = ""
  try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "" } catch { timeZone = "" }
  const localeRegion = (locale.split(/[-_]/)[1] || "").toUpperCase()
  const countryCode = TIME_ZONE_COUNTRY[timeZone] || (/^[A-Z]{2}$/.test(localeRegion) ? localeRegion : "")
  let country = ""
  try { country = countryCode && typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) || "" : "" } catch { country = "" }
  return {
    country_code: countryCode,
    country,
    country_hint: /^[A-Z]{2}$/.test(localeRegion) ? localeRegion : "",
    time_zone: timeZone,
    locale,
    language: (locale.split(/[-_]/)[0] || "").toLowerCase(),
  }
}

// The referring site only (https://www.google.com), and nothing when the visitor came from this site.
function referringSite() {
  try {
    const ref = document.referrer ? new URL(document.referrer) : null
    if (!ref || ref.origin === window.location.origin || !/^https?:$/.test(ref.protocol)) return ""
    return ref.origin
  } catch {
    return ""
  }
}

function routeGroup(path) {
  if (path === "/") return "home"
  if (path.startsWith("/courses")) return "courses"
  if (path.startsWith("/blog")) return "blog"
  if (path.startsWith("/workshops")) return "workshops"
  if (path.startsWith("/community")) return "community"
  if (path.startsWith("/patient")) return "patient"
  if (path.startsWith("/pharmacyos") || path.startsWith("/remedacare")) return "product"
  return "other"
}

function isRecentDuplicate(key) {
  const store = storage("sessionStorage")
  if (!store) return false
  try {
    const last = JSON.parse(store.getItem(LAST_EVENT_KEY) || "null")
    store.setItem(LAST_EVENT_KEY, JSON.stringify({ key, at: Date.now() }))
    return Boolean(last && last.key === key && Date.now() - Number(last.at || 0) < 1800)
  } catch {
    return false
  }
}

export async function recordWebsiteEvent({ eventName, pathname }) {
  if (typeof window === "undefined") return
  if (getAnalyticsConsent() !== "granted") return
  const path = String(pathname || "/")
  if (!isTrackablePath(path)) return
  if (isRecentDuplicate(`${eventName}:${path}`)) return
  const session = sessionId()
  if (!session) return

  try {
    await supabase.rpc("record_website_event", {
      event_name: eventName,
      path,
      title: document.title || "",
      referrer: referringSite(),
      session_id: session,
      device_category: deviceCategory(),
      viewport_width: window.innerWidth || null,
      viewport_height: window.innerHeight || null,
      metadata: { route_group: routeGroup(path), geo: countryHints() },
    })
  } catch {
    // Analytics never blocks the page.
  }
}
