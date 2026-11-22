import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import { CONSENT_EVENT, getAnalyticsConsent, recordWebsiteEvent } from "../lib/websiteAnalytics"

// Counts page views on public pages once the visitor has accepted analytics. Only the path is sent.
export default function WebsiteAnalyticsTracker() {
  const { pathname } = useLocation()
  const [consent, setConsent] = useState(getAnalyticsConsent)

  useEffect(() => {
    const update = () => setConsent(getAnalyticsConsent())
    window.addEventListener(CONSENT_EVENT, update)
    return () => window.removeEventListener(CONSENT_EVENT, update)
  }, [])

  useEffect(() => {
    if (consent !== "granted") return
    const path = pathname || "/"
    void recordWebsiteEvent({ eventName: "page_view", pathname: path })

    const flag = "pharmacourse.website.session_started"
    try {
      if (!window.sessionStorage.getItem(flag)) {
        window.sessionStorage.setItem(flag, "1")
        void recordWebsiteEvent({ eventName: "session_start", pathname: path })
      }
    } catch {
      // Storage blocked: skip the session marker.
    }
  }, [pathname, consent])

  return null
}
