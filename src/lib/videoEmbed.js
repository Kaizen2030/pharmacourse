// Turns a lesson's video_url into something safe to show.
// Only known video hosts are put in an iframe (with a strict embed URL built from a validated id). Any other https
// link is played in a plain <video> element, as before. Anything else (javascript:, data:, http on odd hosts...) is
// refused.
//
// Returns { kind: 'youtube' | 'vimeo' | 'drive' | 'file' | 'unsupported', src }

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be", "youtube-nocookie.com", "www.youtube-nocookie.com"])
const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"])
const DRIVE_HOSTS = new Set(["drive.google.com"])

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/
const VIMEO_ID = /^\d{4,12}$/
const VIMEO_HASH = /^[A-Za-z0-9]{6,20}$/
const DRIVE_ID = /^[A-Za-z0-9_-]{10,100}$/

function toUrl(value) {
  const text = String(value || "").trim()
  if (!text) return null
  try {
    const url = new URL(text)
    if (url.protocol === "http:") url.protocol = "https:"
    return url.protocol === "https:" ? url : null
  } catch {
    return null
  }
}

function youtubeId(url) {
  const parts = url.pathname.split("/").filter(Boolean)
  if (url.hostname.endsWith("youtu.be")) return parts[0]
  if (url.searchParams.get("v")) return url.searchParams.get("v")
  if (["embed", "shorts", "live", "v"].includes(parts[0])) return parts[1]
  return null
}

export function parseLessonVideo(value, { start = 0 } = {}) {
  const url = toUrl(value)
  if (!url) return { kind: "unsupported", src: null }
  const host = url.hostname.toLowerCase()
  const startAt = Math.max(Math.floor(Number(start) || 0), 0)

  if (YOUTUBE_HOSTS.has(host)) {
    const id = youtubeId(url)
    if (!YOUTUBE_ID.test(id || "")) return { kind: "unsupported", src: null }
    const params = new URLSearchParams({ rel: "0", modestbranding: "1", playsinline: "1" })
    if (startAt > 0) params.set("start", String(startAt))
    return { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}?${params}` }
  }

  if (VIMEO_HOSTS.has(host)) {
    const parts = url.pathname.split("/").filter(Boolean)
    const id = host === "player.vimeo.com" ? (parts[0] === "video" ? parts[1] : null) : parts.find((part) => VIMEO_ID.test(part))
    if (!VIMEO_ID.test(id || "")) return { kind: "unsupported", src: null }
    // Unlisted videos carry a privacy hash: vimeo.com/123/abc123 or ?h=abc123.
    const hash = url.searchParams.get("h") || (host !== "player.vimeo.com" ? parts[parts.indexOf(id) + 1] : null)
    const params = new URLSearchParams({ dnt: "1" })
    if (hash && VIMEO_HASH.test(hash)) params.set("h", hash)
    return { kind: "vimeo", src: `https://player.vimeo.com/video/${id}?${params}${startAt > 0 ? `#t=${startAt}s` : ""}` }
  }

  if (DRIVE_HOSTS.has(host)) {
    const match = url.pathname.match(/\/file\/d\/([^/]+)/)
    const id = match ? match[1] : url.searchParams.get("id")
    if (!DRIVE_ID.test(id || "")) return { kind: "unsupported", src: null }
    return { kind: "drive", src: `https://drive.google.com/file/d/${id}/preview` }
  }

  return { kind: "file", src: url.toString() }
}

export const isEmbeddedVideo = (kind) => kind === "youtube" || kind === "vimeo" || kind === "drive"
