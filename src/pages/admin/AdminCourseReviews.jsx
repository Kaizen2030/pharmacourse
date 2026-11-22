import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, ExternalLink, MessageSquareWarning } from "lucide-react"
import { supabase } from "../../lib/supabaseClient"
import { friendlyError } from "../../lib/friendlyError"
import { confirmDialog } from "../../lib/dialog"
import "./admin-learning.css"

const kes = (v) => `KES ${Number(v || 0).toLocaleString("en-KE")}`

// Courses tutors submitted from the Tutor studio. Approve publishes; request changes sends a note back.
export default function AdminCourseReviews() {
  const [rows, setRows] = useState(null)
  const [notes, setNotes] = useState({})
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [setupNeeded, setSetupNeeded] = useState(false)

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from("courses")
      .select("id, title, slug, short_desc, review_status, review_note, submitted_at, price, is_free, instructors(name), course_modules(count)")
      .in("review_status", ["in_review", "changes_requested"]).order("submitted_at", { ascending: true })
    if (e) { if (/review_status|does not exist/i.test(e.message || "")) setSetupNeeded(true); else setError(friendlyError(e, "We could not load submissions.")); setRows([]); return }
    setRows(data || [])
  }, [])
  useEffect(() => { void load() }, [load])

  async function act(row, action) {
    setError(""); setNotice("")
    const note = (notes[row.id] || "").trim()
    if (action === "request_changes" && !note) { setError("Write a short note so the tutor knows what to change."); return }
    if (action === "approve" && !(await confirmDialog({ title: "Approve and publish?", message: `"${row.title}" will be live for learners${row.is_free || !Number(row.price) ? " (free)" : ` at ${kes(row.price)}`}.`, confirmLabel: "Publish" }))) return
    const { error: e } = await supabase.rpc("admin_review_course", { p_course: row.id, p_action: action, p_note: note || null })
    if (e) { setError(friendlyError(e, "That could not be saved.")); return }
    setNotice(action === "approve" ? `"${row.title}" is live.` : `Changes requested for "${row.title}".`)
    setNotes((n) => ({ ...n, [row.id]: "" }))
    void load()
  }

  return (
    <div className="al-page">
      <header className="al-head">
        <div><h2>Course reviews</h2><p>Courses tutors submitted from the Tutor studio. Check the course, then publish it or send it back with a note.</p></div>
      </header>
      {setupNeeded ? <div className="al-setup"><strong>One database step is needed.</strong> Run <code>supabase/security/2026-12-02_phase12_tutor_studio.sql</code>, then refresh.</div> : null}
      {error ? <p role="alert" className="al-alert">{error}</p> : null}
      {notice ? <p role="status" className="al-alert ok">{notice}</p> : null}
      {rows === null ? <p className="al-empty-cell">Loading…</p> : rows.length === 0 ? (
        <div className="al-card al-block"><p className="al-empty-cell">No courses waiting for review.</p></div>
      ) : rows.map((r) => (
        <article key={r.id} className="al-card al-block">
          <div className="al-block-head">
            <div>
              <h3>{r.title}</h3>
              <p className="al-muted">By {r.instructors?.name || "a tutor"} · {r.course_modules?.[0]?.count ?? 0} lessons · {r.is_free || !Number(r.price) ? "Free" : kes(r.price)}{r.submitted_at ? ` · submitted ${new Date(r.submitted_at).toLocaleDateString("en-KE")}` : ""}</p>
              {r.short_desc ? <p style={{ margin: "0.4rem 0 0" }}>{r.short_desc}</p> : null}
            </div>
            <span className={`al-badge ${r.review_status === "in_review" ? "awaiting" : "expired"}`}>{r.review_status === "in_review" ? "Waiting for you" : "Sent back to tutor"}</span>
          </div>
          {r.review_status === "changes_requested" && r.review_note ? <p className="al-muted">Your note: {r.review_note}</p> : null}
          <label className="al-field"><span>Note to the tutor (needed to request changes)</span>
            <textarea rows={2} value={notes[r.id] || ""} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} placeholder="e.g. Add a quiz to lesson 2 and a cover image." />
          </label>
          <div className="al-head-actions">
            {r.slug ? <a className="al-btn" href={`/courses/${r.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={15} aria-hidden="true" /> Preview course page</a> : null}
            <button type="button" className="al-btn" onClick={() => void act(r, "request_changes")}><MessageSquareWarning size={15} aria-hidden="true" /> Request changes</button>
            <button type="button" className="al-btn primary" onClick={() => void act(r, "approve")}><CheckCircle2 size={15} aria-hidden="true" /> Approve and publish</button>
          </div>
        </article>
      ))}
    </div>
  )
}
