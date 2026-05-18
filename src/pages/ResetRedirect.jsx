import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"

export default function ResetRedirect({ app }) {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState("opening")

  const isHMS = app === "remedacarehms"
  const appName = isHMS ? "RemedacareHMS" : "RemedacarePOS"
  const scheme = isHMS ? "remedacare" : "pharmacyos"
  const iconLetter = isHMS ? "H" : "P"

  useEffect(() => {
    // Supabase can return recovery data in the hash or query string.
    // We move it into query params for the desktop deep link because
    // hash fragments are often dropped during custom protocol handoff.
    const hash = window.location.hash.slice(1)
    const hashParams = new URLSearchParams(hash)

    const accessToken = hashParams.get("access_token") || searchParams.get("access_token") || ""
    const refreshToken = hashParams.get("refresh_token") || searchParams.get("refresh_token") || ""
    const tokenHash = hashParams.get("token_hash") || searchParams.get("token_hash") || ""
    const type = hashParams.get("type") || searchParams.get("type") || "recovery"

    const deepLink = `${scheme}://reset?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}&token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}`

    const timer = window.setTimeout(() => {
      window.location.href = deepLink
      window.setTimeout(() => setStatus("error"), 3000)
    }, 800)

    return () => window.clearTimeout(timer)
  }, [scheme, searchParams])

  return (
    <div
      style={{
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
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "16px",
          background: "var(--primary, #2563eb)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "28px",
          fontWeight: 800,
          marginBottom: "8px",
        }}
      >
        {iconLetter}
      </div>

      <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text, #0f172a)" }}>
        {status === "error" ? "App didn't open?" : `Opening ${appName}...`}
      </h2>

      <p style={{ margin: 0, color: "var(--text-500, #64748b)", maxWidth: 360 }}>
        {status === "error"
          ? `Make sure ${appName} is installed on this computer, then click the button below.`
          : `You'll be redirected to ${appName} to set your new password.`}
      </p>

      {status === "error" ? (
        <button
          type="button"
          onClick={() => {
            const hash = window.location.hash.slice(1)
            const hashParams = new URLSearchParams(hash)
            const accessToken = hashParams.get("access_token") || searchParams.get("access_token") || ""
            const refreshToken = hashParams.get("refresh_token") || searchParams.get("refresh_token") || ""
            const tokenHash = hashParams.get("token_hash") || searchParams.get("token_hash") || ""
            const type = hashParams.get("type") || searchParams.get("type") || "recovery"

            window.location.href = `${scheme}://reset?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}&token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}`
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
      ) : null}

      <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-400, #94a3b8)" }}>
        {status !== "error" ? "If nothing happens, make sure the app is installed." : ""}
      </p>
    </div>
  )
}
