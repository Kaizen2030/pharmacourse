import { useCallback, useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import { formatTipForWhatsApp } from "../lib/tutorWhatsApp"
import { SITE_URL } from "../lib/siteConfig"
import { waGateway } from "../lib/waGateway"

export default function TutorTipsManager({ courseId, courseTitle, courseSlug, instructorId = null, gatewayInstanceId = "" }) {
  const [posts, setPosts] = useState([])
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [copiedId, setCopiedId] = useState("")
  const [sendingId, setSendingId] = useState("")
  const [sendMessage, setSendMessage] = useState("")

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("tutor_whatsapp_posts")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false })
    if (loadError) setError(loadError.message)
    else setPosts(data || [])
  }, [courseId])

  useEffect(() => { if (courseId) void load() }, [courseId, load])

  async function add(event) {
    event.preventDefault()
    if (!title.trim() || !body.trim()) return
    setBusy(true)
    setError("")
    const { error: insertError } = await supabase.from("tutor_whatsapp_posts").insert({
      course_id: courseId,
      instructor_id: instructorId,
      title: title.trim().slice(0, 120),
      body: body.trim().slice(0, 1500),
    })
    if (insertError) setError(insertError.message)
    else { setTitle(""); setBody(""); await load() }
    setBusy(false)
  }

  async function togglePublished(post) {
    const { error: updateError } = await supabase.from("tutor_whatsapp_posts").update({ is_published: !post.is_published }).eq("id", post.id)
    if (updateError) setError(updateError.message)
    else await load()
  }

  async function remove(post) {
    if (!window.confirm("Delete this tip?")) return
    const { error: deleteError } = await supabase.from("tutor_whatsapp_posts").delete().eq("id", post.id)
    if (deleteError) setError(deleteError.message)
    else await load()
  }

  async function copy(post) {
    const url = `${SITE_URL}/courses/${courseSlug || courseId}`
    try {
      await navigator.clipboard.writeText(formatTipForWhatsApp(post, courseTitle, url))
      setCopiedId(post.id)
      window.setTimeout(() => setCopiedId(""), 2000)
    } catch {
      setError("Could not copy. Select the text manually.")
    }
  }

  async function sendToOptedIn(post) {
    if (!window.confirm(`Send "${post.title}" to opted-in learners enrolled in ${courseTitle}?`)) return
    setSendingId(post.id)
    setSendMessage("")
    try {
      const text = formatTipForWhatsApp(post, courseTitle, `${SITE_URL}/courses/${courseSlug || courseId}`)
      const result = await waGateway.broadcast(gatewayInstanceId, courseId, text)
      setSendMessage(`Sending started for ${result.recipients} opted-in learners.${result.skipped ? ` ${result.skipped} more were not included (200 per broadcast limit).` : ""}`)
    } catch (sendError) {
      setSendMessage(sendError.message)
    } finally {
      setSendingId("")
    }
  }

  if (!courseId) return <p style={{ color: "var(--text-500)" }}>Save the course first to add WhatsApp tips.</p>

  return (
    <div className="card" style={{ padding: "1.25rem", display: "grid", gap: "1rem" }}>
      <div>
        <h3 style={{ margin: 0, fontSize: "1rem" }}>WhatsApp tips</h3>
        <p style={{ margin: "0.3rem 0 0", color: "var(--text-500)", fontSize: "0.85rem" }}>
          Published tips appear on the course page. Copy a tip to share it manually in your channel or group.
        </p>
      </div>
      {error ? <div role="alert" style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</div> : null}
      <form onSubmit={add} style={{ display: "grid", gap: "0.6rem" }}>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Tip title" maxLength={120} />
        <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write the tip (max 1500 characters)" rows={4} maxLength={1500} />
        <button type="submit" className="btn btn-primary" disabled={busy || !title.trim() || !body.trim()} style={{ justifySelf: "start" }}>{busy ? "Saving…" : "Add tip"}</button>
      </form>
      {posts.map((post) => (
        <div key={post.id} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.8rem", display: "grid", gap: "0.4rem", opacity: post.is_published ? 1 : 0.6 }}>
          <strong>{post.title}</strong>
          <span style={{ whiteSpace: "pre-line", fontSize: "0.9rem", color: "var(--text-700)" }}>{post.body}</span>
          <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", fontSize: "0.82rem" }}>
            <button type="button" className="btn btn-outline" onClick={() => void copy(post)}>{copiedId === post.id ? "Copied" : "Copy for WhatsApp"}</button>
            {gatewayInstanceId && post.is_published ? <button type="button" className="btn btn-outline" onClick={() => void sendToOptedIn(post)} disabled={Boolean(sendingId)}>{sendingId === post.id ? "Starting…" : "Send to opted-in learners"}</button> : null}
            <button type="button" className="btn btn-outline" onClick={() => void togglePublished(post)}>{post.is_published ? "Hide from course page" : "Publish"}</button>
            <button type="button" className="btn btn-outline" onClick={() => void remove(post)}>Delete</button>
          </div>
          {sendMessage ? <p role="status" style={{ margin: 0, color: "var(--text-500)", fontSize: ".82rem" }}>{sendMessage}</p> : null}
        </div>
      ))}
    </div>
  )
}