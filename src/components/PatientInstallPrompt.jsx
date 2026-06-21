import { useEffect, useMemo, useState } from "react"
import { Download, Share2, Smartphone, X } from "lucide-react"
import "./PatientInstallPrompt.css"

const DISMISS_KEY = "patientPortalInstallPromptDismissedAt"
const DISMISS_WINDOW_MS = 1000 * 60 * 60 * 24 * 3

function shouldHideFromDismissal() {
  const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) || 0)
  return dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_WINDOW_MS
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
  const [showBanner, setShowBanner] = useState(false)
  const [showIosBanner, setShowIosBanner] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  const isIos = useMemo(() => isIosSafari(), [])
  const isAndroid = useMemo(() => /android/i.test(window.navigator.userAgent || ""), [])
  const isMobile = useMemo(
    () => Boolean(window.matchMedia?.("(max-width: 768px)")?.matches || isIos || isAndroid),
    [isAndroid, isIos],
  )

  useEffect(() => {
    if (typeof window === "undefined") return

    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator.standalone === true

    console.info("PatientInstallPrompt mounted", {
      standalone,
      isIos,
      isAndroid,
      isMobile,
      dismissed: window.localStorage.getItem(DISMISS_KEY),
    })

    setIsStandalone(Boolean(standalone))
    if (standalone || shouldHideFromDismissal()) {
      return
    }

    function handleBeforeInstallPrompt(event) {
      console.info("beforeinstallprompt event received", event)
      event.preventDefault()
      if (window.localStorage.getItem(DISMISS_KEY)) return
      setDeferredPrompt(event)
      setShowBanner(true)
    }

    function handleAppInstalled() {
      console.info("appinstalled event received")
      setDeferredPrompt(null)
      setShowBanner(false)
      setShowIosBanner(false)
      window.localStorage.removeItem(DISMISS_KEY)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    const fallbackTimer = window.setTimeout(() => {
      if (!window.localStorage.getItem(DISMISS_KEY) && isAndroid) {
        setShowBanner(true)
      }
    }, 900)

    let iosTimer = null
    if (isIos) {
      iosTimer = window.setTimeout(() => {
        if (!window.localStorage.getItem(DISMISS_KEY)) {
          setShowIosBanner(true)
        }
      }, 1800)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
      window.clearTimeout(fallbackTimer)
      if (iosTimer) window.clearTimeout(iosTimer)
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
        setShowBanner(false)
        setShowIosBanner(false)
      }
    } finally {
      setDeferredPrompt(null)
      setIsInstalling(false)
    }
  }

  function handleDismiss() {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setShowBanner(false)
    setShowIosBanner(false)
    setDeferredPrompt(null)
  }

  if (isStandalone || (!showBanner && !showIosBanner && !deferredPrompt)) {
    return null
  }

  const showIosFallback = !deferredPrompt && showIosBanner && isIos
  const showFallback = !deferredPrompt && showBanner && !showIosFallback

  return (
    <div className="patient-install-banner" role="status" aria-live="polite">
      <section className="patient-install-card" aria-label="Install patient portal">
        <div className="patient-install-head">
          <div className="patient-install-icon">
            <Smartphone />
          </div>

          <div className="patient-install-copy">
            <div className="patient-install-kicker">RemedacarePOS</div>
            <h2>Install the patient portal</h2>
            <p>
              {deferredPrompt
                ? "Tap install to add RemedacarePOS to your home screen."
                : showIosFallback
                ? "Tap Share, then choose Add to Home Screen in Safari."
                : "Open the browser menu and choose Install app or Add to Home Screen."}
            </p>
          </div>

          <button type="button" className="patient-install-close" onClick={handleDismiss} aria-label="Dismiss install prompt">
            <X />
          </button>
        </div>

        <div className="patient-install-actions">
          {deferredPrompt ? (
            <button type="button" className="patient-button" onClick={handleInstall} disabled={isInstalling}>
              <Download />
              <span>{isInstalling ? "Preparing install..." : "Install patient portal"}</span>
            </button>
          ) : (
            <button type="button" className="patient-button-secondary" onClick={handleDismiss}>
              Dismiss
            </button>
          )}
        </div>

        {showFallback && !showIosFallback ? (
          <div className="patient-install-fallback">
            <span className="patient-install-fallback-label">If the native prompt doesn’t appear,</span>
            <span>open the browser menu and add the portal to your home screen.</span>
          </div>
        ) : null}
      </section>
    </div>
  )
}
