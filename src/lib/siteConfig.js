export const SITE_NAME = "Pharmacourse"
export const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://www.pharmacourse.co.ke").replace(/\/+$/, "")
export const SITE_DESCRIPTION =
  "Pharmacourse offers three distinct tools for Kenyan healthcare teams: professional pharmacy learning, RemedacarePOS pharmacy software, and RemedacareHMIS hospital management."
export const SITE_IMAGE = `${SITE_URL}/favicon.svg`

export function getCanonicalUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${SITE_URL}${normalizedPath}`
}
