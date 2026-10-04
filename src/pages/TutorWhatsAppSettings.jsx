import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { useAuth } from "../context/AuthContext"
import WhatsAppFields from "../components/WhatsAppFields"
import TutorTipsManager from "../components/TutorTipsManager"
import { waPayload } from "../lib/tutorWhatsApp"
import { gatewayConfigured, waGateway } from "../lib/waGateway"
import SEO from "../components/SEO"

export default function TutorWhatsAppSettings() {
  const { user, profile, loading: authLoading } = useAuth()
  const [instructor, setInstructor] = useState(null)
  const [courses, setCourses] = useState([])
  const [form, setForm] = useState({
    whatsapp_enabled: false,
    whatsapp_mode: "channel",
    whatsapp_url: "",
    whatsapp_number: "",
    whatsapp_title: "",
    whatsapp_blurb: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [gatewayInstance, setGatewayInstance] = useState(null)
  const [qrImage, setQrImage] = useState("")
  const [gatewayBusy, setGatewayBusy] = useState(false)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError("")
    const { data, error: instructorError } = await supabase
      .from("instructors")
      .select("*")
      .eq("linked_user_id", user.id)
      .maybeSingle()

    if (instructorError) {
      setError(instructorError.message)
      setLoading(false)
      return
    }
    setInstructor(data || null)
    if (data) {
      setForm({
        whatsapp_enabled: Boolean(data.whatsapp_enabled),
        whatsapp_mode: data.whatsapp_mode || "channel",
        whatsapp_url: data.whatsapp_url || "",
        whatsapp_number: data.whatsapp_number || "",
        whatsapp_title: data.whatsapp_title || "",
        whatsapp_blurb: data.whatsapp_blurb || "",
      })
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("id, title, slug, instructor_id")
        .eq("instructor_id", data.id)
        .order("title", { ascending: true })
      if (courseError) setError(courseError.message)
      else setCourses(courseData || [])
    }
    setLoading(false)
  }, [user])

  useEffect(() => { if (!authLoading) void load() }, [authLoading, load])

  const refreshGateway = useCallback(async (instructorId = instructor?.id) => {
    if (!instructorId || !gatewayConfigured) return
    try {
      const instances = await waGateway.list()
      const instance = instances.find((item) => item.id === instructorId)
      if (!instance) {
        setGatewayInstance(null)
        setQrImage("")
        return
      }
      const pairing = await waGateway.qr(instructorId)
      setGatewayInstance(pairing)
      setQrImage(pairing.qr || "")
    } catch (gatewayError) {
      setError(gatewayError.message)
    }
  }, [instructor?.id])

  useEffect(() => {
    if (!instructor?.id || !form.whatsapp_number.trim() || !gatewayConfigured) return undefined
    void refreshGateway(instructor.id)
    const interval = window.setInterval(() => void refreshGateway(instructor.id), 3000)
    return () => window.clearInterval(interval)
  }, [instructor?.id, form.whatsapp_number, refreshGateway])

  async function createTutorProfile() {
    if (!user?.id) return
    setSaving(true)
    setError("")
    const { data: existing, error: lookupError } = await supabase
      .from("instructors")
      .select("id")
      .eq("id", user.id)
      .maybeSingle()
    if (lookupError) {
      setError(lookupError.message)
      setSaving(false)
      return
    }

    const payload = {
      id: user.id,
      linked_user_id: user.id,
      name: profile?.full_name || user.email || "Pharmacourse tutor",
      whatsapp_enabled: false,
      whatsapp_mode: "channel",
    }
    const result = existing
      ? await supabase.from("instructors").update({ linked_user_id: user.id }).eq("id", user.id)
      : await supabase.from("instructors").insert(payload)

    if (result.error) setError(result.error.message)
    else await load()
    setSaving(false)
  }

  async function saveSettings() {
    if (!instructor) return
    setSaving(true)
    setError("")
    setMessage("")
    const { error: saveError } = await supabase
      .from("instructors")
      .update({ ...waPayload(form), updated_at: new Date().toISOString() })
      .eq("id", instructor.id)
      .eq("linked_user_id", user.id)
    if (saveError) setError(saveError.message)
    else {
      setInstructor((current) => ({ ...current, ...waPayload(form) }))
      setMessage("Your WhatsApp settings are saved.")
    }
    setSaving(false)
  }

  async function connectWhatsApp() {
    if (!instructor || !form.whatsapp_number.trim()) {
      setError("Enter and save your WhatsApp number before linking it.")
      return
    }
    setGatewayBusy(true)
    setError("")
    try {
      const { error: saveError } = await supabase
        .from("instructors")
        .update({ ...waPayload(form), updated_at: new Date().toISOString() })
        .eq("id", instructor.id)
        .eq("linked_user_id", user.id)
      if (saveError) throw saveError
      setInstructor((current) => ({ ...current, ...waPayload(form) }))
      await waGateway.create(instructor.id, instructor.name)
      await refreshGateway(instructor.id)
    } catch (connectError) {
      setError(connectError.message)
    } finally {
      setGatewayBusy(false)
    }
  }

  async function disconnectWhatsApp() {
    if (!instructor || !window.confirm("Unlink this WhatsApp device from your tutor account?")) return
    setGatewayBusy(true)
    try {
      await waGateway.remove(instructor.id)
      setGatewayInstance(null)
      setQrImage("")
    } catch (disconnectError) {
      setError(disconnectError.message)
    } finally {
      setGatewayBusy(false)
    }
  }

  if (authLoading || loading) return <main className="page"><div className="container-wide"><p>Loading tutor settings…</p></div></main>
  if (!user) return <main className="page"><div className="container-wide"><h1>Tutor WhatsApp settings</h1><p>Sign in with your tutor account to manage your WhatsApp links.</p><Link to="/login" className="btn btn-primary">Sign in</Link></div></main>

  return (
    <main className="page">
      <SEO title="Tutor WhatsApp Settings" description="Manage the WhatsApp contact and tips shown on your courses." path="/tutor/whatsapp" />
      <div className="container-wide" style={{ maxWidth: 900, paddingTop: "2rem", paddingBottom: "4rem" }}>
        <h1 style={{ marginBottom: ".4rem" }}>Your WhatsApp settings</h1>
        <p style={{ color: "var(--text-500)", marginTop: 0 }}>These links appear on courses assigned to your instructor profile. Your number is not used for other tutors or the website help chat.</p>
        {error ? <p role="alert" style={{ color: "var(--danger)" }}>{error}</p> : null}

        {!instructor ? (
          <section className="card" style={{ padding: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem" }}>No tutor profile is linked yet</h2>
            <p style={{ color: "var(--text-500)" }}>Ask an administrator to link your account to your instructor profile. If you are creating a new tutor profile, you can create one here.</p>
            <button type="button" className="btn btn-primary" onClick={() => void createTutorProfile()} disabled={saving}>{saving ? "Creating…" : "Create my tutor profile"}</button>
          </section>
        ) : (
          <>
            <section className="card" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1rem", marginTop: 0 }}>{instructor.name}</h2>
              <WhatsAppFields value={form} onChange={(nextValue) => setForm((current) => ({ ...current, ...nextValue }))} />
              <div style={{ display: "flex", alignItems: "center", gap: ".75rem", marginTop: "1rem" }}>
                <button type="button" className="btn btn-primary" onClick={() => void saveSettings()} disabled={saving}>{saving ? "Saving…" : "Save my settings"}</button>
                {message ? <span role="status" style={{ color: "#0F6E56" }}>{message}</span> : null}
              </div>
            </section>

            <section className="card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1rem", marginTop: 0 }}>Connect your WhatsApp</h2>
              <p style={{ color: "var(--text-500)", lineHeight: 1.6 }}>
                This self-hosted linked-device connection uses your tutor number and does not use Meta Cloud API or FlareSend. Unofficial WhatsApp Web automation may put your account at risk; only message learners who opted in.
              </p>
              {!gatewayConfigured ? (
                <p role="status" style={{ color: "#9a5b00" }}>The local gateway URL has not been configured for this deployment.</p>
              ) : (
                <>
                  <p>Status: <strong>{gatewayInstance?.status || "Not connected"}</strong>{gatewayInstance?.phone ? ` as ${gatewayInstance.phone}` : ""}</p>
                  {qrImage ? <img src={qrImage} alt="WhatsApp linked-device QR code" width="260" height="260" style={{ maxWidth: "100%", height: "auto", border: "1px solid var(--border)", borderRadius: 8 }} /> : null}
                  {gatewayInstance?.status === "wrong_account" ? <p role="alert" style={{ color: "var(--danger)" }}>The linked account does not match your saved WhatsApp number.</p> : null}
                  <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", marginTop: ".75rem" }}>
                    {!gatewayInstance?.status || ["disconnected", "error", "wrong_account"].includes(gatewayInstance.status) ? <button type="button" className="btn btn-primary" onClick={() => void connectWhatsApp()} disabled={gatewayBusy}>{gatewayBusy ? "Starting…" : gatewayInstance?.status === "wrong_account" ? "Try linking again" : "Link my WhatsApp"}</button> : null}
                    {gatewayInstance?.status === "connected" ? <button type="button" className="btn btn-outline" onClick={() => void disconnectWhatsApp()} disabled={gatewayBusy}>Unlink device</button> : null}
                  </div>
                </>
              )}
            </section>

            <section style={{ display: "grid", gap: "1rem" }}>
              <h2 style={{ fontSize: "1.1rem", marginBottom: 0 }}>Tips for my courses</h2>
              {courses.map((course) => (
                <TutorTipsManager key={course.id} courseId={course.id} courseTitle={course.title} courseSlug={course.slug} instructorId={instructor.id} gatewayInstanceId={gatewayInstance?.status === "connected" ? instructor.id : ""} />
              ))}
              {courses.length === 0 ? <p style={{ color: "var(--text-500)" }}>No courses are assigned to this instructor profile yet.</p> : null}
            </section>
          </>
        )}
      </div>
    </main>
  )
}