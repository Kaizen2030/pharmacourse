import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import { Lightbulb, Lock, MessageCircle, Share2 } from "lucide-react"
import { resolveWhatsApp, waShareLink } from "../lib/tutorWhatsApp"

export default function WhatsAppOptInCard({ course, instructor, enrolled = false }) {
  const [posts, setPosts] = useState([])
  const config = resolveWhatsApp(course, instructor, course?.title)

  useEffect(() => {
    if (!course?.id) return undefined
    let active = true
    supabase
      .from("tutor_whatsapp_posts")
      .select("id, title, body")
      .eq("course_id", course.id)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => { if (active) setPosts(data || []) })
    return () => { active = false }
  }, [course?.id])

  if (!config) return null
  // Class group links are for enrolled learners only (the JoinGroupCard handles the protected link).
  const hideLink = config.mode === "group" && !enrolled

  return (
    <div className="whatsapp-optin-card compact wa-student">
      <div className="wa-student-row">
        <span className="wa-student-icon" aria-hidden="true"><MessageCircle size={22} /></span>
        <div className="whatsapp-optin-copy">
          <p className="whatsapp-optin-title">{config.title}</p>
          <p className="whatsapp-optin-text">{config.blurb}</p>
        </div>
        {hideLink ? (
          <span className="wa-student-note"><Lock size={14} aria-hidden="true" /> Enrol to get the class group invite</span>
        ) : (
          <a href={config.href} target="_blank" rel="noreferrer noopener" className="wa-student-btn">
            <MessageCircle size={16} aria-hidden="true" /> {config.cta}
          </a>
        )}
      </div>

      {posts.length > 0 ? (
        <div className="wa-student-tips">
          <p className="wa-student-tips-title"><Lightbulb size={15} aria-hidden="true" /> Latest tips from your tutor</p>
          {posts.map((post) => (
            <div key={post.id} className="wa-student-tip">
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: "0.9rem" }}>{post.title}</strong>
                <p style={{ margin: "0.15rem 0 0", fontSize: "0.85rem", color: "var(--text-500)", whiteSpace: "pre-line" }}>{post.body}</p>
              </div>
              <a href={waShareLink(`*${post.title}*\n\n${post.body}\n\n${typeof window !== "undefined" ? window.location.href : ""}`)} target="_blank" rel="noreferrer noopener" className="wa-student-share" aria-label={`Share ${post.title} on WhatsApp`}>
                <Share2 size={14} aria-hidden="true" /> Share
              </a>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}