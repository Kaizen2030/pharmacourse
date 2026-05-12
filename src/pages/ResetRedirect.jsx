import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"

export default function ResetRedirect({ app }) {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState("opening") // opening | success | error

  const appName = app === "remedacare" ? "RemedaCare" : "PharmacyOS"
  const scheme  = app === "remedacare" ? "remedacare" : "pharmacyos"

  useEffect(() => {
    // Supabase can pass token in hash fragment OR query params depending on flow
    // Hash example:  /reset/remedacare#access_token=xxx&type=recovery
    // Query example: /reset/remedacare?token=xxx&type=recovery
    const hash = window.location.hash // e.g. "#access_token=xxx&refresh_token=yyy&type=recovery"

    let deepLink

    if (hash && hash.length > 1) {
      // Pass the full hash through — Supabase token is already in there
      deepLink = `${scheme}://reset${hash}`
    } else {
      // Fallback: reconstruct from query params
      const token        = searchParams.get("token") || searchParams.get("access_token") || ""
      const refreshToken = searchParams.get("refresh_token") || ""
      const type         = searchParams.get("type") || "recovery"
      deepLink = `${scheme}://reset#access_token=${token}&refresh_token=${refreshToken}&type=${type}`
    }

    // Small delay so the page renders before we redirect
    const timer = setTimeout(() => {
      window.location.href = deepLink
      // After 3s, if still here the deep link didn't open — show error hint
      setTimeout(() => setStatus("error"), 3000)
    }, 800)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg, #f8fafc)",
      fontFamily: "inherit",
      gap: "20px",
      padding: "2rem",
      textAlign: "center",
    }}>
      {/* Logo area */}
      <div style={{
        width: 64, height: 64,
        borderRadius: "16px",
        background: "var(--primary, #2563eb)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "28px",
        marginBottom: "8px",
      }}>
        {app === "remedacare" ? "💊" : "🏥"}
      </div>

      <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text, #0f172a)" }}>
        {status === "error"
          ? "App didn't open?"
          : `Opening ${appName}…`}
      </h2>

      <p style={{ margin: 0, color: "var(--text-500, #64748b)", maxWidth: 360 }}>
        {status === "error"
          ? `Make sure ${appName} is installed on this computer, then click the button below.`
          : `You'll be redirected to ${appName} to set your new password.`}
      </p>

      {status === "error" && (
        <button
          onClick={() => {
            // Retry deep link
            const hash = window.location.hash
            const scheme2 = app === "remedacare" ? "remedacare" : "pharmacyos"
            window.location.href = `${scheme2}://reset${hash}`
          }}
          style={{
            padding: "12px 28px",
            background: "var(--primary, #2563eb)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try opening {appName} again
        </button>
      )}

      <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-400, #94a3b8)" }}>
        {status !== "error" && "If nothing happens, make sure the app is installed."}
      </p>
    </div>
  )
}
