import { useEffect, useMemo, useState } from "react"
import { Download, Smartphone, X } from "lucide-react"

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
  const isAndroid = useMemo(() => /android/i.test(window.navigator.userAgent || ""), [])
  const isMobile = useMemo(
    () => Boolean(window.matchMedia?.("(max-width: 768px)")?.matches || isIos || isAndroid),
    [isAndroid, isIos],
  )

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator.standalone === true

    setIsStandalone(Boolean(standalone))

    if (standalone || shouldHideFromDismissal()) {
      return
    }

    if (isMobile) {
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
  }, [isMobile])

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
        <h2>Install the patient portal like an app</h2>
        <p>
          Add the RemedacarePOS patient portal to your home screen so it opens from an icon like a real app.
        </p>
      </div>

      {deferredPrompt ? (
        <div className="patient-install-actions">
          <button type="button" className="patient-button" onClick={handleInstall} disabled={isInstalling}>
            <Download />
            <span>{isInstalling ? "Preparing install..." : "Install patient portal app"}</span>
          </button>
          <button type="button" className="patient-button-secondary" onClick={handleDismiss}>
            Not now
          </button>
        </div>
      ) : null}

      <div className="patient-install-steps" aria-label="Install steps">
        {isAndroid ? (
          <>
            <div className="patient-install-step">
              <span className="patient-install-step-badge">1</span>
              <div>
                <strong>Open the portal in Chrome</strong>
                <span>Use Chrome on Android so the install option appears correctly.</span>
              </div>
            </div>
            <div className="patient-install-step">
              <span className="patient-install-step-badge">2</span>
              <div>
                <strong>Tap the menu</strong>
                <span>Choose <em>Install app</em> or <em>Add to Home screen</em> from the browser menu.</span>
              </div>
            </div>
            <div className="patient-install-step">
              <span className="patient-install-step-badge">3</span>
              <div>
                <strong>Open it from your home screen</strong>
                <span>The portal will reopen like a dedicated app with its own icon.</span>
              </div>
            </div>
          </>
        ) : isIos ? (
          <>
            <div className="patient-install-step">
              <span className="patient-install-step-badge">1</span>
              <div>
                <strong>Open in Safari</strong>
                <span>iPhone installs work from Safari, not from in-app browsers.</span>
              </div>
            </div>
            <div className="patient-install-step">
              <span className="patient-install-step-badge">2</span>
              <div>
                <strong>Tap Share</strong>
                <span>Use the Share icon at the bottom of Safari.</span>
              </div>
            </div>
            <div className="patient-install-step">
              <span className="patient-install-step-badge">3</span>
              <div>
                <strong>Add to Home Screen</strong>
                <span>Choose <em>Add to Home Screen</em> to create the app icon.</span>
              </div>
            </div>
          </>
        ) : isMobile ? (
          <>
            <div className="patient-install-step">
              <span className="patient-install-step-badge">1</span>
              <div>
                <strong>Open the portal in your browser</strong>
                <span>Use the phone browser, not an in-app view, for best results.</span>
              </div>
            </div>
            <div className="patient-install-step">
              <span className="patient-install-step-badge">2</span>
              <div>
                <strong>Use the install or share menu</strong>
                <span>Look for <em>Install app</em> on Android or <em>Add to Home Screen</em> on iPhone.</span>
              </div>
            </div>
            <div className="patient-install-step">
              <span className="patient-install-step-badge">3</span>
              <div>
                <strong>Launch like a native app</strong>
                <span>The portal opens from the home screen icon with a full-screen app feel.</span>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}
