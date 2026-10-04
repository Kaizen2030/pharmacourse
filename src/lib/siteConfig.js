export const SITE_NAME = "Pharmacourse"
export const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://www.pharmacourse.co.ke").replace(/\/+$/, "")
export const SITE_DESCRIPTION =
  "Pharmacourse brings together practical pharmacy learning, RemedacarePOS pharmacy operations, and RemedacareHMIS hospital management for Kenyan healthcare teams."
export const SITE_IMAGE = `${SITE_URL}/favicon.svg`

export function getCanonicalUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${SITE_URL}${normalizedPath}`
}
