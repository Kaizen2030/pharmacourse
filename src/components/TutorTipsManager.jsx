import { useCallback, useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import { formatTipForWhatsApp } from "../lib/tutorWhatsApp"
import { SITE_URL } from "../lib/siteConfig"
import { waGateway } from "../lib/waGateway"
import { confirmDialog } from "../lib/dialog"
import TutorGroupPanel from "./TutorGroupPanel"
import { BookOpen, CalendarClock, Check, ChevronDown, Copy, Eye, EyeOff, FileText, Lightbulb, Send, Trash2, Users, UsersRound } from "lucide-react"
import { friendlyError } from "../lib/friendlyError"
import { gatewayError } from "../lib/waGateway"
import "../styles/wa-ui.css"

// collapsible: render as a <details> card whose header (title + student count) stays visible when closed.
export default function TutorTipsManager({ courseId, courseTitle, courseSlug, instructorId = null, gatewayInstanceId = "", collapsible = false, defaultOpen = false }) {
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
  const [group, setGroup] = useState(null)

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("tutor_whatsapp_posts")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false })
    if (loadError) setError(friendlyError(loadError, "We could not load tips for this course."))
    else setPosts(data || [])

    const { count, error: countError } = await supabase
      .from("course_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("course_id", courseId)
    if (countError) setStudentCount(0)
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
      setError("Scheduling and publishing are not switched on for this site yet. Save it as a draft, or ask an administrator.")
      setBusy(false)
      return
    }

    if (insertError) {
      setError(friendlyError(insertError, "We could not save this tip. Please try again."))
      setBusy(false)
      return
    }

    try {
      if (tipStatus === "sent" && gatewayInstanceId) {
        const text = formatTipForWhatsApp(inserted, courseTitle, `${SITE_URL}/courses/${courseSlug || courseId}`)
        if (group?.group_jid) {
          await waGateway.postToGroup(gatewayInstanceId, courseId, text, inserted.id)
          setSendMessage("Saved, published, and posted to your class WhatsApp group.")
        } else {
          const result = await waGateway.broadcast(gatewayInstanceId, courseId, text, inserted.id)
          setSendMessage(`Saved, published, and sent to ${result.recipients} opted-in learners.${result.skipped ? ` ${result.skipped} more were not included (200 per broadcast limit).` : ""}`)
        }
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
      setSendMessage(`Saved and published, but sending on WhatsApp failed: ${gatewayError(sendError)}`)
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
    if (updateError) setError(friendlyError(updateError, "We could not update this tip."))
    else await load()
  }

  async function remove(post) {
    if (!(await confirmDialog({ title: "Delete this tip?", message: "This cannot be undone.", confirmLabel: "Delete", danger: true }))) return
    const { error: deleteError } = await supabase.from("tutor_whatsapp_posts").delete().eq("id", post.id)
    if (deleteError) setError(friendlyError(deleteError, "We could not delete this tip."))
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

  async function postToClassGroup(post) {
    if (!(await confirmDialog({ title: "Post to class group?", message: `"${post.title}" will be posted into the class WhatsApp group.`, confirmLabel: "Post" }))) return
    setSendingId(post.id)
    setSendMessage("")
    try {
      const text = formatTipForWhatsApp(post, courseTitle, `${SITE_URL}/courses/${courseSlug || courseId}`)
      await waGateway.postToGroup(gatewayInstanceId, courseId, text, post.id)
      await supabase.from("tutor_whatsapp_posts").update({ tip_status: "sent", is_published: true, sent_at: new Date().toISOString() }).eq("id", post.id)
      setSendMessage("Posted to the class group.")
      await load()
    } catch (sendError) {
      setError(gatewayError(sendError))
    } finally {
      setSendingId("")
    }
  }

  async function sendToOptedIn(post) {
    if (!(await confirmDialog({ title: "Send privately?", message: `Send "${post.title}" as a private message to opted-in learners enrolled in ${courseTitle}?`, confirmLabel: "Send" }))) return
    setSendingId(post.id)
    setSendMessage("")
    try {
      const text = formatTipForWhatsApp(post, courseTitle, `${SITE_URL}/courses/${courseSlug || courseId}`)
      const result = await waGateway.broadcast(gatewayInstanceId, courseId, text, post.id)
      setSendMessage(`Sending started for ${result.recipients} opted-in learners.${result.skipped ? ` ${result.skipped} more were not included (200 per broadcast limit).` : ""}`)
      await supabase.from("tutor_whatsapp_posts").update({ tip_status: "sent", is_published: true, sent_at: new Date().toISOString() }).eq("id", post.id)
      await load()
    } catch (sendError) {
      setError(gatewayError(sendError))
    } finally {
      setSendingId("")
    }
  }

  if (!courseId) return <p className="wa-muted">Save the course first to add WhatsApp tips.</p>

  const Root = collapsible ? "details" : "div"
  const Head = collapsible ? "summary" : "div"
  const canPostToGroup = Boolean(gatewayInstanceId && group?.group_jid)
  const submitLabel = tipStatus === "sent" ? "Publish tip" : tipStatus === "scheduled" ? "Schedule tip" : "Save draft"
  const statusOf = (post) => post.tip_status || (post.is_published ? "sent" : "draft")
  const statusLabel = { draft: "Draft", scheduled: "Scheduled", sent: "Published" }
  const when = (value) => (value ? new Date(value).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : "")

  return (
    <Root className={`wa-course${collapsible ? " wa-collapsible" : ""}`} {...(collapsible ? { open: defaultOpen || undefined } : {})}>
      <Head className="wa-course-head">
        <span className="wa-course-icon" aria-hidden="true"><BookOpen size={18} /></span>
        <span className="wa-course-title">
          <strong>{courseTitle || "Untitled course"}</strong>
          <span>Messages reach students enrolled in this course only</span>
        </span>
        <span className="wa-pill"><Users size={13} aria-hidden="true" /> {studentCount} student{studentCount === 1 ? "" : "s"}</span>
        <span className="wa-pill subtle">{posts.length} tip{posts.length === 1 ? "" : "s"}</span>
        {collapsible ? <ChevronDown size={18} className="wa-tips-chevron" aria-hidden="true" /> : null}
      </Head>

      <div className="wa-course-body">
        <TutorGroupPanel courseId={courseId} gatewayInstanceId={gatewayInstanceId} onChange={setGroup} />

        <section className="wa-block">
          <div className="wa-block-head">
            <span className="wa-block-icon tips" aria-hidden="true"><Lightbulb size={18} /></span>
            <div>
              <h4>WhatsApp tips</h4>
              <p className="wa-muted">Published tips show on the course page. You can also copy them, post them to the class group or send them privately.</p>
            </div>
          </div>

          <form onSubmit={add} className="wa-composer">
            <div className="wa-field">
              <label htmlFor={`tip-title-${courseId}`}>Tip title</label>
              <input id={`tip-title-${courseId}`} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Counselling on amoxicillin doses" maxLength={120} />
            </div>
            <div className="wa-field">
              <label htmlFor={`tip-body-${courseId}`}>Message</label>
              <textarea id={`tip-body-${courseId}`} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a short, practical tip for your students." rows={4} maxLength={1500} />
              <small className="wa-counter">{body.length} / 1500</small>
            </div>
            <div className="wa-field">
              <span className="wa-label">When</span>
              <div className="wa-segment" role="radiogroup" aria-label="When to publish">
                {[{ value: "draft", label: "Save as draft", icon: FileText }, { value: "scheduled", label: "Schedule", icon: CalendarClock }, { value: "sent", label: "Publish now", icon: Send }].map((item) => (
                  <button key={item.value} type="button" role="radio" aria-checked={tipStatus === item.value} className={`wa-seg${tipStatus === item.value ? " active" : ""}`} onClick={() => setTipStatus(item.value)}>
                    <item.icon size={15} aria-hidden="true" /> {item.label}
                  </button>
                ))}
              </div>
            </div>
            {tipStatus === "scheduled" ? (
              <div className="wa-field wa-narrow">
                <label htmlFor={`tip-when-${courseId}`}>Send at</label>
                <input id={`tip-when-${courseId}`} type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} />
              </div>
            ) : null}
            {tipStatus === "sent" && gatewayInstanceId ? (
              <p className="wa-hint">{canPostToGroup ? "It will also be posted into your class WhatsApp group." : "It will also be sent privately to opted-in students."}</p>
            ) : null}
            <div className="wa-actions">
              <button type="submit" className="btn btn-primary" disabled={busy || !title.trim() || !body.trim()}>{busy ? "Saving…" : submitLabel}</button>
            </div>
          </form>

          {error ? <p role="alert" className="wa-alert error">{error}</p> : null}
          {sendMessage ? <p role="status" className="wa-alert ok">{sendMessage}</p> : null}

          {posts.length === 0 ? (
            <p className="wa-empty">No tips yet. Your first tip will appear here.</p>
          ) : (
            <ul className="wa-tip-list">
              {posts.map((post) => {
                const status = statusOf(post)
                return (
                  <li key={post.id} className={`wa-tip${post.is_published ? "" : " muted"}`}>
                    <div className="wa-tip-top">
                      <strong>{post.title}</strong>
                      <span className={`wa-status ${status === "sent" ? "connected" : status === "scheduled" ? "pending" : ""}`}>{statusLabel[status] || status}</span>
                    </div>
                    <p className="wa-tip-body">{post.body}</p>
                    <p className="wa-tip-meta">
                      {status === "scheduled" && post.scheduled_for ? `Scheduled for ${when(post.scheduled_for)}` : post.sent_at ? `Published ${when(post.sent_at)}` : `Created ${when(post.created_at)}`}
                    </p>
                    <div className="wa-tip-actions">
                      <button type="button" className="wa-mini" onClick={() => void copy(post)}>
                        {copiedId === post.id ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />} {copiedId === post.id ? "Copied" : "Copy"}
                      </button>
                      {canPostToGroup ? (
                        <button type="button" className="wa-mini green" onClick={() => void postToClassGroup(post)} disabled={Boolean(sendingId)}>
                          <UsersRound size={14} aria-hidden="true" /> {sendingId === post.id ? "Posting…" : "Post to group"}
                        </button>
                      ) : null}
                      {gatewayInstanceId && post.is_published ? (
                        <button type="button" className="wa-mini" onClick={() => void sendToOptedIn(post)} disabled={Boolean(sendingId)}>
                          <Send size={14} aria-hidden="true" /> {sendingId === post.id ? "Starting…" : "Send privately"}
                        </button>
                      ) : null}
                      <button type="button" className="wa-mini" onClick={() => void togglePublished(post)}>
                        {post.is_published ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />} {post.is_published ? "Hide from course" : "Publish"}
                      </button>
                      <button type="button" className="wa-mini danger" onClick={() => void remove(post)} aria-label={`Delete ${post.title}`}>
                        <Trash2 size={14} aria-hidden="true" /> Delete
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </Root>
  )
}
