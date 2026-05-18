import { useEffect, useMemo, useState } from "react"
import { Download, Share2, Smartphone, X } from "lucide-react"

const DISMISS_KEY = "patientPortalInstallPromptDismissedAt"
const DISMISS_WINDOW_MS = 1000 * 60 * 60 * 24 * 3

function shouldHideFromDismissal() {
  const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) || 0)
  return dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_WINDOW_MS
}

export default function PatientInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  const isIos = useMemo(() => /iphone|ipad|ipod/i.test(window.navigator.userAgent || ""), [])

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator.standalone === true

    setIsStandalone(Boolean(standalone))

    if (standalone || shouldHideFromDismissal()) {
      return
    }

    if (isIos) {
      setIsVisible(true)
    }

    function handleBeforeInstallPrompt(event) {
      event.preventDefault()
      setDeferredPrompt(event)
      setIsVisible(true)
    }

    function handleAppInstalled() {
      setDeferredPrompt(null)
      setIsVisible(false)
      window.localStorage.removeItem(DISMISS_KEY)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [isIos])

  async function handleInstall() {
    if (!deferredPrompt) {
      return
    }

    setIsInstalling(true)

    try {
      deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice

      if (choice?.outcome === "accepted") {
        setIsVisible(false)
      }
    } finally {
      setDeferredPrompt(null)
      setIsInstalling(false)
    }
  }

  function handleDismiss() {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setIsVisible(false)
    setDeferredPrompt(null)
  }

  if (isStandalone || !isVisible) {
    return null
  }

  return (
    <section className="patient-install-card" aria-label="Install patient portal">
      <div className="patient-install-head">
        <div className="patient-install-icon">
          <Smartphone />
        </div>
        <button type="button" className="patient-install-close" onClick={handleDismiss} aria-label="Dismiss install prompt">
          <X />
        </button>
      </div>

      <div className="patient-install-copy">
        <div className="patient-install-kicker">Install on your phone</div>
        <h2>Use this portal like an app</h2>
        <p>
          Add the RemedacarePOS patient portal to your home screen for faster access to prescriptions, appointments,
          delivery updates, and pharmacy messages.
        </p>
      </div>

      {deferredPrompt ? (
        <div className="patient-install-actions">
          <button type="button" className="patient-button" onClick={handleInstall} disabled={isInstalling}>
            <Download />
            <span>{isInstalling ? "Preparing install..." : "Install patient portal"}</span>
          </button>
          <button type="button" className="patient-button-secondary" onClick={handleDismiss}>
            Not now
          </button>
        </div>
      ) : isIos ? (
        <div className="patient-install-ios">
          <div className="patient-install-ios-row">
            <Share2 />
            <span>Tap Share in Safari</span>
          </div>
          <div className="patient-install-ios-row">
            <Download />
            <span>Then choose Add to Home Screen</span>
          </div>
        </div>
      ) : null}
    </section>
  )
}
