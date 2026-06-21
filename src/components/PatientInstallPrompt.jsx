import { useEffect, useState } from "react"
import { Download, Smartphone, X } from "lucide-react"
import "./PatientInstallPrompt.css"

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

export default function PatientInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isVisible, setIsVisible] = useState(true)
  const [isInstalling, setIsInstalling] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return undefined

    const mobileQuery = window.matchMedia?.("(max-width: 767px)")
    const syncDeviceState = () => {
      setIsStandalone(isStandaloneDisplay())
      setIsIos(isIosSafari())
    }

    syncDeviceState()

    if (isStandaloneDisplay()) {
      return undefined
    }

    function handleBeforeInstallPrompt(event) {
      event.preventDefault()
      setDeferredPrompt(event)
      setIsVisible(true)
      setShowHelp(false)
    }

    function handleAppInstalled() {
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
    setDeferredPrompt(null)
    setShowHelp(false)
    setIsVisible(false)
  }

  if (!isVisible || isStandalone) {
    return null
  }

  const showNativeInstall = Boolean(deferredPrompt)
  const primaryLabel = isInstalling ? "Installing..." : "Install app"
  const description = showNativeInstall ? "Add RemedacarePOS to your home screen." : "If install does not open, your browser does not support the native prompt."

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
            X
          </button>
        </div>

        {showHelp && !showNativeInstall && (
          <div className="patient-install-help">
            <div className="patient-install-help-title">Install steps</div>
            <div className="patient-install-help-item">
              <strong>{isIos ? "iPhone / iPad" : "Android"}</strong>
              <span>{isIos ? "Share, then Add to Home Screen." : "Menu, then Install app."}</span>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
