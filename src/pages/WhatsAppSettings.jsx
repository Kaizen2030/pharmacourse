// src/pages/WhatsAppSettings.jsx
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import { useAuth } from "../context/AuthContext"
import { Send, CheckCircle, AlertCircle } from "lucide-react"

// ─────────────────────────────────────────────────────────────
// HOW WHATSAPP SENDING WORKS:
//
// We call the WhatsApp Cloud API directly from the browser using
// your Meta Business WABA credentials stored in env vars.
// The pearl content is sent as a text message to the user's number.
//
// Required env vars in your .env:
//   VITE_WHATSAPP_TOKEN=EAAxxxxx   (your permanent system user token)
//   VITE_WHATSAPP_PHONE_ID=12345   (your WABA phone number ID)
//
// For automated daily sends at 7AM, set up a Supabase Edge Function
// using the supabase/functions/send-daily-pearl/ folder (see below).
// ─────────────────────────────────────────────────────────────

const WA_TOKEN    = import.meta.env.VITE_WHATSAPP_TOKEN
const WA_PHONE_ID = import.meta.env.VITE_WHATSAPP_PHONE_ID

async function sendWhatsAppMessage(toNumber, pearlTitle, pearlContent) {
  if (!WA_TOKEN || !WA_PHONE_ID) {
    throw new Error("WhatsApp credentials not configured. Add VITE_WHATSAPP_TOKEN and VITE_WHATSAPP_PHONE_ID to your .env file.")
  }

  // Normalize number — strip spaces, ensure 254 prefix
  let num = toNumber.replace(/\s+/g, "").replace(/^\+/, "")
  if (num.startsWith("0")) num = "254" + num.slice(1)

  const body = `💊 *PharmaCourse Daily Pearl*\n\n*${pearlTitle}*\n\n${pearlContent}\n\n📖 Keep learning → pharmacourse.co.ke`

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WA_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: num,
        type: "text",
        text: { body }
      })
    }
  )

  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || "WhatsApp API error")
  }
  return data
}

export default function WhatsAppSettings() {
  const { user, profile } = useAuth()
  const [phone, setPhone]         = useState("")
  const [optedIn, setOptedIn]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [pearls, setPearls]       = useState([])
  const [recentSends, setRecentSends] = useState([])
  const [selectedPearl, setSelectedPearl] = useState("")
  const [sending, setSending]     = useState(false)
  const [sendResult, setSendResult] = useState(null) // { ok, message }
  const credsMissing = !WA_TOKEN || !WA_PHONE_ID

  useEffect(() => {
    if (profile) {
      setPhone(profile.whatsapp_number || "")
      setOptedIn(profile.whatsapp_opted_in || false)
    }
    if (user) {
      loadPearls()
      loadRecentSends()
    }
  }, [profile, user])

  async function loadPearls() {
    const { data } = await supabase
      .from("clinical_pearls")
      .select("id, title, content")
      .order("created_at", { ascending: false })
    setPearls(data || [])
    if (data?.length > 0) setSelectedPearl(data[0].id)
  }

  async function loadRecentSends() {
    // Fixed: join on pearl_id, use content not body
    const { data } = await supabase
      .from("whatsapp_send_log")
      .select("id, sent_at, status, pearl_id, clinical_pearls(title, content)")
      .eq("user_id", user.id)
      .order("sent_at", { ascending: false })
      .limit(5)
    setRecentSends(data || [])
  }

  async function save() {
    setSaving(true)
    await supabase.from("user_profiles").update({
      whatsapp_number: phone.trim(),
      whatsapp_opted_in: optedIn,
    }).eq("id", user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function sendTestPearl() {
    if (!phone.trim()) { alert("Save your phone number first."); return }
    if (!selectedPearl) { alert("No pearls available. Create a pearl in Admin → Simulation Admin first."); return }

    setSending(true)
    setSendResult(null)

    const pearl = pearls.find(p => p.id === selectedPearl)
    if (!pearl) { setSending(false); return }

    try {
      await sendWhatsAppMessage(phone.trim(), pearl.title, pearl.content)

      // Log the send
      await supabase.from("whatsapp_send_log").insert({
        user_id: user.id,
        pearl_id: pearl.id,
        status: "sent",
        sent_at: new Date().toISOString()
      })

      setSendResult({ ok: true, message: `Pearl sent to ${phone}! Check WhatsApp.` })
      loadRecentSends()
    } catch (err) {
      setSendResult({ ok: false, message: err.message })
    }
    setSending(false)
  }

  const inputStyle = {
    width: "100%", padding: ".65rem .9rem",
    border: "1.5px solid #e0e0e0", borderRadius: 8,
    fontSize: ".9rem", fontFamily: "inherit", outline: "none",
    boxSizing: "border-box", background: "#fff"
  }

  return (
    <div className="page">
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "2rem 1rem 4rem" }}>

        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: ".35rem", color: "#0a2e1f" }}>
            📱 WhatsApp Microlearning
          </h1>
          <p style={{ color: "var(--text-500)", lineHeight: 1.65, margin: 0 }}>
            Get a daily 3-minute clinical pearl sent to your WhatsApp every morning at 7 AM EAT.
          </p>
        </div>

        {/* Credentials warning */}
        {credsMissing && (
          <div style={{ background: "#fff8e7", border: "1.5px solid #E09B00", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", gap: ".75rem" }}>
            <AlertCircle size={18} color="#E09B00" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontWeight: 700, fontSize: ".88rem", color: "#7a4f00", margin: "0 0 .3rem" }}>WhatsApp credentials not configured</p>
              <p style={{ fontSize: ".82rem", color: "#7a4f00", margin: 0, lineHeight: 1.6 }}>
                Add <code>VITE_WHATSAPP_TOKEN</code> and <code>VITE_WHATSAPP_PHONE_ID</code> to your <code>.env</code> file to enable real sending. Get these from your Meta Business WhatsApp dashboard.
              </p>
            </div>
          </div>
        )}

        {/* Preview */}
        <div style={{ marginBottom: "2rem", background: "#075E54", borderRadius: 16, padding: "1.5rem", color: "white" }}>
          <div style={{ display: "flex", alignItems: "center", gap: ".75rem", marginBottom: "1rem" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>💊</div>
            <div>
              <p style={{ fontWeight: 700, fontSize: ".9rem", margin: 0 }}>PharmaCourse</p>
              <p style={{ fontSize: ".75rem", opacity: .7, margin: 0 }}>Daily Clinical Pearl</p>
            </div>
          </div>
          <div style={{ background: "#128C7E", borderRadius: "0 12px 12px 12px", padding: "1rem", maxWidth: "85%", fontSize: ".88rem", lineHeight: 1.6 }}>
            <p style={{ fontWeight: 700, marginBottom: ".4rem", margin: "0 0 .4rem" }}>🧬 Today's Pearl: AMR Stewardship</p>
            <p style={{ margin: "0 0 .75rem" }}>Always check local antibiogram data before prescribing empiric antibiotics. National resistance patterns in Kenya show 68% E. coli resistance to co-trimoxazole.</p>
            <p style={{ margin: 0, color: "#A7F3D0" }}>📖 Keep learning → pharmacourse.co.ke</p>
          </div>
          <p style={{ fontSize: ".72rem", opacity: .5, marginTop: ".75rem", textAlign: "right", margin: ".75rem 0 0" }}>7:00 AM ✓✓</p>
        </div>

        {/* Settings */}
        <div style={{ background: "#fff", border: "1px solid #e8ede9", borderRadius: 16, padding: "1.75rem", marginBottom: "1.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "#0a2e1f", margin: "0 0 1.25rem" }}>Your Settings</h2>

          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: ".82rem", color: "#555", marginBottom: ".35rem", textTransform: "uppercase", letterSpacing: .4 }}>
              WhatsApp Number
            </label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. 0712345678 or 254712345678"
              type="tel"
              style={inputStyle}
            />
            <p style={{ fontSize: ".75rem", color: "var(--text-500)", marginTop: ".35rem" }}>
              Kenyan numbers: start with 07 or 254. We only use this for daily pearls.
            </p>
          </div>

          <div style={{ padding: "1rem", background: "#f8faf9", borderRadius: 10, border: "1.5px solid #e8ede9", marginBottom: "1.25rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: ".75rem", cursor: "pointer" }}>
              <input type="checkbox" checked={optedIn} onChange={e => setOptedIn(e.target.checked)}
                style={{ width: "auto", accentColor: "#0F6E56", transform: "scale(1.3)" }} />
              <div>
                <p style={{ fontWeight: 600, fontSize: ".9rem", margin: 0 }}>Send me daily clinical pearls on WhatsApp</p>
                <p style={{ fontSize: ".78rem", color: "var(--text-500)", marginTop: ".15rem", margin: ".15rem 0 0" }}>
                  One message per day · 7 AM EAT · Reply STOP to unsubscribe
                </p>
              </div>
            </label>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button onClick={save} disabled={saving} style={{
              background: "#0F6E56", color: "#fff", border: "none",
              borderRadius: 9, padding: ".7rem 1.5rem", fontWeight: 700,
              fontSize: ".9rem", cursor: "pointer", opacity: saving ? .7 : 1
            }}>
              {saving ? "Saving…" : "Save Settings"}
            </button>
            {saved && <span style={{ color: "#0F6E56", fontWeight: 700, fontSize: ".88rem", display: "flex", alignItems: "center", gap: 4 }}><CheckCircle size={14} /> Saved!</span>}
          </div>
        </div>

        {/* Send test pearl */}
        <div style={{ background: "#fff", border: "1px solid #e8ede9", borderRadius: 16, padding: "1.75rem", marginBottom: "1.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "#0a2e1f", margin: "0 0 .5rem" }}>Send a Pearl Now</h2>
          <p style={{ fontSize: ".85rem", color: "var(--text-500)", margin: "0 0 1.25rem" }}>
            Test the delivery or manually send a pearl to your number.
          </p>

          {pearls.length === 0 ? (
            <p style={{ fontSize: ".88rem", color: "#aaa", fontStyle: "italic" }}>
              No pearls available. Create pearls in <strong>Admin → Simulation Admin → Clinical Pearls</strong>.
            </p>
          ) : (
            <>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontWeight: 600, fontSize: ".82rem", color: "#555", marginBottom: ".35rem", textTransform: "uppercase", letterSpacing: .4 }}>
                  Select Pearl
                </label>
                <select
                  value={selectedPearl}
                  onChange={e => setSelectedPearl(e.target.value)}
                  style={inputStyle}
                >
                  {pearls.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={sendTestPearl}
                disabled={sending || credsMissing}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: credsMissing ? "#aaa" : "#25D366", color: "#fff",
                  border: "none", borderRadius: 9, padding: ".7rem 1.5rem",
                  fontWeight: 700, fontSize: ".9rem",
                  cursor: sending || credsMissing ? "not-allowed" : "pointer",
                  opacity: sending ? .8 : 1
                }}
              >
                <Send size={15} />
                {sending ? "Sending…" : credsMissing ? "Credentials Missing" : "Send to My WhatsApp"}
              </button>

              {sendResult && (
                <div style={{
                  marginTop: "1rem", padding: ".9rem 1rem", borderRadius: 9,
                  background: sendResult.ok ? "#e8f5f0" : "#fdf2f2",
                  border: `1px solid ${sendResult.ok ? "#b8dfd3" : "#f5c6c6"}`,
                  display: "flex", gap: ".75rem", alignItems: "flex-start"
                }}>
                  {sendResult.ok
                    ? <CheckCircle size={16} color="#0F6E56" style={{ flexShrink: 0, marginTop: 1 }} />
                    : <AlertCircle size={16} color="#E24B4A" style={{ flexShrink: 0, marginTop: 1 }} />
                  }
                  <p style={{ fontSize: ".85rem", color: sendResult.ok ? "#0a2e1f" : "#c0392b", margin: 0, lineHeight: 1.6 }}>
                    {sendResult.message}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Recent sends */}
        {recentSends.length > 0 && (
          <div>
            <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "#0a2e1f", marginBottom: "1rem" }}>Recent Sends</h2>
            {recentSends.map(s => (
              <div key={s.id} style={{
                background: "#fff", border: "1px solid #e8ede9", borderRadius: 12,
                padding: "1rem 1.25rem", marginBottom: ".75rem",
                borderLeft: "4px solid #0F6E56", display: "flex", justifyContent: "space-between", alignItems: "flex-start"
              }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: ".88rem", color: "#0a2e1f", margin: "0 0 .25rem" }}>
                    {s.clinical_pearls?.title || "Pearl"}
                  </p>
                  <p style={{ fontSize: ".78rem", color: "var(--text-500)", margin: 0, lineHeight: 1.5 }}>
                    {s.clinical_pearls?.content?.slice(0, 100)}…
                  </p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "1rem" }}>
                  <span style={{ fontSize: ".72rem", background: "#e8f5f0", color: "#0F6E56", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>
                    {s.status || "sent"}
                  </span>
                  <p style={{ fontSize: ".72rem", color: "#aaa", margin: ".3rem 0 0" }}>
                    {new Date(s.sent_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Setup instructions */}
        <div style={{ background: "#f8faf9", border: "1px solid #e8ede9", borderRadius: 14, padding: "1.5rem", marginTop: "1.5rem" }}>
          <h3 style={{ fontSize: ".9rem", fontWeight: 800, color: "#0a2e1f", margin: "0 0 .75rem" }}>⚙️ Setup Guide</h3>
          <ol style={{ fontSize: ".82rem", color: "#555", lineHeight: 2, margin: 0, paddingLeft: "1.25rem" }}>
            <li>Go to <strong>Meta for Developers → WhatsApp → API Setup</strong></li>
            <li>Copy your <strong>Phone Number ID</strong> → add to <code>.env</code> as <code>VITE_WHATSAPP_PHONE_ID</code></li>
            <li>Generate a <strong>Permanent System User Token</strong> → add as <code>VITE_WHATSAPP_TOKEN</code></li>
            <li>Add your test number to the sandbox recipients list</li>
            <li>For daily automated sends: create a <strong>Supabase Edge Function</strong> with pg_cron scheduled at <code>04:00 UTC</code> (7AM EAT)</li>
          </ol>
          <div style={{ background: "#0a2e1f", borderRadius: 8, padding: ".75rem 1rem", marginTop: "1rem", fontFamily: "monospace", fontSize: ".78rem", color: "#a8e6cf" }}>
            # .env<br />
            VITE_WHATSAPP_TOKEN=EAAxxxxx<br />
            VITE_WHATSAPP_PHONE_ID=1234567890
          </div>
        </div>

      </div>
    </div>
  )
}
