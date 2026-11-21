import { useEffect } from "react"

// The pharmacy operations app (RemedacarePOS web build) lives at /pos/index.html as its own page. It used to be
// shown here inside an iframe, but the site sends X-Frame-Options: DENY (which also protects the POS from being
// framed by other sites), so the frame could never load. Go straight to the app instead. Staff still sign in.
const POS_URL = import.meta.env.VITE_PATIENT_PORTAL_POS_URL || "/pos/index.html"

export default function PatientPortalOperations() {
  useEffect(() => {
    window.location.replace(POS_URL)
  }, [])

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#071d16", color: "#e6f4ee", fontFamily: "system-ui, sans-serif" }}>
      <p>
        Opening the pharmacy operations app… <a href={POS_URL} style={{ color: "#8fe3c3" }}>Continue</a>
      </p>
    </main>
  )
}
