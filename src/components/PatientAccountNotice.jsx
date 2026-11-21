import { useCallback, useEffect, useState } from "react"
import { ShieldCheck, ShieldAlert } from "lucide-react"
import { pharmacyosClient } from "../lib/pharmacyosClient"
import { requestPatientPortalRefresh } from "../lib/patientPortalRealtime"

async function readFunctionError(error, fallback) {
  try {
    const body = await error?.context?.json?.()
    return { message: body?.error || fallback, code: body?.code || null }
  } catch {
    return { message: error?.message || fallback, code: null }
  }
}

// Explains what the patient can see, and lets them confirm their phone by SMS code:
// - their phone is linked to another account (must be sorted out at the pharmacy), or
// - their account is not yet confirmed, so only activity since they joined is shown.
export default function PatientAccountNotice() {
  const [status, setStatus] = useState(null)
  const [step, setStep] = useState("idle") // idle | sending | code | confirming
  const [code, setCode] = useState("")
  const [message, setMessage] = useState(null)
  const [smsUnavailable, setSmsUnavailable] = useState(false)

  const loadStatus = useCallback(async () => {
    const { data, error } = await pharmacyosClient.rpc("patient_portal_account_status")
    if (!error && data?.signed_in) setStatus(data)
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])

  async function sendCode() {
    setStep("sending"); setMessage(null)
    const { data, error } = await pharmacyosClient.functions.invoke("patient-portal-verify-phone", { body: { action: "send" } })
    if (error) {
      const { message: text, code: errorCode } = await readFunctionError(error, "We could not send the code right now.")
      if (errorCode === "sms_not_configured") setSmsUnavailable(true)
      setMessage({ type: "error", text })
      setStep("idle")
      return
    }
    if (data?.already_verified) { await loadStatus(); requestPatientPortalRefresh(); setStep("idle"); return }
    setMessage({ type: "info", text: `We sent a 6-digit code to ${data?.to || "your phone"}. It expires in 10 minutes.` })
    setStep("code")
  }

  async function confirmCode(event) {
    event.preventDefault()
    setStep("confirming"); setMessage(null)
    const { data, error } = await pharmacyosClient.rpc("patient_portal_otp_confirm", { p_code: code })
    if (error) { setMessage({ type: "error", text: error.message }); setStep(/expired|new code/i.test(error.message) ? "idle" : "code"); return }
    if (!data?.verified) { setMessage({ type: "error", text: data?.error || "That code is not right." }); setStep("code"); return }
    setCode("")
    setMessage({ type: "success", text: "Your phone number is confirmed. Your full pharmacy history is now visible." })
    setStep("idle")
    await loadStatus()
    requestPatientPortalRefresh()
  }

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

  if (!status.phone) return null
  if (status.verified) {
    return message?.type === "success" ? (
      <section className="patient-card patient-card-muted" role="status" style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <ShieldCheck aria-hidden="true" style={{ color: "#0f6e56" }} /> <span>{message.text}</span>
      </section>
    ) : null
  }

  const since = status.history_from ? new Date(status.history_from).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : null
  return (
    <section className="patient-card patient-card-muted" style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
      <ShieldCheck aria-hidden="true" style={{ color: "#0f6e56", flex: "0 0 auto" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="patient-meta-title">Showing activity {since ? `since ${since}` : "since you joined"}</div>
        <p style={{ margin: "0.3rem 0 0.6rem" }}>
          For your privacy, earlier pharmacy records stay hidden until you confirm this phone number is yours.
          {smsUnavailable ? " Ask the pharmacist to confirm your account at the counter." : " We can text you a code, or the pharmacist can confirm it at the counter."}
        </p>
        {!smsUnavailable && (step === "idle" || step === "sending") && (
          <button type="button" className="patient-button-secondary" onClick={sendCode} disabled={step === "sending"}>
            {step === "sending" ? "Sending code…" : "Text me a code"}
          </button>
        )}
        {(step === "code" || step === "confirming") && (
          <form onSubmit={confirmCode} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <label htmlFor="patient-otp" className="patient-form-help" style={{ width: "100%" }}>Enter the 6-digit code</label>
            <input
              id="patient-otp"
              className="patient-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/[^\d ]/g, ""))}
              style={{ maxWidth: 160, letterSpacing: "0.2em" }}
              required
            />
            <button type="submit" className="patient-button" disabled={step === "confirming" || code.replace(/\D/g, "").length !== 6}>
              {step === "confirming" ? "Checking…" : "Confirm"}
            </button>
            <button type="button" className="patient-button-secondary" onClick={sendCode} disabled={step === "confirming"}>Send a new code</button>
          </form>
        )}
        {message && (
          <p role={message.type === "error" ? "alert" : "status"} style={{ margin: "0.5rem 0 0", color: message.type === "error" ? "#b91c1c" : "#0f6e56" }}>
            {message.text}
          </p>
        )}
      </div>
    </section>
  )
}
