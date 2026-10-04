import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import { useAuth } from "../context/AuthContext"
import { normalizePhone } from "../lib/tutorWhatsApp"
import SEO from "../components/SEO"
import { Link } from "react-router-dom"

export default function WhatsAppSettings() {
  const { user, profile } = useAuth()
  const [phone, setPhone] = useState("")
  const [optedIn, setOptedIn] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    setPhone(profile?.whatsapp_number || "")
    setOptedIn(Boolean(profile?.whatsapp_opted_in))
  }, [profile?.whatsapp_number, profile?.whatsapp_opted_in])

  if (!user) {
    return (
      <main className="page">
        <div className="container-wide" style={{ maxWidth: 680, paddingTop: "2rem", paddingBottom: "4rem" }}>
          <h1>WhatsApp preferences</h1>
          <p>Sign in to manage your number and course-update consent.</p>
          <Link to="/login" className="btn btn-primary">Sign in</Link>
        </div>
      </main>
    )
  }

  async function save(event) {
    event.preventDefault()
    if (!user?.id) return
    setSaving(true)
    setError("")
    setFeedback("")

    const normalizedPhone = normalizePhone(phone)
    if (optedIn && !normalizedPhone) {
      setError("Enter a valid WhatsApp number before opting in.")
      setSaving(false)
      return
    }

    const { error: saveError } = await supabase
      .from("user_profiles")
      .update({
        whatsapp_number: normalizedPhone || null,
        whatsapp_opted_in: optedIn,
        whatsapp_opted_in_at: optedIn ? new Date().toISOString() : null,
      })
      .eq("id", user.id)

    if (saveError) setError(saveError.message)
    else setFeedback("Your WhatsApp preferences are saved.")
    setSaving(false)
  }

  return (
    <main className="page">
      <SEO title="WhatsApp Preferences" description="Manage your WhatsApp number and consent for tutor course updates." path="/whatsapp-settings" />
      <div className="container-wide" style={{ maxWidth: 680, paddingTop: "2rem", paddingBottom: "4rem" }}>
        <h1>WhatsApp preferences</h1>
        <p style={{ color: "var(--text-500)", lineHeight: 1.6 }}>
          Choose whether tutors can send you course updates using their own self-hosted WhatsApp connection. No Meta Cloud API or FlareSend is used.
        </p>

        <form className="card" onSubmit={save} style={{ padding: "1.25rem", display: "grid", gap: "1rem" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="whatsapp-recipient-number">Your WhatsApp number</label>
            <input
              id="whatsapp-recipient-number"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="0712 345 678 or +254 712 345 678"
              autoComplete="tel"
            />
            <small>Your number is private to you and admins.</small>
          </div>

          <label style={{ display: "flex", alignItems: "flex-start", gap: ".7rem", cursor: "pointer" }}>
            <input type="checkbox" checked={optedIn} onChange={(event) => setOptedIn(event.target.checked)} style={{ marginTop: 4, accentColor: "#0F6E56" }} />
            <span>
              <strong>Allow my course tutors to send me WhatsApp updates</strong>
              <span style={{ display: "block", marginTop: 4, color: "var(--text-500)", fontSize: ".85rem" }}>Only updates for courses you are enrolled in. You can turn this off at any time.</span>
            </span>
          </label>

          {error ? <p role="alert" style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
          {feedback ? <p role="status" style={{ color: "#0F6E56", margin: 0 }}>{feedback}</p> : null}
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ justifySelf: "start" }}>{saving ? "Saving…" : "Save preferences"}</button>
        </form>
      </div>
    </main>
  )
}