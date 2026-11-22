import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { MessageCircle, ShieldCheck } from "lucide-react"
import { supabase } from "../lib/supabaseClient"
import { useAuth } from "../context/AuthContext"
import { normalizePhone } from "../lib/tutorWhatsApp"
import { friendlyError } from "../lib/friendlyError"
import SEO from "../components/SEO"
import "../styles/wa-ui.css"

function Hero() {
  return (
    <header className="wa-hero">
      <span className="wa-hero-icon"><MessageCircle size={26} aria-hidden="true" /></span>
      <div>
        <h1>WhatsApp preferences</h1>
        <p>Choose whether your course tutors can send you updates on WhatsApp. Messages come from your tutor's own number.</p>
      </div>
    </header>
  )
}

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
      <main className="wa-page">
        <div className="wa-shell">
          <Hero />
          <section className="wa-card">
            <p className="wa-muted">Sign in to manage your number and course-update consent.</p>
            <div className="wa-actions"><Link to="/login" className="btn btn-primary">Sign in</Link></div>
          </section>
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

    if (saveError) setError(friendlyError(saveError, "We could not save your preferences. Please try again."))
    else setFeedback("Your WhatsApp preferences are saved.")
    setSaving(false)
  }

  return (
    <main className="wa-page">
      <SEO title="WhatsApp Preferences" description="Manage your WhatsApp number and consent for tutor course updates." path="/whatsapp-settings" noindex />
      <div className="wa-shell">
        <Hero />

        <form className="wa-card" onSubmit={save}>
          <div className="wa-field">
            <label htmlFor="whatsapp-recipient-number">Your WhatsApp number</label>
            <input
              id="whatsapp-recipient-number"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="0712 345 678 or +254 712 345 678"
              autoComplete="tel"
            />
            <small>Only you and Pharmacourse admins can see this number.</small>
          </div>

          <label className="wa-toggle">
            <input type="checkbox" checked={optedIn} onChange={(event) => setOptedIn(event.target.checked)} />
            <span className="wa-switch" aria-hidden="true" />
            <span>
              <strong>Allow my course tutors to send me WhatsApp updates</strong>
              <span className="wa-hint">Only for courses you are enrolled in. You can turn this off at any time.</span>
            </span>
          </label>

          {error ? <p role="alert" className="wa-alert error">{error}</p> : null}
          {feedback ? <p role="status" className="wa-alert ok">{feedback}</p> : null}

          <div className="wa-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save preferences"}</button>
            <span className="wa-hint" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <ShieldCheck size={15} aria-hidden="true" /> We never sell or share your number.
            </span>
          </div>
        </form>
      </div>
    </main>
  )
}
