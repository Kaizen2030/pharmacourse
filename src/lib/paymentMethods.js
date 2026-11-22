// Shared by Admin > Payments > Payment methods and the checkout. `details` is the structured info an admin enters
// (public payment info, never secrets). Rows are what a learner sees and can copy.

export const REFERENCE_RULES = {
  email: "Learner's email address",
  phone: "Learner's phone number",
  fixed: "A fixed account name (type it below)",
}

function referenceValue(details, learner = {}) {
  if (details.reference_rule === "fixed") return details.reference_text || ""
  if (details.reference_rule === "phone") return learner.phone || "Your phone number"
  return learner.email || "Your email address"
}

export function paymentRows(key, details = {}, learner = {}) {
  if (key === "mpesa_manual") {
    if (details.kind === "till") {
      return [
        { label: "M-Pesa menu", value: "Lipa na M-Pesa › Buy Goods and Services" },
        { label: "Till number", value: details.business_number, copy: true },
        details.business_name ? { label: "Business name", value: details.business_name } : null,
      ].filter(Boolean)
    }
    return [
      { label: "M-Pesa menu", value: "Lipa na M-Pesa › Pay Bill" },
      { label: "Business number", value: details.business_number, copy: true },
      { label: "Account number", value: referenceValue(details, learner), copy: true },
      details.business_name ? { label: "Business name", value: details.business_name } : null,
    ].filter(Boolean)
  }
  if (key === "bank_transfer") {
    return [
      { label: "Bank", value: details.bank_name },
      { label: "Account name", value: details.account_name, copy: true },
      { label: "Account number", value: details.account_number, copy: true },
      details.branch ? { label: "Branch", value: details.branch } : null,
      details.swift ? { label: "SWIFT code", value: details.swift, copy: true } : null,
      { label: "Reference", value: referenceValue(details, learner), copy: true },
    ].filter(Boolean)
  }
  if (key === "whatsapp") {
    return details.whatsapp_number ? [{ label: "WhatsApp", value: details.whatsapp_number, copy: true }] : []
  }
  return []
}

// Plain-text version saved as `instructions` (used where rows are not shown, and as a fallback).
export function buildInstructions(key, details = {}) {
  const rows = paymentRows(key, details, { email: "your email address", phone: "your phone number" })
  const lines = rows.map((r) => `${r.label}: ${r.value}`)
  if (details.note) lines.push(details.note)
  return lines.join("\n")
}

export function missingDetails(key, details = {}) {
  const need = []
  if (key === "mpesa_manual") {
    if (!/^\d{5,7}$/.test(String(details.business_number || "").trim())) need.push(details.kind === "till" ? "Till number (5 to 7 digits)" : "Paybill business number (5 to 7 digits)")
    if (details.kind !== "till" && details.reference_rule === "fixed" && !String(details.reference_text || "").trim()) need.push("Account number text")
    if (!String(details.business_name || "").trim()) need.push("Business name as it appears on M-Pesa")
  }
  if (key === "bank_transfer") {
    if (!String(details.bank_name || "").trim()) need.push("Bank name")
    if (!String(details.account_name || "").trim()) need.push("Account name")
    if (!/^[0-9A-Za-z -]{6,30}$/.test(String(details.account_number || "").trim())) need.push("Account number")
    if (details.reference_rule === "fixed" && !String(details.reference_text || "").trim()) need.push("Reference text")
  }
  if (key === "whatsapp" && details.whatsapp_number) {
    // Optional: without a number, learners message the site's support WhatsApp number.
    const digits = String(details.whatsapp_number).replace(/\D/g, "")
    if (digits.length < 9) need.push("a full WhatsApp number")
  }
  return need
}

export function summary(key, details = {}) {
  if (key === "mpesa_manual" && details.business_number) {
    return details.kind === "till" ? `Till ${details.business_number}` : `Paybill ${details.business_number} · Account: ${details.reference_rule === "fixed" ? details.reference_text : details.reference_rule === "phone" ? "learner's phone" : "learner's email"}`
  }
  if (key === "bank_transfer" && details.bank_name) return `${details.bank_name} · ${details.account_name || ""} · ${details.account_number || ""}`
  if (key === "whatsapp") return details.whatsapp_number ? `Messages go to ${details.whatsapp_number}` : "Messages go to the site's support WhatsApp number"
  return ""
}
