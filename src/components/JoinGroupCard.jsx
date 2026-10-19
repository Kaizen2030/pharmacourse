import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
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
      className="whatsapp-optin-card compact"
      style={{ flexDirection: "column", alignItems: "stretch", gap: ".6rem", ...(highlight ? { border: "2px solid #25D366" } : null) }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div className="whatsapp-optin-copy">
          <p className="whatsapp-optin-title">{highlight ? "You're in! Join your class WhatsApp group" : "Your class WhatsApp group"}</p>
          <p className="whatsapp-optin-text">{group.welcome_text || "Ask questions, get tutor tips and learn with your classmates."}</p>
        </div>
        <a href={group.invite_url} target="_blank" rel="noreferrer noopener" className="btn btn-primary whatsapp-optin-button" style={{ background: "#128C7E" }}>
          Join group
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
    <a href={url} target="_blank" rel="noreferrer noopener" style={{ display: "inline-block", marginTop: ".4rem", fontSize: ".8rem", fontWeight: 700, color: "#128C7E" }}>
      Class WhatsApp group →
    </a>
  )
}
