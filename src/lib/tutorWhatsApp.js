import { waLink, waShareLink } from "./whatsappConfig"

export const MODES = {
  channel: { label: "Channel (broadcast tips)", cta: "Follow channel", title: "Get pharmacy tips on WhatsApp", blurb: "Free micro-lessons and updates from your tutor." },
  group: { label: "Group (students chat)", cta: "Join group", title: "Join the course WhatsApp group", blurb: "Ask questions and learn with other students on this course." },
  chat: { label: "Direct chat with tutor", cta: "Message tutor", title: "Questions? Message your tutor", blurb: "Chat with your tutor about this course." },
}

const clean = (value) => (typeof value === "string" ? value.trim() : "")

export function isWhatsAppUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && ["chat.whatsapp.com", "whatsapp.com", "www.whatsapp.com", "wa.me"].includes(url.hostname)
  } catch {
    return false
  }
}

export function normalizePhone(value) {
  let number = clean(value).replace(/\D/g, "")
  if (number.startsWith("0")) number = `254${number.slice(1)}`
  return /^\d{9,15}$/.test(number) ? number : ""
}

export function resolveWhatsApp(course, instructor, courseTitle = "") {
  if (course?.whatsapp_enabled === false || (course?.whatsapp_enabled == null && instructor?.whatsapp_enabled !== true)) return null

  const pick = (key) => {
    const courseValue = course?.[key]
    return courseValue !== null && courseValue !== undefined && clean(String(courseValue)) !== ""
      ? courseValue
      : instructor?.[key]
  }
  const mode = MODES[pick("whatsapp_mode")] ? pick("whatsapp_mode") : "channel"
  const preset = MODES[mode]
  const url = clean(pick("whatsapp_url"))
  const number = normalizePhone(pick("whatsapp_number"))
  let href = ""

  if ((mode === "channel" || mode === "group") && isWhatsAppUrl(url)) href = url
  if (mode === "chat" && number) href = waLink(`Hi, I have a question about the course: ${courseTitle}`, number)
  if (!href) return null

  return {
    mode,
    href,
    cta: preset.cta,
    title: clean(pick("whatsapp_title")) || preset.title,
    blurb: clean(pick("whatsapp_blurb")) || preset.blurb,
  }
}

export function formatTipForWhatsApp(post, courseTitle = "", courseUrl = "") {
  return [`*${post.title}*`, "", post.body.trim(), "", courseTitle ? `📖 ${courseTitle}` : "", courseUrl]
    .filter((line, index, lines) => line !== "" || (lines[index - 1] !== "" && index < lines.length - 1))
    .join("\n")
}

export function waPayload(value, inherit = false) {
  const text = (item) => (typeof item === "string" && item.trim() ? item.trim() : null)
  return {
    whatsapp_enabled: inherit ? (value.whatsapp_enabled ?? null) : Boolean(value.whatsapp_enabled),
    whatsapp_mode: inherit ? (value.whatsapp_mode || null) : (value.whatsapp_mode || "channel"),
    whatsapp_url: text(value.whatsapp_url),
    whatsapp_number: text(value.whatsapp_number),
    whatsapp_title: text(value.whatsapp_title),
    whatsapp_blurb: text(value.whatsapp_blurb),
  }
}

export { waShareLink }