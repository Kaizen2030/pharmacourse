import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { recordWebsiteEvent } from "../lib/websiteAnalytics"

export default function WebsiteAnalyticsTracker() {
  const location = useLocation()

  useEffect(() => {
    if (typeof window === "undefined") return

    const pathname = location.pathname || "/"
    const search = location.search || ""
    const title = typeof document !== "undefined" ? document.title : ""

    void recordWebsiteEvent({
      eventName: "page_view",
      pathname,
      title,
      search,
      metadata: {
        hash: location.hash || "",
      },
    })

    const sessionStartFlag = "pharmacourse.website.session_started"
    try {
      if (!window.sessionStorage.getItem(sessionStartFlag)) {
        window.sessionStorage.setItem(sessionStartFlag, "1")
        void recordWebsiteEvent({
          eventName: "session_start",
          pathname,
          title,
          search,
        })
      }
    } catch {
      // Ignore storage failures.
    }
  }, [location.hash, location.pathname, location.search])

  return null
}

