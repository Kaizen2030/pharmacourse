import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { pharmacyosClient } from "../lib/pharmacyosClient"
import remedacarehmisMark from "../assets/remedacarehmis-mark.png"
import remedacareposMark from "../assets/remedacarepos-mark.png"

function normalizeVerifyType(type) {
  if (type === "invite") return "invite"
  if (type === "recovery") return "recovery"
  return "signup"
}

export default function DesktopAccountActivate({ app = "remedacarepos" }) {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState("confirming")
  const [message, setMessage] = useState("Confirming your account securely...")
  const [email, setEmail] = useState("")

  const isPos = app === "remedacarepos"
  const appName = isPos ? "RemedacarePOS" : "RemedacareHMIS"
  const scheme = isPos ? "remedacarepos" : "remedacarehms"
  const subtitle = isPos ? "Dispensary Manager" : "Hospital Management System"

  const searchString = useMemo(() => searchParams.toString(), [searchParams])

  function openDesktopApp() {
    const launchTarget = email
      ? `${scheme}://login?email=${encodeURIComponent(email)}`
      : `${scheme}://`
    window.location.href = launchTarget
  }

  useEffect(() => {
    let active = true

    async function confirmAccount() {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""))
      const code = searchParams.get("code") || hashParams.get("code") || ""
      const tokenHash = searchParams.get("token_hash") || hashParams.get("token_hash") || ""
      const accessToken = searchParams.get("access_token") || hashParams.get("access_token") || ""
      const refreshToken = searchParams.get("refresh_token") || hashParams.get("refresh_token") || ""
      const type = searchParams.get("type") || hashParams.get("type") || "signup"

      try {
        let resolvedEmail = ""

        if (code) {
          const { data, error } = await pharmacyosClient.auth.exchangeCodeForSession(code)
          if (error) throw error
          resolvedEmail = data?.session?.user?.email || data?.user?.email || ""
        } else if (accessToken && refreshToken) {
          const { data, error } = await pharmacyosClient.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) throw error
          resolvedEmail = data?.session?.user?.email || data?.user?.email || ""
        } else if (tokenHash) {
          const { data, error } = await pharmacyosClient.auth.verifyOtp({
            token_hash: tokenHash,
            type: normalizeVerifyType(type),
          })
          if (error) throw error
          resolvedEmail = data?.user?.email || ""
        } else {
          throw new Error("This activation link is missing confirmation details. Please request a new signup email.")
        }

        const {
          data: { session },
        } = await pharmacyosClient.auth.getSession()
        resolvedEmail ||= session?.user?.email || ""

        await pharmacyosClient.auth.signOut().catch(() => {})

        if (!active) return
        if (resolvedEmail) setEmail(resolvedEmail)
        setStatus("success")
        setMessage(`Your account has been confirmed. Return to ${appName} and sign in with your email and password.`)
        window.history.replaceState({}, document.title, window.location.pathname)
      } catch (error) {
        if (!active) return
        setStatus("error")
        setMessage(error?.message || "We could not confirm this account. Please request a fresh activation email.")
      }
    }

    confirmAccount()

    return () => {
      active = false
    }
  }, [appName, searchParams, searchString])

  useEffect(() => {
    if (status !== "success") return
    const timer = window.setTimeout(() => {
      openDesktopApp()
    }, 900)
    return () => window.clearTimeout(timer)
  }, [email, scheme, status])

  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ maxWidth: 560, textAlign: "center" }}>
        <div
          style={{
            width: 84,
            height: 84,
            margin: "0 auto 1rem",
            borderRadius: 24,
            background: "#e8f5f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <img
            src={isPos ? remedacareposMark : remedacarehmisMark}
            alt={`${appName} icon`}
            style={{ width: 56, height: 56, objectFit: "contain" }}
          />
        </div>

        <div className="auth-logo" style={{ marginBottom: "0.25rem" }}>{appName}</div>
        <p style={{ marginBottom: "1.2rem" }}>{subtitle}</p>

        <h1 style={{ marginBottom: "0.75rem" }}>
          {status === "confirming" ? "Confirming your account..." : status === "success" ? "Account confirmed" : "Activation issue"}
        </h1>

        <p style={{ maxWidth: 420, margin: "0 auto 1.25rem", lineHeight: 1.7 }}>
          {message}
        </p>

        {status === "success" ? (
          <>
            <div
              style={{
                padding: "0.9rem 1rem",
                borderRadius: 16,
                background: "#eef8f4",
                border: "1px solid #d8ebe3",
                color: "#0f6e56",
                fontWeight: 600,
                marginBottom: "1rem",
              }}
            >
              {email ? `Confirmed email: ${email}` : "Your email has been verified successfully."}
            </div>

            <div style={{ display: "grid", gap: "0.85rem", maxWidth: 420, margin: "0 auto" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={openDesktopApp}
              >
                Open {appName}
              </button>
              <div style={{ color: "var(--text-500)", fontSize: "0.95rem", lineHeight: 1.6 }}>
                Your browser will try to open the desktop app automatically. If it does not, click the button above, then sign in with the same email and password you used during account creation.
              </div>
            </div>
          </>
        ) : null}

        {status === "error" ? (
          <div style={{ display: "grid", gap: "0.85rem", maxWidth: 420, margin: "0 auto" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Try activation again
            </button>
            <div style={{ color: "var(--text-500)", fontSize: "0.95rem", lineHeight: 1.6 }}>
              If this keeps happening, create the account again from the app so a fresh confirmation email is sent.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
