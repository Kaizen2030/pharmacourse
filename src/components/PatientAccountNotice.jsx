import { useEffect, useState } from "react"
import { ShieldCheck, ShieldAlert } from "lucide-react"
import { pharmacyosClient } from "../lib/pharmacyosClient"

// Explains what the patient can see:
// - their phone is linked to another account (must be sorted out at the pharmacy), or
// - their account is not yet confirmed by the pharmacy, so only activity since they joined is shown.
export default function PatientAccountNotice() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    let active = true
    pharmacyosClient.rpc("patient_portal_account_status").then(({ data, error }) => {
      if (!active || error || !data?.signed_in) return
      setStatus(data)
    })
    return () => { active = false }
  }, [])

  if (!status) return null

  if (status.phone_taken) {
    return (
      <section className="patient-card" role="alert" style={{ borderColor: "#fecaca", background: "#fef2f2", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
        <ShieldAlert aria-hidden="true" style={{ color: "#b91c1c", flex: "0 0 auto" }} />
        <div>
          <div className="patient-meta-title">Your phone number is linked to another account</div>
          <p style={{ margin: "0.3rem 0 0" }}>
            To protect patient records, a phone number can only belong to one patient account. Visit the pharmacy with your ID and
            ask the pharmacist to move the number to this account.
          </p>
        </div>
      </section>
    )
  }

  if (!status.phone || status.verified) return null

  const since = status.history_from ? new Date(status.history_from).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : null
  return (
    <section className="patient-card patient-card-muted" style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
      <ShieldCheck aria-hidden="true" style={{ color: "#0f6e56", flex: "0 0 auto" }} />
      <div>
        <div className="patient-meta-title">Showing activity {since ? `since ${since}` : "since you joined"}</div>
        <p style={{ margin: "0.3rem 0 0" }}>
          For your privacy, earlier pharmacy records stay hidden until the pharmacist confirms this account is yours. Ask at the
          counter on your next visit.
        </p>
      </div>
    </section>
  )
}
