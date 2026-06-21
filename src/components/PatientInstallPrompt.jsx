import { useEffect, useState } from "react"
import { Download, Smartphone, X } from "lucide-react"
import "./PatientInstallPrompt.css"

const DISMISS_KEY = "patientPortalInstallPromptDismissedAt"
const DISMISS_WINDOW_MS = 1000 * 60 * 60 * 24 * 3

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false
  return Boolean(window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true)
}

function isIosSafari() {
  if (typeof window === "undefined") return false
  const ua = window.navigator.userAgent.toLowerCase()
  const isIos = /iphone|ipad|ipod/.test(ua)
  const isSafari = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua)
  return isIos && isSafari
}

function isRecentlyDismissed() {
  if (typeof window === "undefined") return false
  const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) || 0)
  return dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_WINDOW_MS
}

export default function PatientInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return undefined

    const mobileQuery = window.matchMedia?.("(max-width: 767px)")
    const syncDeviceState = () => {
      setIsMobile(Boolean(mobileQuery?.matches))
      setIsStandalone(isStandaloneDisplay())
      setIsIos(isIosSafari())
    }

    syncDeviceState()

    if (isStandaloneDisplay() || isRecentlyDismissed()) {
      return undefined
    }

    const showFallback = window.setTimeout(() => {
      if (!isRecentlyDismissed() && !isStandaloneDisplay()) {
        setIsVisible(true)
        setShowHelp(false)
      }
    }, 1400)

    function handleBeforeInstallPrompt(event) {
      event.preventDefault()
      setDeferredPrompt(event)
      setIsVisible(true)
      setShowHelp(false)
    }

    function handleAppInstalled() {
      window.localStorage.removeItem(DISMISS_KEY)
      setDeferredPrompt(null)
      setIsVisible(false)
      setShowHelp(false)
      setIsStandalone(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    const handleChange = () => syncDeviceState()
    if (mobileQuery) {
      if (typeof mobileQuery.addEventListener === "function") {
        mobileQuery.addEventListener("change", handleChange)
      } else {
        mobileQuery.addListener(handleChange)
      }
    }

    return () => {
      window.clearTimeout(showFallback)
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
      if (mobileQuery) {
        if (typeof mobileQuery.removeEventListener === "function") {
          mobileQuery.removeEventListener("change", handleChange)
        } else {
          mobileQuery.removeListener(handleChange)
        }
      }
    }
  }, [])

  useEffect(() => {
    if (typeof document === "undefined") return undefined
    if (!isVisible) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isVisible])

  async function handleInstall() {
    if (!deferredPrompt) {
      setShowHelp(true)
      setIsVisible(true)
      return
    }

    setIsInstalling(true)
    try {
      deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice?.outcome === "accepted") {
        window.localStorage.removeItem(DISMISS_KEY)
        setIsVisible(false)
        setShowHelp(false)
      }
    } catch (error) {
      console.error("Install prompt error:", error)
      setShowHelp(true)
      setIsVisible(true)
    } finally {
      setDeferredPrompt(null)
      setIsInstalling(false)
    }
  }

  function handleDismiss() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
    }
    setDeferredPrompt(null)
    setShowHelp(false)
    setIsVisible(false)
  }

  if (!isVisible || isStandalone || !isMobile) {
    return null
  }

  const showNativeInstall = Boolean(deferredPrompt)
  const primaryLabel = showNativeInstall ? (isInstalling ? "Installing..." : "Install app") : "Show install steps"
  const description = showNativeInstall
    ? "Tap Install to add RemedacarePOS to your home screen for fast access."
    : isIos
    ? "Tap Share in Safari, then choose Add to Home Screen."
    : "Open the browser menu and choose Install app or Add to Home Screen."

  return (
    <div className="patient-install-banner" role="status" aria-live="polite">
      <section className="patient-install-card" aria-label="Install RemedacarePOS">
        <div className="patient-install-top">
          <div className="patient-install-badge" aria-hidden="true">
            <Smartphone size={18} />
          </div>

          <div className="patient-install-copy">
            <div className="patient-install-kicker">RemedacarePOS</div>
            <h2>Install the patient portal</h2>
            <p>{description}</p>
          </div>

          <button
            type="button"
            className="patient-install-close"
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
          >
            <X size={18} />
          </button>
        </div>

        <div className="patient-install-actions">
          <button type="button" className="patient-install-primary" onClick={handleInstall} disabled={isInstalling}>
            <Download size={16} />
            <span>{primaryLabel}</span>
          </button>
          <button type="button" className="patient-install-secondary" onClick={handleDismiss}>
            Not now
          </button>
        </div>

        {(showHelp || !showNativeInstall) && (
          <div className="patient-install-help">
            <div className="patient-install-help-title">Quick steps</div>
            <div className="patient-install-help-grid">
              <div className="patient-install-help-item">
                <strong>{isIos ? "iPhone / iPad" : "Android"}</strong>
                <span>{isIos ? "Share > Add to Home Screen" : "Menu > Install app"}</span>
              </div>
              <div className="patient-install-help-item">
                <strong>Fast access</strong>
                <span>Open the portal like a native app from your home screen.</span>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
