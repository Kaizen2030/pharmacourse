export function isSupabaseAccessBlocked(error) {
  const message = String(error?.message || "").toLowerCase()
  const code = String(error?.code || "").toLowerCase()

  return Boolean(
    error &&
      (
        error?.status === 401 ||
        error?.status === 403 ||
        code === "42501" ||
        code === "pgrst301" ||
        message.includes("permission denied") ||
        message.includes("row-level security") ||
        message.includes("rls") ||
        message.includes("not authorized") ||
        message.includes("unauthorized")
      ),
  )
}

export function buildSupabaseAccessBlockedCopy({ sourceLabel, objectLabel, error }) {
  const blockedMessage = String(error?.message || "").trim()

  return {
    title: "Supabase access blocked",
    summary: `${sourceLabel} cannot read ${objectLabel} from the POS Supabase project right now.`,
    detail: blockedMessage ? `Blocked response: ${blockedMessage}` : "",
    hint: "Add a public read policy or a public RPC on the POS project, then reload the patient portal.",
  }
}
