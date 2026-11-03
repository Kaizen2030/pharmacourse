import { SUPPORT_WA_NUMBER, waLink } from "./whatsappConfig"
import { normalizePhone } from "./tutorWhatsApp"

const DEFAULT_APPLICATION_WA_NUMBER = "254790059584"

export function hasCourseModules(course) {
  return Number(course?.module_count ?? 0) > 0
}

export function courseApplicationLink(course, userEmail = "") {
  const number = normalizePhone(course?.whatsapp_number) || SUPPORT_WA_NUMBER || DEFAULT_APPLICATION_WA_NUMBER
  return waLink(
    `Hi, I would like to apply to join "${course?.title || "this course"}". My account email is ${userEmail || "(not signed in)"}.`,
    number
  )
}

export function tutorApplicationLink(course) {
  const number = normalizePhone(course?.whatsapp_number) || SUPPORT_WA_NUMBER || DEFAULT_APPLICATION_WA_NUMBER
  return waLink(
    `Hi, I would like to apply as a tutor for "${course?.title || "this course"}".`,
    number
  )
}
