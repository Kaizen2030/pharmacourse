import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"

export default function ResetRedirect({ app }) {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState("opening") // opening | success | error

  const isHMIS = app === "remedacarehmis"
  const appName = isHMIS ? "RemedacareHMIS" : "RemedacarePOS"
  const scheme = isHMIS ? "remedacare" : "remedacarepos"

  useEffect(() => {
    // Supabase can pass token in hash fragment OR query params depending on flow
    // Hash example:  /reset/remedacarehmis#access_token=xxx&type=recovery
    // Query example: /reset/remedacarehmis?token=xxx&type=recovery
    // Supabase puts tokens in the hash fragment: #access_token=xxx&refresh_token=yyy&type=recovery
    // BUT hash fragments are stripped by the OS when firing custom protocol URLs (remedacarepos://)
    // So we MUST pass tokens as query params instead — they survive the handoff.
    const hash = window.location.hash.slice(1) // strip the leading #
    const hashParams = new URLSearchParams(hash)

    const accessToken  = hashParams.get("access_token")  || searchParams.get("access_token")  || ""
    const refreshToken = hashParams.get("refresh_token") || searchParams.get("refresh_token") || ""
    const tokenHash    = hashParams.get("token_hash")    || searchParams.get("token_hash")    || ""
    const type         = hashParams.get("type")          || searchParams.get("type")          || "recovery"

    // Pass as query params so Electron receives them intact
    const deepLink = `${scheme}://reset?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}&token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}`

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
            const hash2 = window.location.hash.slice(1)
            const hp = new URLSearchParams(hash2)
            const at = hp.get("access_token") || ""
            const rt = hp.get("refresh_token") || ""
            const th = hp.get("token_hash") || searchParams.get("token_hash") || ""
            const tp = hp.get("type") || "recovery"
            const scheme2 = isHMIS ? "remedacare" : "remedacarepos"
            window.location.href = `${scheme2}://reset?access_token=${encodeURIComponent(at)}&refresh_token=${encodeURIComponent(rt)}&token_hash=${encodeURIComponent(th)}&type=${encodeURIComponent(tp)}`
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
