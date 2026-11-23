import { useEffect, useRef } from "react"
import { BellRing, X } from "lucide-react"
import "./ComingSoonPopup.css"

// Small pop-up shown when someone tries to enrol in a course whose lessons are not ready yet.
export default function ComingSoonPopup({ courseTitle, notifyHref, tutorHref, onClose }) {
  const closeRef = useRef(null)

  useEffect(() => {
    closeRef.current?.focus()
    function onKey(event) { if (event.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className="csp-backdrop" onClick={onClose}>
      <div
        className="csp-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="csp-title"
        aria-describedby="csp-text"
        onClick={(event) => event.stopPropagation()}
      >
        <button ref={closeRef} type="button" className="csp-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>

        <div className="csp-art" aria-hidden="true">
          <span className="csp-orbit" />
          <span className="csp-capsule">
            <span className="csp-half" />
            <span className="csp-half" />
          </span>
          <span className="csp-spark s1" />
          <span className="csp-spark s2" />
          <span className="csp-spark s3" />
        </div>

        <span className="csp-tag">Coming soon</span>
        <h2 id="csp-title">Still in the lab</h2>
        <p id="csp-text">
          <strong>{courseTitle}</strong> isn't open for enrolment yet. We're preparing the lessons right now.
        </p>

        <div className="csp-actions">
          <a href={notifyHref} target="_blank" rel="noreferrer noopener" className="btn btn-primary csp-notify">
            <BellRing size={16} aria-hidden="true" /> Notify me on WhatsApp
          </a>
          <button type="button" className="csp-later" onClick={onClose}>Got it</button>
        </div>

        {tutorHref ? (
          <a href={tutorHref} target="_blank" rel="noreferrer noopener" className="csp-tutor">
            Know this topic? Apply to teach it →
          </a>
        ) : null}
      </div>
    </div>
  )
}
