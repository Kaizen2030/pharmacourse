export const SITE_NAME = "Pharmacourse"
export const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://www.pharmacourse.co.ke").replace(/\/+$/, "")
export const SITE_DESCRIPTION =
  "Pharmacourse is a Kenyan pharmacy education and health-tech platform offering CPD courses, RemedacarePOS dispensary software, and RemedacareHMS hospital management tools."
export const SITE_IMAGE = `${SITE_URL}/favicon.svg`

export function getCanonicalUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${SITE_URL}${normalizedPath}`
}
