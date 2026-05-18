import { useCallback, useEffect, useRef, useState } from "react"

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAADQ4Srgs_Q53E-3H"

let turnstileScriptPromise = null

function loadTurnstileScript() {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.turnstile) return Promise.resolve()
  if (turnstileScriptPromise) return turnstileScriptPromise

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-turnstile-script="true"]')

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener("error", () => reject(new Error("Unable to load security check.")), { once: true })
      return
    }

    const script = document.createElement("script")
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
    script.async = true
    script.defer = true
    script.dataset.turnstileScript = "true"
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Unable to load security check."))
    document.head.appendChild(script)
  })

  return turnstileScriptPromise
}

export default function TurnstileWidget({ formId, resetSignal, onVerify, onExpire }) {
  const [loadError, setLoadError] = useState("")
  const [widgetReady, setWidgetReady] = useState(false)
  const containerId = `turnstile-${formId}`
  const widgetIdRef = useRef(null)
  const renderTimeoutRef = useRef(null)
  const solvedRef = useRef(false)

  const handleResetWidget = useCallback(() => {
    if (window.turnstile && widgetIdRef.current !== null) {
      window.turnstile.reset(widgetIdRef.current)
    }

    solvedRef.current = false
    setWidgetReady(false)
    setLoadError("")
    onExpire?.()
  }, [onExpire])

  useEffect(() => {
    let cancelled = false

    async function renderWidget() {
      if (!TURNSTILE_SITE_KEY) {
        setLoadError("Security check is not configured right now. Please try again later.")
        return
      }

      try {
        await loadTurnstileScript()

        if (cancelled || !window.turnstile) return

        const container = document.getElementById(containerId)
        if (!container) return

        container.innerHTML = ""
        solvedRef.current = false
        setWidgetReady(false)
        setLoadError("")

        widgetIdRef.current = window.turnstile.render(container, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token) => {
            solvedRef.current = true
            setWidgetReady(true)
            setLoadError("")
            onVerify?.(token)
          },
          "expired-callback": () => {
            solvedRef.current = false
            setWidgetReady(false)
            onExpire?.()
          },
          "error-callback": () => {
            solvedRef.current = false
            setWidgetReady(false)
            setLoadError("Security check could not finish. Refresh it and try again.")
            onExpire?.()
          },
        })

        renderTimeoutRef.current = window.setTimeout(() => {
          if (!cancelled && !solvedRef.current) {
            setLoadError("Security check is taking too long. Refresh it and try again.")
          }
        }, 12000)
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Unable to load security check.")
        }
      }
    }

    renderWidget()

    return () => {
      cancelled = true

      if (renderTimeoutRef.current) {
        window.clearTimeout(renderTimeoutRef.current)
      }

      if (window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.remove(widgetIdRef.current)
      }
    }
  }, [containerId, onExpire, onVerify])

  useEffect(() => {
    if (!window.turnstile || widgetIdRef.current === null) return

    handleResetWidget()
  }, [resetSignal, handleResetWidget])

  return (
    <div style={{ display: "grid", gap: "0.45rem" }}>
      <div id={containerId} />
      {widgetReady ? (
        <div className="patient-form-help" style={{ color: "#0f6e56", fontWeight: 700 }}>
          Security check complete. You can submit now.
        </div>
      ) : null}
      {loadError ? (
        <div className="patient-message patient-message-error" style={{ margin: 0 }}>
          {loadError}{" "}
          <button
            type="button"
            onClick={handleResetWidget}
            style={{
              border: "none",
              background: "transparent",
              color: "inherit",
              fontWeight: 800,
              textDecoration: "underline",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Refresh security check
          </button>
        </div>
      ) : null}
    </div>
  )
}
