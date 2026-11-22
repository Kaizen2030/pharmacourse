// One password rule for every place a password is chosen (register, reset, desktop-app reset).
// Keep in step with Supabase > Authentication > Policies (minimum length 10, letters and digits).

export const PASSWORD_MIN_LENGTH = 10
export const PASSWORD_HINT = `At least ${PASSWORD_MIN_LENGTH} characters, with letters and numbers.`

const COMMON = new Set([
  "password", "password1", "password12", "password123", "1234567890", "0123456789", "qwertyuiop", "qwerty1234",
  "iloveyou12", "pharmacist", "pharmacy123", "pharmacy2026", "welcome123", "admin12345", "letmein123", "kenya12345",
  "nairobi123", "abcdefghij", "abc1234567", "1q2w3e4r5t", "asdfghjkl1",
])

// Returns an error message, or "" when the password is acceptable.
export function checkPassword(password, { email = "", name = "" } = {}) {
  const value = String(password || "")
  if (value.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`
  if (value.length > 72) return "Use at most 72 characters."
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return "Use both letters and numbers."
  if (/^(.)\1+$/.test(value)) return "Avoid repeating the same character."
  const lower = value.toLowerCase()
  if (COMMON.has(lower)) return "That password is too common. Choose something less predictable."
  const emailName = String(email || "").split("@")[0].toLowerCase()
  if (emailName.length >= 4 && lower.includes(emailName)) return "Do not use your email address in your password."
  const firstName = String(name || "").trim().split(/\s+/)[0]?.toLowerCase() || ""
  if (firstName.length >= 4 && lower.includes(firstName)) return "Do not use your name in your password."
  return ""
}

// Plain messages for Supabase Auth errors (no internal details shown to users).
export function friendlyAuthError(error, fallback = "Something went wrong. Please try again.") {
  const message = String(error?.message || "").toLowerCase()
  if (!message) return fallback
  if (message.includes("captcha")) return "The security check failed or expired. Please complete it again."
  if (message.includes("invalid login credentials")) return "Email or password is incorrect."
  if (message.includes("email not confirmed")) return "Please confirm your email first: open the link we sent you."
  if (message.includes("already registered") || message.includes("already been registered")) return "An account with this email already exists. Sign in instead."
  if (message.includes("rate limit") || message.includes("too many")) return "Too many attempts. Please wait a few minutes and try again."
  if (message.includes("weak") || message.includes("pwned") || message.includes("leaked")) return "That password has appeared in a data breach or is too weak. Please choose another."
  if (message.includes("should be different")) return "Your new password must be different from the old one."
  if (message.includes("expired") || message.includes("invalid") && message.includes("token")) return "This link has expired or was already used. Please request a new one."
  return fallback
}
