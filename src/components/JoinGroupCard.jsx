import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { MessageCircle, UsersRound } from "lucide-react"
import { fetchMyCourseGroup } from "../lib/courseGroup"

const STATUS_COPY = {
  queued: "We're also sending this invite to your WhatsApp now.",
  sent: "We also sent this invite to your WhatsApp.",
  skipped: null,
  failed: null,
}

// Shown to ENROLLED learners only. The link comes from a protected RPC.
export default function JoinGroupCard({ courseId, highlight = false, children }) {
  const [group, setGroup] = useState(undefined)

  useEffect(() => {
    let active = true
    fetchMyCourseGroup(courseId)
      .then((value) => { if (active) setGroup(value) })
      .catch(() => { if (active) setGroup(null) })
    return () => { active = false }
  }, [courseId])

  if (!group?.invite_url) return null
  const note = STATUS_COPY[group.invite_status]

  return (
    <div
      className={`whatsapp-optin-card compact wa-student${highlight ? " highlight" : ""}`}
    >
      <div className="wa-student-row">
        <span className="wa-student-icon" aria-hidden="true"><UsersRound size={22} /></span>
        <div className="whatsapp-optin-copy">
          <p className="whatsapp-optin-title">{highlight ? "You're in! Join your class WhatsApp group" : "Your class WhatsApp group"}</p>
          <p className="whatsapp-optin-text">{group.welcome_text || "Ask questions, get tutor tips and learn with your classmates."}</p>
        </div>
        <a href={group.invite_url} target="_blank" rel="noreferrer noopener" className="wa-student-btn">
          <MessageCircle size={16} aria-hidden="true" /> Join group
        </a>
      </div>
      {note ? <p style={{ margin: 0, fontSize: ".8rem", color: "var(--text-500)" }}>{note}</p> : null}
      {group.invite_status === "skipped" ? (
        <p style={{ margin: 0, fontSize: ".8rem", color: "var(--text-500)" }}>
          Want invites and tips sent to you directly? <Link to="/whatsapp-settings">Add your WhatsApp number</Link>.
        </p>
      ) : null}
      {children}
    </div>
  )
}

// Small inline link for course lists (Dashboard).
export function GroupLink({ courseId }) {
  const [url, setUrl] = useState("")
  useEffect(() => {
    let active = true
    fetchMyCourseGroup(courseId).then((value) => { if (active) setUrl(value?.invite_url || "") }).catch(() => {})
    return () => { active = false }
  }, [courseId])
  if (!url) return null
  return (
    <a href={url} target="_blank" rel="noreferrer noopener" className="wa-group-link">
      <MessageCircle size={14} aria-hidden="true" /> Class WhatsApp group
    </a>
  )
}
