import { useState } from "react"

const POS_URL = import.meta.env.VITE_PATIENT_PORTAL_POS_URL || "/pos/index.html"

export default function PatientPortalOperations() {
  const [failed, setFailed] = useState(false)

  return (
    <main style={{ minHeight: "100vh", background: "#071d16", padding: 12 }}>
      {failed ? (
        <section style={{ maxWidth: 640, margin: "12vh auto", padding: 32, borderRadius: 18, background: "#fff", color: "#17372b", textAlign: "center" }}>
          <h1>Operations preview unavailable</h1>
          <p>Build the POS web bundle and place it in <code>public/pos</code>, or set VITE_PATIENT_PORTAL_POS_URL to your preview URL.</p>
        </section>
      ) : (
        <iframe
          title="Pharmacy operations preview"
          src={POS_URL}
          onError={() => setFailed(true)}
          style={{ display: "block", width: "100%", height: "calc(100vh - 24px)", minHeight: 720, border: 0, borderRadius: 14, background: "#fff" }}
          allow="clipboard-read; clipboard-write"
        />
      )}
    </main>
  )
}
