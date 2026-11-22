import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { useAuth } from "../context/AuthContext"
import WhatsAppFields from "../components/WhatsAppFields"
import TutorTipsManager from "../components/TutorTipsManager"
import { waPayload } from "../lib/tutorWhatsApp"
import { gatewayConfigured, waGateway } from "../lib/waGateway"
import { confirmDialog } from "../lib/dialog"
import SEO from "../components/SEO"
import { MessageCircle } from "lucide-react"
import { friendlyError } from "../lib/friendlyError"
import "../styles/wa-ui.css"

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
      setError(friendlyError(instructorError, "Something went wrong. Please try again."))
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
      if (courseError) setError(friendlyError(courseError, "Something went wrong. Please try again."))
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
      setError(/failed to fetch|network/i.test(String(gatewayError?.message)) ? "We could not reach the WhatsApp gateway. Check it is running, then try again." : gatewayError.message)
    }
  }, [instructor?.id])

  useEffect(() => {
    if (!instructor?.id || !form.whatsapp_number.trim() || !gatewayConfigured) return undefined
    const poll = () => {
      if (!document.hidden) void refreshGateway(instructor.id)
    }
    poll()
    const interval = window.setInterval(poll, 30000)
    document.addEventListener("visibilitychange", poll)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", poll)
    }
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
      setError(friendlyError(lookupError, "Something went wrong. Please try again."))
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

    if (result.error) setError(friendlyError(result.error, "We could not create your tutor profile."))
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
    if (saveError) setError(friendlyError(saveError, "Something went wrong. Please try again."))
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
      setError(connectError?.code ? friendlyError(connectError, "We could not save your number.") : /failed to fetch|network/i.test(String(connectError?.message)) ? "We could not reach the WhatsApp gateway. Check it is running, then try again." : connectError.message)
    } finally {
      setGatewayBusy(false)
    }
  }

  async function disconnectWhatsApp() {
    if (!instructor || !(await confirmDialog({ title: "Unlink WhatsApp?", message: "Tips and invites stop sending until you link a device again.", confirmLabel: "Unlink", danger: true }))) return
    setGatewayBusy(true)
    try {
      await waGateway.remove(instructor.id)
      setGatewayInstance(null)
      setQrImage("")
    } catch (disconnectError) {
      setError(/failed to fetch|network/i.test(String(disconnectError?.message)) ? "We could not reach the WhatsApp gateway. Check it is running, then try again." : disconnectError.message)
    } finally {
      setGatewayBusy(false)
    }
  }

  const hero = (
    <header className="wa-hero">
      <span className="wa-hero-icon"><MessageCircle size={26} aria-hidden="true" /></span>
      <div>
        <h1>Your WhatsApp settings</h1>
        <p>These links appear on courses assigned to your tutor profile. Your number is not used for other tutors or the website help chat.</p>
      </div>
    </header>
  )
  const status = gatewayInstance?.status || "not connected"

  if (authLoading || loading) return <main className="wa-page"><div className="wa-shell wide">{hero}<p className="wa-muted">Loading tutor settings…</p></div></main>
  if (!user) {
    return (
      <main className="wa-page"><div className="wa-shell wide">{hero}
        <section className="wa-card"><p className="wa-muted">Sign in with your tutor account to manage your WhatsApp links.</p>
          <div className="wa-actions"><Link to="/login" className="btn btn-primary">Sign in</Link></div></section>
      </div></main>
    )
  }

  return (
    <main className="wa-page">
      <SEO title="Tutor WhatsApp Settings" description="Manage the WhatsApp contact and tips shown on your courses." path="/tutor/whatsapp" noindex />
      <div className="wa-shell wide">
        {hero}
        {error ? <p role="alert" className="wa-alert error">{error}</p> : null}

        {!instructor ? (
          <section className="wa-card">
            <div>
              <h2>No tutor profile is linked yet</h2>
              <p className="wa-muted" style={{ marginTop: ".35rem" }}>Ask an administrator to link your account to your instructor profile, or create a new tutor profile now.</p>
            </div>
            <div className="wa-actions">
              <button type="button" className="btn btn-primary" onClick={() => void createTutorProfile()} disabled={saving}>{saving ? "Creating…" : "Create my tutor profile"}</button>
            </div>
          </section>
        ) : (
          <>
            <section className="wa-card">
              <div className="wa-card-head">
                <h2>{instructor.name}</h2>
                <span className="wa-hint">Tutor profile</span>
              </div>
              <WhatsAppFields value={form} onChange={(nextValue) => setForm((current) => ({ ...current, ...nextValue }))} />
              <div className="wa-actions">
                <button type="button" className="btn btn-primary" onClick={() => void saveSettings()} disabled={saving}>{saving ? "Saving…" : "Save my settings"}</button>
                {message ? <span role="status" className="wa-alert ok">{message}</span> : null}
              </div>
            </section>

            <section className="wa-card">
              <div className="wa-card-head">
                <h2>Connect your WhatsApp</h2>
                {gatewayConfigured ? <span className={`wa-status ${status.replace(/\s+/g, "_")}`}>{status.replace(/_/g, " ")}{gatewayInstance?.phone ? ` · ${gatewayInstance.phone}` : ""}</span> : null}
              </div>
              <p className="wa-muted">
                Link your tutor number as a WhatsApp linked device to send tips and invites. Unofficial WhatsApp Web automation can put your account at risk, so only message learners who opted in.
              </p>
              {!gatewayConfigured ? (
                <p role="status" className="wa-alert warn">The WhatsApp gateway is not set up for this site yet. Ask an administrator.</p>
              ) : (
                <>
                  {qrImage ? (
                    <div style={{ display: "grid", gap: ".5rem", justifyItems: "start" }}>
                      <img src={qrImage} alt="WhatsApp linked-device QR code" width="240" height="240" className="wa-qr" />
                      <span className="wa-hint">On your phone: WhatsApp › Settings › Linked devices › Link a device, then scan this code.</span>
                    </div>
                  ) : null}
                  {gatewayInstance?.status === "wrong_account" ? <p role="alert" className="wa-alert error">The linked account does not match your saved WhatsApp number.</p> : null}
                  <div className="wa-actions">
                    {!gatewayInstance?.status || ["disconnected", "error", "wrong_account"].includes(gatewayInstance.status) ? <button type="button" className="btn btn-primary" onClick={() => void connectWhatsApp()} disabled={gatewayBusy}>{gatewayBusy ? "Starting…" : gatewayInstance?.status === "wrong_account" ? "Try linking again" : "Link my WhatsApp"}</button> : null}
                    {gatewayInstance?.status === "connected" ? <button type="button" className="btn btn-outline" onClick={() => void disconnectWhatsApp()} disabled={gatewayBusy}>Unlink device</button> : null}
                  </div>
                </>
              )}
            </section>

            <section style={{ display: "grid", gap: "1rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 600 }}>Tips for my courses</h2>
              {courses.map((course) => (
                <TutorTipsManager key={course.id} courseId={course.id} courseTitle={course.title} courseSlug={course.slug} instructorId={instructor.id} gatewayInstanceId={gatewayInstance?.status === "connected" ? instructor.id : ""} />
              ))}
              {courses.length === 0 ? <p className="wa-empty">No courses are assigned to your tutor profile yet.</p> : null}
            </section>
          </>
        )}
      </div>
    </main>
  )
}
