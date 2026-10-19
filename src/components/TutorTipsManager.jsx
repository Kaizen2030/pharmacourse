import { useCallback, useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import { formatTipForWhatsApp } from "../lib/tutorWhatsApp"
import { SITE_URL } from "../lib/siteConfig"
import { waGateway } from "../lib/waGateway"

export default function TutorTipsManager({ courseId, courseTitle, courseSlug, instructorId = null, gatewayInstanceId = "" }) {
  const [posts, setPosts] = useState([])
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [tipStatus, setTipStatus] = useState("draft")
  const [scheduledFor, setScheduledFor] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [copiedId, setCopiedId] = useState("")
  const [sendingId, setSendingId] = useState("")
  const [sendMessage, setSendMessage] = useState("")
  const [studentCount, setStudentCount] = useState(0)

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("tutor_whatsapp_posts")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false })
    if (loadError) setError(loadError.message)
    else setPosts(data || [])

    const { count, error: countError } = await supabase
      .from("course_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("course_id", courseId)
    if (countError) setError((current) => current || countError.message)
    else setStudentCount(count || 0)
  }, [courseId])

  useEffect(() => { if (courseId) void load() }, [courseId, load])

  async function add(event) {
    event.preventDefault()
    if (!title.trim() || !body.trim()) return
    if (tipStatus === "scheduled" && !scheduledFor) {
      setError("Choose a date and time for the scheduled tip.")
      return
    }
    setBusy(true)
    setError("")
    setSendMessage("")

    const payload = {
      course_id: courseId,
      instructor_id: instructorId,
      title: title.trim().slice(0, 120),
      body: body.trim().slice(0, 1500),
      is_published: tipStatus === "sent",
      tip_status: tipStatus,
      scheduled_for: tipStatus === "scheduled" ? new Date(scheduledFor).toISOString() : null,
      sent_at: tipStatus === "sent" ? new Date().toISOString() : null,
    }

    let { data: inserted, error: insertError } = await supabase
      .from("tutor_whatsapp_posts")
      .insert(payload)
      .select()
      .single()

    const workflowColumnsMissing = insertError && /tip_status|scheduled_for|sent_at/i.test(insertError.message || "")
    if (workflowColumnsMissing && tipStatus === "draft") {
      const legacyResult = await supabase
        .from("tutor_whatsapp_posts")
        .insert({
          course_id: payload.course_id,
          instructor_id: payload.instructor_id,
          title: payload.title,
          body: payload.body,
          is_published: false,
        })
        .select()
        .single()
      inserted = legacyResult.data
      insertError = legacyResult.error
    }
    if (workflowColumnsMissing && tipStatus !== "draft") {
      setError("Run supabase/tutor_tips_v2_setup.sql before scheduling or publishing workflow tips.")
      setBusy(false)
      return
    }

    if (insertError) {
      setError(insertError.message)
      setBusy(false)
      return
    }

    try {
      if (tipStatus === "sent" && gatewayInstanceId) {
        const text = formatTipForWhatsApp(inserted, courseTitle, `${SITE_URL}/courses/${courseSlug || courseId}`)
        const result = await waGateway.broadcast(gatewayInstanceId, courseId, text, inserted.id)
        setSendMessage(`Saved, published, and sent to ${result.recipients} opted-in learners.${result.skipped ? ` ${result.skipped} more were not included (200 per broadcast limit).` : ""}`)
      } else if (tipStatus === "scheduled") {
        setSendMessage("Tip saved and scheduled. It will stay hidden from the course page until it is published.")
      } else if (tipStatus === "draft") {
        setSendMessage("Draft saved. It is hidden from the course page until you publish it.")
      } else {
        setSendMessage("Published to this course page. Connect WhatsApp when you are ready to send it to opted-in learners.")
      }
      setTitle("")
      setBody("")
      setTipStatus("draft")
      setScheduledFor("")
      await load()
    } catch (sendError) {
      setSendMessage(`Saved and published, but sending failed: ${sendError.message}`)
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function togglePublished(post) {
    const nextPublished = !post.is_published
    let { error: updateError } = await supabase
      .from("tutor_whatsapp_posts")
      .update({
        is_published: nextPublished,
        tip_status: nextPublished ? "sent" : "draft",
        sent_at: nextPublished ? new Date().toISOString() : null,
      })
      .eq("id", post.id)
    if (updateError && /tip_status|sent_at/i.test(updateError.message || "")) {
      const legacyUpdate = await supabase.from("tutor_whatsapp_posts").update({ is_published: nextPublished }).eq("id", post.id)
      updateError = legacyUpdate.error
    }
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
      const result = await waGateway.broadcast(gatewayInstanceId, courseId, text, post.id)
      setSendMessage(`Sending started for ${result.recipients} opted-in learners.${result.skipped ? ` ${result.skipped} more were not included (200 per broadcast limit).` : ""}`)
      await supabase.from("tutor_whatsapp_posts").update({ tip_status: "sent", is_published: true, sent_at: new Date().toISOString() }).eq("id", post.id)
      await load()
    } catch (sendError) {
      setSendMessage(sendError.message)
    } finally {
      setSendingId("")
    }
  }

  if (!courseId) return <p style={{ color: "var(--text-500)" }}>Save the course first to add WhatsApp tips.</p>

  return (
    <div className="card" style={{ padding: "1.25rem", display: "grid", gap: "1rem" }}>
      <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.7rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1rem" }}>{courseTitle || "Untitled course"}</h3>
          <p style={{ margin: "0.35rem 0 0", color: "var(--text-500)", fontSize: "0.85rem" }}>
            Audience: students enrolled in this course only.
          </p>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", padding: "0.35rem 0.65rem", borderRadius: 999, background: "rgba(15, 110, 86, 0.08)", color: "var(--green)", fontSize: "0.8rem", fontWeight: 700 }}>
          {studentCount} students
        </span>
      </div>
      <div>
        <h3 style={{ margin: 0, fontSize: "1rem" }}>WhatsApp tips</h3>
        <p style={{ margin: "0.3rem 0 0", color: "var(--text-500)", fontSize: "0.85rem" }}>
          Published tips appear on this course page. Copy a tip to share it manually in your channel or group.
        </p>
      </div>
      {error ? <div role="alert" style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</div> : null}
      <form onSubmit={add} style={{ display: "grid", gap: "0.6rem" }}>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Tip title" maxLength={120} />
        <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write the tip (max 1500 characters)" rows={4} maxLength={1500} />
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "0.6rem" }}>
          <label style={{ display: "grid", gap: ".3rem", fontSize: ".8rem", color: "var(--text-500)" }}>
            Workflow
            <select value={tipStatus} onChange={(event) => setTipStatus(event.target.value)}>
              <option value="draft">Save as draft</option>
              <option value="scheduled">Schedule for later</option>
              <option value="sent">Publish now</option>
            </select>
          </label>
          {tipStatus === "scheduled" ? (
            <label style={{ display: "grid", gap: ".3rem", fontSize: ".8rem", color: "var(--text-500)" }}>
              Send at
              <input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} />
            </label>
          ) : <span />}
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy || !title.trim() || !body.trim()} style={{ justifySelf: "start" }}>{busy ? "Saving…" : "Add tip"}</button>
      </form>
      {posts.map((post) => (
        <div key={post.id} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.8rem", display: "grid", gap: "0.4rem", opacity: post.is_published ? 1 : 0.6 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".6rem", flexWrap: "wrap" }}>
            <strong>{post.title}</strong>
            <span style={{ display: "inline-flex", padding: ".2rem .5rem", borderRadius: 999, background: post.tip_status === "sent" || post.is_published ? "rgba(15, 110, 86, .1)" : "rgba(96, 112, 104, .1)", color: "var(--text-700)", fontSize: ".72rem", fontWeight: 700, textTransform: "capitalize" }}>
              {post.tip_status || (post.is_published ? "sent" : "draft")}
            </span>
          </div>
          <span style={{ whiteSpace: "pre-line", fontSize: "0.9rem", color: "var(--text-700)" }}>{post.body}</span>
          {post.scheduled_for ? <span style={{ color: "var(--text-500)", fontSize: ".8rem" }}>Scheduled for {new Date(post.scheduled_for).toLocaleString()}</span> : null}
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
