import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import { resolveWhatsApp, waShareLink } from "../lib/tutorWhatsApp"

export default function WhatsAppOptInCard({ course, instructor }) {
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

  return (
    <div className="whatsapp-optin-card compact" style={{ flexDirection: "column", alignItems: "stretch" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div className="whatsapp-optin-copy">
          <p className="whatsapp-optin-title">{config.title}</p>
          <p className="whatsapp-optin-text">{config.blurb}</p>
        </div>
        <a href={config.href} target="_blank" rel="noreferrer noopener" className="btn btn-primary whatsapp-optin-button" style={{ background: "#128C7E", boxShadow: "0 8px 18px rgba(37, 211, 102, 0.18)" }}>
          {config.cta}
        </a>
      </div>

      {posts.length > 0 ? (
        <div style={{ marginTop: "0.9rem", borderTop: "1px solid rgba(37, 211, 102, 0.22)", paddingTop: "0.8rem", display: "grid", gap: "0.6rem" }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: "0.85rem", color: "var(--text-700)" }}>Latest from your tutor</p>
          {posts.map((post) => (
            <div key={post.id} style={{ display: "flex", justifyContent: "space-between", gap: "0.8rem", alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: "0.9rem" }}>{post.title}</strong>
                <p style={{ margin: "0.15rem 0 0", fontSize: "0.85rem", color: "var(--text-500)", whiteSpace: "pre-line" }}>{post.body}</p>
              </div>
              <a href={waShareLink(`*${post.title}*\n\n${post.body}\n\n${typeof window !== "undefined" ? window.location.href : ""}`)} target="_blank" rel="noreferrer noopener" style={{ flexShrink: 0, fontSize: "0.8rem", fontWeight: 600, color: "#128C7E" }}>
                Share
              </a>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}