const BLOG_VISITOR_KEY_STORAGE = "pharmcourse.blog.visitor-key"
const BLOG_VIEW_STORAGE_PREFIX = "pharmcourse.blog.viewed"
const VIEW_DEDUPE_WINDOW_MS = 1000 * 60 * 60 * 12

const engagementFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
})

function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function createVisitorKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function getViewStorageKey(slug) {
  return `${BLOG_VIEW_STORAGE_PREFIX}:${slug}`
}

export function getBlogVisitorKey() {
  if (!canUseBrowserStorage()) {
    return createVisitorKey()
  }

  let visitorKey = window.localStorage.getItem(BLOG_VISITOR_KEY_STORAGE)

  if (!visitorKey) {
    visitorKey = createVisitorKey()
    window.localStorage.setItem(BLOG_VISITOR_KEY_STORAGE, visitorKey)
  }

  return visitorKey
}

export function shouldRecordBlogView(slug, now = Date.now()) {
  if (!slug) return false
  if (!canUseBrowserStorage()) return true

  const rawValue = window.localStorage.getItem(getViewStorageKey(slug))
  if (!rawValue) return true

  const lastRecordedAt = Number(rawValue)
  if (!Number.isFinite(lastRecordedAt)) return true

  return now - lastRecordedAt >= VIEW_DEDUPE_WINDOW_MS
}

export function markBlogViewRecorded(slug, now = Date.now()) {
  if (!slug || !canUseBrowserStorage()) return
  window.localStorage.setItem(getViewStorageKey(slug), `${now}`)
}

export function formatBlogEngagementCount(value) {
  const normalizedValue = Number(value)

  if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
    return "0"
  }

  return engagementFormatter.format(normalizedValue)
}
