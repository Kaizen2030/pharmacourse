export const DEFAULT_CERTIFICATE_SETTINGS = {
  id: 1,
  organization_name: "PHARMACOURSE",
  organization_subtitle: "Professional Pharmacy CPD Platform - Kenya",
  certificate_label: "Certificate of Completion",
  certificate_title: "Academic Achievement",
  certifies_text: "This is to certify that",
  completion_text: "has successfully completed the course",
  signature_name: "Julius Wanjau",
  signature_role: "Director, PharmaCourse",
  footer_text: "PharmaCourse - Professional Pharmacy CPD Platform - www.pharmacourse.co.ke",
  signature_image_url: "",
  left_badge_title: "CPD",
  left_badge_subtitle: "Certified",
  left_vertical_text: "PharmaCourse Kenya",
}

export function normalizeCertificateSettings(settings) {
  const normalized = {
    ...DEFAULT_CERTIFICATE_SETTINGS,
    ...(settings || {}),
  }

  // Keep certificates on the PharmaCourse brand when older saved settings
  // still contain the previous RemedacarePOS certificate branding.
  for (const key of ["organization_name", "organization_subtitle", "signature_role", "footer_text", "left_vertical_text"]) {
    if (typeof normalized[key] === "string") {
      normalized[key] = normalized[key].replace(/RemedacarePOS/gi, "PharmaCourse")
    }
  }

  return normalized
}
