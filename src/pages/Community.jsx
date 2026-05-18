/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { useSearchParams } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { MessageCircle, ThumbsUp, Plus, ChevronDown, ChevronUp, Pin, Lock, BookOpen, X } from "lucide-react"
import Pagination from "../components/Pagination"

const POSTS_PAGE_SIZE = 10

const TAGS = ["Question", "Discussion", "Exam Prep", "Case Study", "General"]

const TAG_COLORS = {
  "Question":   { bg: "#eff6ff", color: "#1d4ed8" },
  "Discussion": { bg: "#f0fdf4", color: "#15803d" },
  "Exam Prep":  { bg: "#faf5ff", color: "#7e22ce" },
  "Case Study": { bg: "#fff7ed", color: "#c2410c" },
  "General":    { bg: "#f8fafc", color: "#475569" },
}

function getInitials(name) {
  const parts = `${name || ""}`.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  if (parts.length === 0) return "PC"
  return parts.map((part) => part[0].toUpperCase()).join("")
}

function getRankLabel(rank) {
  const remainderTen = rank % 10
  const remainderHundred = rank % 100

  if (remainderTen === 1 && remainderHundred !== 11) return `${rank}st`
  if (remainderTen === 2 && remainderHundred !== 12) return `${rank}nd`
  if (remainderTen === 3 && remainderHundred !== 13) return `${rank}rd`
  return `${rank}th`
}

function getRankBadge(rank) {
  if (rank === 1) return { label: "Gold", bg: "#fff7d6", color: "#b7791f" }
  if (rank === 2) return { label: "Silver", bg: "#f3f4f6", color: "#6b7280" }
  if (rank === 3) return { label: "Bronze", bg: "#fce7d6", color: "#c05621" }
  return null
}

export default function Community() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [enrolledCourses, setEnrolledCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [posts, setPosts] = useState([])
  const [page, setPage] = useState(1)
  const [totalPosts, setTotalPosts] = useState(0)
  const [loading, setLoading] = useState(true)
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedPost, setExpandedPost] = useState(null)
  const [replies, setReplies] = useState({})
  const [replyText, setReplyText] = useState({})
  const [replySaving, setReplySaving] = useState({})
  const [likedPosts, setLikedPosts] = useState({})
  const [filterTag, setFilterTag] = useState("All")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tag, setTag] = useState("General")
  const [saving, setSaving] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [leaderboardEntries, setLeaderboardEntries] = useState([])
  const [leaderboardPeriod, setLeaderboardPeriod] = useState("month")
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)

  const prefillCourseId = searchParams.get("course_id")
  const prefillModuleId = searchParams.get("module_id")
  const prefillModuleTitle = searchParams.get("module_title")

  useEffect(() => { loadEnrolledCourses() }, [user])
  useEffect(() => {
    if (!user) return
    loadLeaderboard(leaderboardPeriod)
  }, [user, leaderboardPeriod])

  useEffect(() => {
    if (!prefillCourseId || enrolledCourses.length === 0) return
    const course = enrolledCourses.find(c => c.course_id === prefillCourseId)
    if (course) {
      setSelectedCourse(course)
      setShowForm(true)
      if (prefillModuleTitle) {
        setTitle(`Question about: ${prefillModuleTitle}`)
        setTag("Question")
      }
      setSearchParams({})
    }
  }, [prefillCourseId, enrolledCourses])

  async function loadEnrolledCourses() {
    if (!user) { setCoursesLoading(false); return }
    setCoursesLoading(true)
    const { data } = await supabase
      .from("course_enrollments")
      .select("course_id, courses(id, title)")
      .eq("user_id", user.id)
      .eq("status", "enrolled")
    const courses = (data || []).map(e => ({ course_id: e.course_id, title: e.courses?.title || "Unknown Course" }))
    setEnrolledCourses(courses)
    if (courses.length > 0 && !selectedCourse && !prefillCourseId) {
      setSelectedCourse(courses[0])
    }
    setCoursesLoading(false)
  }

  async function loadLeaderboard(period = leaderboardPeriod) {
    setLeaderboardLoading(true)
    const { data, error } = await supabase.rpc("get_leaderboard", { time_scope: period })

    if (error) {
      console.error("Failed to load leaderboard:", error)
      setLeaderboardEntries([])
    } else {
      setLeaderboardEntries(data || [])
    }

    setLeaderboardLoading(false)
  }

  useEffect(() => {
    if (selectedCourse) loadPosts(page)
  }, [selectedCourse?.course_id, filterTag, page])

  useEffect(() => {
    setPage(1)
    setExpandedPost(null)
    setReplies({})
  }, [selectedCourse?.course_id, filterTag])

  async function loadPosts(targetPage = page) {
    setLoading(true)
    const from = (targetPage - 1) * POSTS_PAGE_SIZE
    const to = from + POSTS_PAGE_SIZE - 1

    let query = supabase
      .from("community_posts")
      .select("id,title,content,category,tags,user_id,upvotes,is_pinned,is_locked,reply_count,created_at,course_id,module_id", { count: "exact" })
      .eq("course_id", selectedCourse.course_id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to)
    if (filterTag !== "All") query = query.contains("tags", [filterTag])
    const { data, count, error } = await query
    if (error) {
      console.error("Error loading posts:", error)
      setPosts([])
      setTotalPosts(0)
    } else {
      setPosts(data || [])
      setTotalPosts(count || 0)
    }
    setLoading(false)
  }

  async function createPost() {
    if (!user) { alert("Sign in to post."); return }
    if (!title.trim() || !content.trim()) { alert("Add a title and content."); return }
    if (!selectedCourse) { alert("Select a course first."); return }
    setSaving(true)
    const { error } = await supabase.from("community_posts").insert([{
      title: title.trim(), content: content.trim(), category: tag, tags: [tag],
      user_id: user.id, course_id: selectedCourse.course_id,
      module_id: prefillModuleId || null,
      upvotes: 0, downvotes: 0, reply_count: 0, is_pinned: false, is_locked: false,
    }])
    setSaving(false)
    if (error) { alert("Error: " + error.message); return }
    setTitle(""); setContent(""); setTag("General"); setShowForm(false)
    setPage(1)
    loadPosts(1)
  }

  async function castVote(postId) {
    if (!user) { alert("Sign in to vote."); return }
    const post = posts.find(p => p.id === postId)
    if (!post) return
    const liked = !!likedPosts[postId]
    const newCount = liked ? Math.max((post.upvotes || 0) - 1, 0) : (post.upvotes || 0) + 1
    const { error } = await supabase.from("community_posts").update({ upvotes: newCount }).eq("id", postId)
    if (!error) {
      setPosts(ps => ps.map(p => p.id === postId ? { ...p, upvotes: newCount } : p))
      setLikedPosts(lp => ({ ...lp, [postId]: !liked }))
    } else {
      alert("Unable to update like right now. Please try again.")
    }
  }

  async function loadReplies(postId) {
    if (expandedPost === postId) { setExpandedPost(null); return }
    setExpandedPost(postId)
    if (replies[postId]) return
    const { data, error } = await supabase
      .from("community_comments")
      .select("id,content,user_id,upvotes,created_at")
      .eq("post_id", postId)
      .order("created_at")
    if (error) {
      setReplies(r => ({ ...r, [postId]: [] }))
    } else {
      setReplies(r => ({ ...r, [postId]: data || [] }))
      const actualCount = (data || []).length
      setPosts(ps => ps.map(p => p.id === postId ? { ...p, reply_count: actualCount } : p))
    }
  }

  async function submitReply(postId) {
    if (!user) { alert("Sign in to reply."); return }
    const text = replyText[postId]?.trim()
    if (!text) return
    setReplySaving(s => ({ ...s, [postId]: true }))
    const { data, error } = await supabase
      .from("community_comments")
      .insert({ post_id: postId, user_id: user.id, content: text, upvotes: 0 })
      .select("id,content,user_id,upvotes,created_at")
      .single()
    setReplySaving(s => ({ ...s, [postId]: false }))
    if (error) { alert("Error: " + error.message); return }
    setReplies(r => ({ ...r, [postId]: [...(r[postId] || []), data] }))
    setReplyText(t => ({ ...t, [postId]: "" }))
    setPosts(ps => ps.map(p => p.id === postId ? { ...p, reply_count: (p.reply_count || 0) + 1 } : p))
    setExpandedPost(postId)
  }

  const tagColor = (t) => TAG_COLORS[t] || TAG_COLORS["General"]
  const totalPages = Math.max(1, Math.ceil(totalPosts / POSTS_PAGE_SIZE))

  if (!user) return (
    <div className="page" style={{ padding: "4rem 1.5rem", textAlign: "center" }}>
      <MessageCircle size={48} style={{ color: "#0F6E56", marginBottom: "1rem" }} />
      <h2>Sign in to access the community</h2>
      <p style={{ color: "var(--text-500)" }}>The community is exclusive to enrolled students.</p>
    </div>
  )

  const SidebarContent = () => (
    <>
      <div style={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-500)", marginBottom: "0.75rem" }}>
        My Course Communities
      </div>
      {coursesLoading
        ? <p style={{ color: "var(--text-500)", fontSize: "0.9rem" }}>Loading...</p>
        : enrolledCourses.length === 0
          ? (
            <div style={{ background: "#f8faf9", borderRadius: 12, padding: "1.25rem", border: "1px solid #e0ece8" }}>
              <p style={{ color: "var(--text-500)", fontSize: "0.85rem", margin: "0 0 .75rem", lineHeight: 1.6 }}>
                You need to be enrolled in a course to access its community.
              </p>
              <a href="/courses" style={{
                display: "inline-block", background: "#0F6E56", color: "#fff",
                fontWeight: 700, fontSize: "0.82rem", padding: "7px 14px",
                borderRadius: 8, textDecoration: "none"
              }}>Browse Courses →</a>
            </div>
          )
          : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {enrolledCourses.map(c => (
                <button key={c.course_id}
                  onClick={() => {
                    setSelectedCourse(c)
                    setFilterTag("All")
                    setSidebarOpen(false) // close drawer on mobile after selecting
                  }}
                  style={{
                    padding: "0.65rem 0.85rem", borderRadius: "12px", border: selectedCourse?.course_id === c.course_id ? "1px solid #0F6E56" : "1px solid var(--border)",
                    background: selectedCourse?.course_id === c.course_id ? "#0F6E56" : "#fff",
                    color: selectedCourse?.course_id === c.course_id ? "#fff" : "#111",
                    textAlign: "left", cursor: "pointer", fontSize: "0.9rem", fontWeight: 500,
                    display: "flex", alignItems: "center", gap: "0.5rem"
                  }}>
                  <BookOpen size={14} />
                  <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</span>
                </button>
              ))}
            </div>
          )}
    </>
  )

  return (
    <div className="page" style={{ padding: 0 }}>

      {/* ── MOBILE SIDEBAR DRAWER OVERLAY ── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
            zIndex: 200, display: "none"
          }}
          className="community-overlay"
        />
      )}

      {/* ── MOBILE COURSE SELECTOR BAR ── */}
      <div className="community-mobile-bar" style={{ display: "none" }}>
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.75rem 1rem", background: "#fff",
            border: "1px solid rgba(15,110,86,0.18)", borderRadius: "14px",
            cursor: "pointer", fontSize: "0.95rem", fontWeight: 700,
            color: "#0F6E56", width: "100%", boxShadow: "0 10px 24px rgba(15,110,86,0.08)"
          }}>
          <BookOpen size={16} />
          <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selectedCourse ? selectedCourse.title : "Select a course"}
          </span>
          <ChevronDown size={16} />
        </button>
      </div>

      {/* ── MOBILE DRAWER ── */}
      <div
        className="community-drawer"
        style={{
          position: "fixed", top: 0, left: sidebarOpen ? 0 : "-280px",
          width: 270, height: "100vh", background: "#f7fcff",
          borderRight: "1px solid var(--border)", padding: "1.5rem 1rem",
          zIndex: 300, transition: "left 0.25s ease",
          overflowY: "auto", display: "none"
        }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Communities</span>
          <button onClick={() => setSidebarOpen(false)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem" }}>
            <X size={20} />
          </button>
        </div>
        <SidebarContent />
      </div>

      {/* ── DESKTOP LAYOUT ── */}
      <div className="community-layout" style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "calc(100vh - 64px)" }}>

        {/* DESKTOP SIDEBAR */}
        <aside className="community-sidebar" style={{ borderRight: "1px solid var(--border)", padding: "1.5rem 1rem", background: "var(--bg-secondary)" }}>
          <SidebarContent />
        </aside>

        {/* MAIN */}
        <main style={{ padding: "1.75rem 1rem", minWidth: 0, width: "100%", boxSizing: "border-box", overflow: "hidden" }}>
          <section style={{
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: "18px",
            boxShadow: "var(--shadow-sm)",
            padding: "1.25rem",
            marginBottom: "1.25rem"
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#0a2e1f" }}>Leaderboard</h3>
                <p style={{ margin: ".25rem 0 0", color: "var(--text-500)", fontSize: ".88rem" }}>
                  Top learners by completed courses, CPD hours, and certificates.
                </p>
              </div>

              <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                {[
                  { key: "month", label: "This Month" },
                  { key: "all", label: "All Time" },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setLeaderboardPeriod(option.key)}
                    className="btn"
                    style={{
                      minHeight: 40,
                      width: "auto",
                      padding: ".6rem 1rem",
                      background: leaderboardPeriod === option.key ? "linear-gradient(135deg, #0F6E56, #129474)" : "#fff",
                      color: leaderboardPeriod === option.key ? "#fff" : "#0F6E56",
                      border: leaderboardPeriod === option.key ? "1px solid transparent" : "1px solid rgba(15, 110, 86, 0.18)",
                      boxShadow: "none"
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {leaderboardLoading ? (
              <p style={{ color: "var(--text-500)", margin: 0 }}>Loading leaderboard...</p>
            ) : leaderboardEntries.length === 0 ? (
              <div style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "1rem",
                color: "var(--text-500)"
              }}>
                No leaderboard data yet for this period.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
                {leaderboardEntries.slice(0, 10).map((entry, index) => {
                  const rank = index + 1
                  const badge = getRankBadge(rank)

                  return (
                    <div
                      key={`${entry.user_id}-${rank}`}
                      className="leaderboard-entry"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "72px 56px minmax(0, 1fr) auto",
                        gap: ".85rem",
                        alignItems: "center",
                        padding: ".9rem 1rem",
                        background: "linear-gradient(180deg, #ffffff, #f8fbfa)",
                        border: "1px solid var(--border)",
                        borderRadius: "14px"
                      }}
                    >
                      <div>
                        <div style={{ fontSize: ".88rem", fontWeight: 800, color: "#0a2e1f" }}>{getRankLabel(rank)}</div>
                        {badge ? (
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            marginTop: ".25rem",
                            padding: ".18rem .5rem",
                            borderRadius: "999px",
                            background: badge.bg,
                            color: badge.color,
                            fontSize: ".7rem",
                            fontWeight: 800,
                            letterSpacing: ".04em",
                            textTransform: "uppercase"
                          }}>
                            {badge.label}
                          </span>
                        ) : null}
                      </div>

                      <div style={{
                        width: 52,
                        height: 52,
                        borderRadius: "999px",
                        display: "grid",
                        placeItems: "center",
                        background: "linear-gradient(135deg, rgba(15,110,86,0.16), rgba(26,107,181,0.18))",
                        color: "#0F6E56",
                        fontSize: ".92rem",
                        fontWeight: 800,
                        border: "1px solid rgba(15,110,86,0.14)"
                      }}>
                        {getInitials(entry.display_name)}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: ".96rem", fontWeight: 700, color: "#0a2e1f", marginBottom: ".2rem" }}>
                          {entry.display_name}
                        </div>
                        <p style={{ margin: 0, color: "var(--text-500)", fontSize: ".84rem", lineHeight: 1.55 }}>
                          {entry.completed_courses} completed course{entry.completed_courses === 1 ? "" : "s"} • {entry.certificates_issued} certificate{entry.certificates_issued === 1 ? "" : "s"}
                        </p>
                      </div>

                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: ".45rem .8rem",
                        borderRadius: "999px",
                        background: "rgba(15, 110, 86, 0.08)",
                        color: "#0F6E56",
                        fontSize: ".78rem",
                        fontWeight: 800,
                        whiteSpace: "nowrap"
                      }}>
                        {Number(entry.total_cpd_hours || 0)} CPD hrs
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {!selectedCourse ? (
            <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--text-500)" }}>
              <MessageCircle size={40} style={{ marginBottom: "1rem", opacity: 0.4 }} />
              {enrolledCourses.length === 0 && !coursesLoading ? (
                <>
                  <p style={{ fontWeight: 600, color: "#333", marginBottom: ".5rem" }}>You're not enrolled in any courses yet.</p>
                  <p style={{ fontSize: ".88rem", marginBottom: "1.25rem" }}>Enroll in a course to join its community.</p>
                  <a href="/courses" style={{
                    display: "inline-block", background: "#0F6E56", color: "#fff",
                    fontWeight: 700, padding: ".65rem 1.5rem", borderRadius: 9, textDecoration: "none"
                  }}>Browse Courses</a>
                </>
              ) : (
                <p>Select a course from the sidebar to view its community.</p>
              )}
            </div>
          ) : (
            <>
              {/* Header — title hidden on mobile (top bar already shows it) */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", gap: "0.75rem" }}>
                <div className="community-header-title" style={{ minWidth: 0, overflow: "hidden" }}>
                  <h2 style={{ margin: 0, fontSize: "1.25rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedCourse.title}</h2>
                  <p style={{ margin: "0.2rem 0 0", color: "var(--text-500)", fontSize: "0.82rem" }}>Enrolled students only</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}
                  style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap" }}>
                  <Plus size={16} /> New Post
                </button>
              </div>

              {/* New post form */}
              {showForm && (
                <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "16px", padding: "1.25rem", marginBottom: "1.5rem" }}>
                  <h3 style={{ margin: "0 0 1rem" }}>Start a discussion</h3>
                  <div style={{ display: "grid", gap: "0.75rem" }}>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Post title"
                      style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid var(--border)", background: "#fff", boxSizing: "border-box" }} />
                    <textarea value={content} onChange={e => setContent(e.target.value)} rows={4} placeholder="What's your question or discussion?"
                      style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid var(--border)", background: "#fff", resize: "vertical", boxSizing: "border-box" }} />
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {TAGS.map(t => (
                        <button key={t} onClick={() => setTag(t)}
                          style={{ padding: "0.35rem 0.85rem", borderRadius: "20px", border: "1px solid var(--border)", cursor: "pointer", fontSize: "0.85rem",
                            fontWeight: tag === t ? 700 : 400, background: tag === t ? tagColor(t).bg : "transparent", color: tag === t ? tagColor(t).color : "inherit" }}>
                          {t}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      <button className="btn btn-primary" onClick={createPost} disabled={saving}>{saving ? "Posting..." : "Post"}</button>
                      <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tag filter */}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                {["All", ...TAGS].map(t => (
                  <button key={t} onClick={() => setFilterTag(t)}
                    style={{ padding: "0.3rem 0.8rem", borderRadius: "20px", border: "1px solid var(--border)", cursor: "pointer", fontSize: "0.82rem",
                      fontWeight: filterTag === t ? 700 : 400,
                      background: filterTag === t ? (t === "All" ? "#0F6E56" : tagColor(t).bg) : "transparent",
                      color: filterTag === t ? (t === "All" ? "#fff" : tagColor(t).color) : "inherit" }}>
                    {t}
                  </button>
                ))}
              </div>

              {/* Posts list */}
              {loading
                ? <p style={{ color: "var(--text-500)" }}>Loading posts...</p>
                : posts.length === 0
                  ? (
                    <div style={{ textAlign: "center", padding: "3rem", background: "var(--bg-secondary)", borderRadius: "16px", color: "var(--text-500)" }}>
                      <p>No posts yet. Be the first to start a discussion!</p>
                    </div>
                  ) : (
                    <>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {posts.map(post => (
                        <article key={post.id} style={{
                          border: "1px solid var(--border)", borderRadius: "16px", background: "#fff", overflow: "hidden",
                          borderLeft: post.is_pinned ? "4px solid #0F6E56" : undefined
                        }}>
                          <div style={{ padding: "1.25rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                                  {post.is_pinned && (
                                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", fontWeight: 700, color: "#0F6E56" }}>
                                      <Pin size={12} /> Pinned
                                    </span>
                                  )}
                                  {post.is_locked && (
                                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", color: "var(--text-500)" }}>
                                      <Lock size={12} /> Locked
                                    </span>
                                  )}
                                  {(post.tags || [post.category]).map(t => (
                                    <span key={t} style={{ padding: "0.2rem 0.6rem", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 700, background: tagColor(t).bg, color: tagColor(t).color }}>{t}</span>
                                  ))}
                                  <span style={{ color: "var(--text-500)", fontSize: "0.82rem" }}>{new Date(post.created_at).toLocaleDateString()}</span>
                                </div>
                                <h3 style={{ margin: 0, fontSize: "1rem", lineHeight: 1.4, wordBreak: "break-word" }}>{post.title}</h3>
                                <p style={{ margin: "0.5rem 0 0", color: "var(--text-500)", lineHeight: 1.6, fontSize: "0.9rem" }}>{post.content}</p>
                                <p style={{ margin: "0.4rem 0 0", fontSize: "0.8rem", color: "var(--text-500)" }}>by {post.profiles?.full_name || "Student"}</p>
                              </div>
                              {/* Vote button */}
                              <button onClick={() => castVote(post.id)}
                                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem",
                                  padding: "0.5rem 0.65rem", borderRadius: "10px", border: likedPosts[post.id] ? "1px solid #0F6E56" : "1px solid var(--border)",
                                  background: likedPosts[post.id] ? "#e6f5ee" : "var(--bg-secondary)", cursor: "pointer", flexShrink: 0 }}>
                                <ThumbsUp size={15} color={likedPosts[post.id] ? "#0F6E56" : undefined} />
                                <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>{post.upvotes || 0}</span>
                              </button>
                            </div>

                            <button onClick={() => loadReplies(post.id)}
                              style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", cursor: "pointer", color: "#0F6E56", fontWeight: 600, fontSize: "0.88rem" }}>
                              <MessageCircle size={14} />
                              {((replies[post.id] || []).length || post.reply_count || 0)} {((replies[post.id] || []).length || post.reply_count) === 1 ? "reply" : "replies"}
                              {expandedPost === post.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </div>

                          {/* Replies */}
                          {expandedPost === post.id && (
                            <div style={{ borderTop: "1px solid var(--border)", background: "var(--bg-secondary)", padding: "1rem 1.25rem" }}>
                              {(replies[post.id] || []).length === 0
                                ? <p style={{ color: "var(--text-500)", fontSize: "0.9rem", margin: "0 0 0.75rem" }}>No replies yet.</p>
                                : (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
                                    {(replies[post.id] || []).map(reply => (
                                      <div key={reply.id} style={{ background: "#fff", borderRadius: "10px", padding: "0.75rem 1rem", border: "1px solid var(--border)" }}>
                                        <p style={{ margin: 0, fontSize: "0.93rem", lineHeight: 1.6 }}>{reply.content}</p>
                                        <p style={{ margin: "0.4rem 0 0", fontSize: "0.78rem", color: "var(--text-500)" }}>
                                          {reply.profiles?.full_name || "Student"} · {new Date(reply.created_at).toLocaleDateString()}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              {!post.is_locked && (
                                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                  <input
                                    value={replyText[post.id] || ""}
                                    onChange={e => setReplyText(t => ({ ...t, [post.id]: e.target.value }))}
                                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && submitReply(post.id)}
                                    placeholder="Write a reply... (Enter to send)"
                                    style={{ flex: 1, minWidth: 0, padding: "0.6rem 0.9rem", borderRadius: "8px", border: "1px solid var(--border)", background: "#fff" }}
                                  />
                                  <button
                                    className="btn btn-primary"
                                    type="button"
                                    disabled={replySaving[post.id]}
                                    onClick={() => submitReply(post.id)}
                                    style={{ padding: "0.6rem 1rem", flexShrink: 0, opacity: replySaving[post.id] ? 0.7 : 1, cursor: replySaving[post.id] ? "not-allowed" : "pointer" }}>
                                    {replySaving[post.id] ? "Sending..." : "Reply"}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      totalItems={totalPosts}
                      pageSize={POSTS_PAGE_SIZE}
                      onPageChange={setPage}
                      label="posts"
                    />
                    </>
                  )}
            </>
          )}
        </main>
      </div>

      {/* ── RESPONSIVE STYLES ── */}
      <style>{`
        @media (max-width: 768px) {
          .leaderboard-entry {
            grid-template-columns: 1fr !important;
          }
          .community-layout {
            display: block !important;
            width: 100%;
            overflow: hidden;
          }
          .community-sidebar {
            display: none !important;
          }
          .community-mobile-bar {
            display: block !important;
            padding: 0.75rem 1rem;
            border-bottom: 1px solid var(--border);
            background: var(--bg-secondary);
          }
          .community-drawer {
            display: block !important;
          }
          .community-overlay {
            display: block !important;
          }
          .community-layout > main {
            width: 100% !important;
            max-width: 100vw !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            padding: 1rem !important;
          }
          /* Hide redundant course title — top bar already shows it */
          .community-header-title {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
