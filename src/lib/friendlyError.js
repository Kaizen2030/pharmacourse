// Turns a Supabase/Postgres error into text that is safe to show a visitor.
// Messages our own SQL functions raise on purpose (`raise exception '...'`, SQLSTATE P0001) are written for people,
// so they are shown as-is. Anything else (table, column, policy or constraint names, JWT details) is replaced by the
// fallback, so the database layout is never revealed. The full error still goes to the console for debugging.
export function friendlyError(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback
  if (error.code === "P0001" && typeof error.message === "string" && error.message.length < 200) return error.message
  const message = String(error.message || "").toLowerCase()
  if (message.includes("failed to fetch") || message.includes("network")) return "You appear to be offline. Check your connection and try again."
  if (message.includes("jwt expired") || message.includes("not authenticated")) return "Your session has expired. Please sign in again."
  if (message.includes("permission denied") || message.includes("row-level security")) return "You do not have access to do that."
  if (import.meta.env.DEV) console.warn("[friendlyError]", error)
  return fallback
}
