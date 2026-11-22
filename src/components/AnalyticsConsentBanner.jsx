import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import { BarChart3 } from "lucide-react"
import { CONSENT_EVENT, getAnalyticsConsent, isTrackablePath, setAnalyticsConsent } from "../lib/websiteAnalytics"

// Asks once before any analytics are recorded (Kenya Data Protection Act 2019). Shown only on public pages.
export default function AnalyticsConsentBanner() {
  const { pathname } = useLocation()
  const [consent, setConsent] = useState(getAnalyticsConsent)

  useEffect(() => {
    const update = () => setConsent(getAnalyticsConsent())
    window.addEventListener(CONSENT_EVENT, update)
    return () => window.removeEventListener(CONSENT_EVENT, update)
  }, [])

  if (consent || !isTrackablePath(pathname)) return null

  return (
    <div className="consent-banner" role="dialog" aria-live="polite" aria-label="Analytics choice">
      <BarChart3 size={20} aria-hidden="true" className="consent-icon" />
      <p>
        May we count which pages you visit to improve the site? We record pages and an approximate country only. No IP
        addresses, no advertising and no third-party trackers.
      </p>
      <div className="consent-actions">
        <button type="button" className="btn btn-outline" onClick={() => setAnalyticsConsent("denied")}>No thanks</button>
        <button type="button" className="btn btn-primary" onClick={() => setAnalyticsConsent("granted")}>Allow</button>
      </div>
    </div>
  )
}
