import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { useAuth } from "../context/AuthContext"
import ProgressBar from "../components/ProgressBar"
import SEO from "../components/SEO"
import { BookOpen, Award, Clock, User, ChevronRight, ArrowRight, FlaskConical } from "lucide-react"

const WHATSAPP_TIPS_LINK = "https://wa.me/254790059584?text=Hi%20Julius%2C%20subscribe%20me%20to%20daily%20pharmacy%20tips."

export default function Dashboard() {
  const { user, profile, loading: authLoading, updateProfile } = useAuth()
  const [enrollments, setEnrollments] = useState([])
  const [progress, setProgress] = useState({})
  const [certificates, setCertificates] = useState([])
  const [simulations, setSimulations] = useState([])
  const [simResponseMap, setSimResponseMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("courses")
  const [firstModules, setFirstModules] = useState({})
  const [profileForm, setProfileForm] = useState({ full_name: "", professional_id: "" })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState("")
  const [profileError, setProfileError] = useState("")
  const [showWhatsAppOptIn, setShowWhatsAppOptIn] = useState(() => {
    try {
      return localStorage.getItem("whatsapp_optin_dismissed") !== "true"
    } catch {
      return true
    }
  })

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }

    async function load() {
      const { data: enr } = await supabase
        .from("course_enrollments").select("*, courses(*)")
        .eq("user_id", user.id)

      const { data: prog } = await supabase
        .from("course_progress").select("course_id, module_id, completed")
        .eq("user_id", user.id)

      const { data: certs } = await supabase
        .from("certificates").select("*, courses(title)")
        .eq("user_id", user.id)

      const { data: sims } = await supabase
        .from("case_simulations")
        .select("id, title, patient_scenario, difficulty_level, course_id, courses(title)")
        .eq("is_published", true)
        .order("created_at", { ascending: false })

      const { data: simResponses } = await supabase
        .from("simulation_responses")
        .select("simulation_id, overall_score, submitted_at")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false })

      setEnrollments(enr || [])
      setCertificates(certs || [])
      setSimulations(sims || [])

      const responseMap = {}
      ;(simResponses || []).forEach(row => {
        if (!responseMap[row.simulation_id]) {
          responseMap[row.simulation_id] = row
        }
      })
      setSimResponseMap(responseMap)

      if (enr && enr.length > 0) {
        const courseIds = enr.map(e => e.course_id)

        const { data: allMods } = await supabase
          .from("course_modules")
          .select("id, course_id, order_index")
          .in("course_id", courseIds)
          .order("order_index")

        const modMap = {}
        const totalMap = {}
        ;(allMods || []).forEach(m => {
          if (!modMap[m.course_id]) modMap[m.course_id] = m.id
          totalMap[m.course_id] = (totalMap[m.course_id] || 0) + 1
        })
        setFirstModules(modMap)

        const completedMap = {}
        const startedSet = new Set()
        ;(prog || []).forEach(row => {
          startedSet.add(row.course_id)
          if (row.completed) {
            completedMap[row.course_id] = (completedMap[row.course_id] || 0) + 1
          }
        })

        const pMap = {}
        courseIds.forEach(cid => {
          const total = totalMap[cid] || 0
          const completed = completedMap[cid] || 0
          const hasStarted = startedSet.has(cid)
          pMap[cid] = { total, completed, hasStarted }
        })
        setProgress(pMap)
      }

      setLoading(false)
    }

    load()
  }, [authLoading, user])

  useEffect(() => {
    setProfileForm({
      full_name: profile?.full_name || "",
      professional_id: profile?.professional_id || "",
    })
  }, [profile?.full_name, profile?.professional_id])

  function handleProfileFieldChange(key) {
    return (event) => {
      const value = event.target.value
      setProfileForm((current) => ({ ...current, [key]: value }))
    }
  }

  async function handleProfileSave(event) {
    event.preventDefault()
    setProfileMessage("")
    setProfileError("")

    const fullName = profileForm.full_name.trim()
    if (!fullName) {
      setProfileError("Full name is required for your certificate.")
      return
    }

    setProfileSaving(true)

    try {
      await updateProfile({
        full_name: fullName,
        professional_id: profileForm.professional_id,
      })
      setProfileMessage("Profile updated. New certificates will use this name.")
    } catch (error) {
      setProfileError(error.message || "Unable to save your profile right now.")
    } finally {
      setProfileSaving(false)
    }
  }

  function dismissWhatsAppOptIn() {
    try {
      localStorage.setItem("whatsapp_optin_dismissed", "true")
    } catch {
      // Ignore storage failures and just hide it for now.
    }

    setShowWhatsAppOptIn(false)
  }

  if (loading) return (
    <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ textAlign: "center", color: "var(--text-500)" }}>
        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
        <p>Loading your learning…</p>
      </div>
    </div>
  )

  if (!user) return (
    <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <h1 style={{ marginBottom: "0.75rem" }}>Sign in to view your dashboard</h1>
        <p style={{ color: "var(--text-500)", marginBottom: "1.5rem" }}>
          We could not restore an active session, so your learning dashboard is unavailable right now.
        </p>
        <Link to="/login" className="btn btn-primary">Go to Sign In</Link>
      </div>
    </div>
  )

  const firstName = profile?.full_name?.split(" ")[0] || "Pharmacist"
  const inProgress = enrollments.filter(e => !e.completed_at).length
  const completedEnrollments = enrollments.filter(e => e.status === "completed")
  const completedCoursesCount = completedEnrollments.length
  const totalCpdHoursEarned = completedEnrollments.reduce((sum, enrollment) => {
    return sum + Number(enrollment.courses?.cpd_hours || 2)
  }, 0)
  const annualCpdGoal = 20
  const annualGoalProgress = annualCpdGoal > 0
    ? Math.min((totalCpdHoursEarned / annualCpdGoal) * 100, 100)
    : 0
  const annualGoalProgressLabel = `${Math.round(annualGoalProgress)}%`
  const profileInputStyle = {
    width: "100%",
    padding: ".8rem .95rem",
    border: "1.5px solid #dbe5df",
    borderRadius: 10,
    fontSize: ".95rem",
    fontFamily: "inherit",
    background: "#fff",
    boxSizing: "border-box",
  }

  return (
    <div className="page">
      <SEO
        title="Dashboard"
        description="Your PharmaCourse learning dashboard."
        path="/dashboard"
        noindex
      />

      <div className="container-wide dashboard-shell" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>

        {/* ── Header ── */}
        <div className="dashboard-header" style={{
          background: "linear-gradient(135deg, #0a2e1f 0%, #0F6E56 100%)",
          borderRadius: 16, padding: "2rem 2.5rem", marginBottom: "2rem",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: "1rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.5rem", border: "2px solid rgba(255,255,255,0.25)"
            }}>👤</div>
            <div>
              <h1 style={{ color: "#fff", fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>
                Welcome back, {firstName}
              </h1>
              <p style={{ color: "rgba(255,255,255,0.65)", margin: 0, fontSize: ".88rem" }}>
                {profile?.email || user?.email} {profile?.role === "admin" && "· Admin"}
              </p>
            </div>
          </div>
          <Link to="/courses" className="dashboard-header-action" style={{
            background: "#fff", color: "#0F6E56", fontWeight: 700,
            padding: ".6rem 1.25rem", borderRadius: 8, textDecoration: "none",
            fontSize: ".88rem", display: "flex", alignItems: "center", gap: 6
          }}>
            Browse Courses <ChevronRight size={15} />
          </Link>
        </div>

        {/* ── Stats ── */}
        <div className="dashboard-stats" style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem", marginBottom: "2rem"
        }}>
          {[
            { icon: BookOpen, label: "Enrolled", value: enrollments.length, color: "#0F6E56", bg: "#e8f5f0" },
            { icon: Clock, label: "In Progress", value: inProgress, color: "#E09B00", bg: "#fef9e7" },
            { icon: Award, label: "Certificates", value: certificates.length, color: "#7C3AED", bg: "#f3eeff" },
            { icon: FlaskConical, label: "Simulations", value: simulations.length, color: "#1A6BB5", bg: "#e8f0fb" },
          ].map(s => (
            <div key={s.label} style={{
              background: "#fff", border: "1px solid #eee",
              borderRadius: 12, padding: "1.25rem",
              display: "flex", alignItems: "center", gap: "1rem",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)"
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: s.bg, display: "flex",
                alignItems: "center", justifyContent: "center", flexShrink: 0
              }}>
                <s.icon size={20} color={s.color} />
              </div>
              <div>
                <p style={{ fontSize: "1.6rem", fontWeight: 800, lineHeight: 1, margin: 0, color: "#111" }}>{s.value}</p>
                <p style={{ fontSize: ".78rem", color: "var(--text-500)", margin: 0 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="dashboard-tabs" style={{
          display: "flex", gap: 4, marginBottom: "1.5rem",
          borderBottom: "2px solid #eee", paddingBottom: 0
        }}>
          {[
            { key: "courses", label: "My Courses", count: enrollments.length },
            { key: "simulations", label: "Simulations", count: simulations.length },
            { key: "certificates", label: "Certificates", count: certificates.length },
            { key: "profile", label: "Profile", count: null },

          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`dashboard-tab-button ${activeTab === tab.key ? "active" : ""}`}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: ".9rem 1rem", fontSize: ".95rem", fontWeight: 700,
                color: activeTab === tab.key ? "#0F6E56" : "var(--text-500)",
                borderBottom: activeTab === tab.key ? "2px solid #0F6E56" : "2px solid transparent",
                marginBottom: -2, display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.15s ease"
              }}
            >
              {tab.label}
              {tab.count !== null && (
                <span style={{
                  background: activeTab === tab.key ? "#e8f5f0" : "#f0f0f0",
                  color: activeTab === tab.key ? "#0F6E56" : "#999",
                  borderRadius: 99, fontSize: ".72rem", fontWeight: 700,
                  padding: "1px 7px"
                }}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── My Courses Tab ── */}
        {activeTab === "courses" && (
          <div>
            {showWhatsAppOptIn ? (
              <div className="whatsapp-optin-card" style={{ marginBottom: "1.5rem" }}>
                <button
                  type="button"
                  className="whatsapp-optin-close"
                  onClick={dismissWhatsAppOptIn}
                  aria-label="Dismiss WhatsApp tips card"
                >
                  ×
                </button>
                <div className="whatsapp-optin-copy">
                  <p className="whatsapp-optin-title">Get daily pharmacy tips on WhatsApp</p>
                  <p className="whatsapp-optin-text">
                    Free CPD micro-lessons, drug updates, and exam prep sent straight to your phone.
                  </p>
                </div>
                <a
                  href={WHATSAPP_TIPS_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary whatsapp-optin-button"
                  style={{ background: "linear-gradient(135deg, #128C7E, #25D366)", boxShadow: "0 10px 24px rgba(37, 211, 102, 0.2)" }}
                >
                  Join WhatsApp Tips
                </a>
              </div>
            ) : null}

            <div className="cpd-summary-grid" style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "1rem",
              marginBottom: "1.5rem"
            }}>
              <div className="cpd-summary-card" style={{
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: "1.25rem",
                boxShadow: "var(--shadow-sm)"
              }}>
                <p style={{
                  fontSize: ".76rem",
                  fontWeight: 800,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  color: "var(--text-500)",
                  margin: "0 0 .55rem"
                }}>
                  CPD Hours Earned
                </p>
                <p style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-900)", margin: "0 0 .35rem", lineHeight: 1 }}>
                  {totalCpdHoursEarned}
                </p>
                <p style={{ fontSize: ".86rem", color: "var(--text-500)", margin: 0 }}>
                  Hours from completed courses
                </p>
              </div>

              <div className="cpd-summary-card" style={{
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: "1.25rem",
                boxShadow: "var(--shadow-sm)"
              }}>
                <p style={{
                  fontSize: ".76rem",
                  fontWeight: 800,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  color: "var(--text-500)",
                  margin: "0 0 .55rem"
                }}>
                  Courses Completed
                </p>
                <p style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-900)", margin: "0 0 .35rem", lineHeight: 1 }}>
                  {completedCoursesCount}
                </p>
                <p style={{ fontSize: ".86rem", color: "var(--text-500)", margin: 0 }}>
                  Enrollments marked completed
                </p>
              </div>

              <div className="cpd-summary-card" style={{
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: "1.25rem",
                boxShadow: "var(--shadow-sm)"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".75rem", marginBottom: ".7rem" }}>
                  <p style={{
                    fontSize: ".76rem",
                    fontWeight: 800,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    color: "var(--text-500)",
                    margin: 0
                  }}>
                    Annual Goal
                  </p>
                  <span style={{ fontSize: ".84rem", fontWeight: 700, color: "var(--green)" }}>
                    {annualGoalProgressLabel}
                  </span>
                </div>
                <p style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-900)", margin: "0 0 .7rem", lineHeight: 1.2 }}>
                  {totalCpdHoursEarned} / {annualCpdGoal} hrs
                </p>
                <div style={{ height: 10, background: "var(--gray-100)", borderRadius: 999, overflow: "hidden", marginBottom: ".6rem" }}>
                  <div style={{
                    height: "100%",
                    width: `${annualGoalProgress}%`,
                    borderRadius: 999,
                    background: "linear-gradient(90deg, #0F6E56, #1a9e7a)",
                    transition: "width 0.35s ease"
                  }} />
                </div>
                <p style={{ fontSize: ".86rem", color: "var(--text-500)", margin: 0 }}>
                  Progress toward your 20-hour annual CPD target
                </p>
              </div>
            </div>

            {enrollments.length === 0 ? (
              <div style={{
                background: "#fff", border: "1px solid #eee", borderRadius: 16,
                padding: "4rem 2rem", textAlign: "center",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
              }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📚</div>
                <h3 style={{ margin: "0 0 .5rem", color: "#111" }}>No courses yet</h3>
                <p style={{ color: "var(--text-500)", marginBottom: "1.5rem" }}>Start learning today — browse our pharmacy courses.</p>
                <Link to="/courses" className="btn btn-primary">Browse Courses</Link>
              </div>
            ) : (
              <div className="dash-courses-grid" style={{ display: "grid", gap: "1.25rem" }}>
                {enrollments.map(e => {
                  const p = progress[e.course_id]
                  const pct = p && p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0
                  const course = e.courses

                  return (
                    <div key={e.id} className="dash-course-card" style={{
                      background: "#fff", border: "1px solid #eee",
                      borderRadius: 16, overflow: "hidden",
                      display: "flex", alignItems: "stretch",
                      boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
                      transition: "box-shadow 0.2s",
                    }}>
                      {/* Thumbnail */}
                      <div className="dash-course-thumb" style={{
                        width: 220, minHeight: 150, flexShrink: 0,
                        background: "linear-gradient(135deg, #f7fbf9, #edf6f1)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "2.5rem", borderRight: "1px solid #eee",
                        overflow: "hidden", position: "relative",
                        padding: "0.6rem"
                      }}>
                        {course?.image_url
                          ? <img src={course.image_url} alt={course.title} style={{
                              position: "absolute", inset: 0,
                              width: "100%", height: "100%",
                              objectFit: "contain", objectPosition: "center",
                              padding: "0.55rem",
                              background: "#fff"
                            }} />
                          : "💊"}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        <div>
                          {course?.category && (
                            <span style={{
                              fontSize: ".72rem", fontWeight: 700, letterSpacing: .5,
                              color: "#0F6E56", background: "#e8f5f0",
                              padding: "2px 8px", borderRadius: 99, textTransform: "uppercase"
                            }}>{course.category}</span>
                          )}
                          <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: ".5rem 0 .25rem", color: "#0a2e1f", lineHeight: 1.4 }}>
                            {course?.title}
                          </h3>
                          <p style={{ fontSize: ".82rem", color: "var(--text-500)", margin: 0 }}>
                            {p?.completed || 0} / {p?.total || 0} lessons completed
                          </p>
                        </div>

                        {/* Progress bar */}
                        <div style={{ marginTop: ".75rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: ".75rem", color: "var(--text-500)" }}>Progress</span>
                            <span style={{ fontSize: ".75rem", fontWeight: 700, color: pct === 100 ? "#0F6E56" : "#666" }}>{pct}%</span>
                          </div>
                          <div style={{ height: 6, background: "#eee", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: 99,
                              width: `${pct}%`,
                              background: pct === 100
                                ? "linear-gradient(90deg, #0F6E56, #1a9e7a)"
                                : "linear-gradient(90deg, #0F6E56, #4db896)",
                              transition: "width 0.4s ease"
                            }} />
                          </div>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="dash-course-action" style={{
                        padding: "1.25rem", display: "flex",
                        flexDirection: "column", alignItems: "center",
                        justifyContent: "center", gap: ".75rem",
                        borderLeft: "1px solid #eee", flexShrink: 0
                      }}>
                        {pct === 100 && (
                          <Link to={`/certificate/${e.course_id}`}
                            style={{
                              fontSize: ".78rem", fontWeight: 700,
                              color: "#7C3AED", textDecoration: "none",
                              display: "flex", alignItems: "center", gap: 4
                            }}>
                            🏆 Certificate
                          </Link>
                        )}
                        <Link
                          to={firstModules[e.course_id]
                            ? `/learn/${e.course_id}/${firstModules[e.course_id]}`
                            : `/courses/${course?.slug || e.course_id}`}
                          style={{
                            background: "#0F6E56", color: "#fff",
                            padding: ".55rem 1.1rem", borderRadius: 8,
                            textDecoration: "none", fontSize: ".84rem",
                            fontWeight: 700, display: "flex", alignItems: "center",
                            gap: 6, whiteSpace: "nowrap"
                          }}
                        >
                          {p?.hasStarted ? "Continue" : "Start"} <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Simulations Tab ── */}
        {activeTab === "simulations" && (
          <div>
            {(() => {
              const enrolledCourseIds = new Set(enrollments.map(e => e.course_id))
              // Simulations for enrolled courses
              const available = simulations.filter(s => s.course_id && enrolledCourseIds.has(s.course_id))
              // Simulations for courses not enrolled in (locked)
              const locked = simulations.filter(s => s.course_id && !enrolledCourseIds.has(s.course_id))

              if (simulations.length === 0) return (
                <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 16, padding: "4rem 2rem", textAlign: "center" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏥</div>
                  <h3 style={{ margin: "0 0 .5rem" }}>No simulations yet</h3>
                  <p style={{ color: "var(--text-500)", marginBottom: "1.5rem" }}>Case simulations will appear here once your admin adds them.</p>
                </div>
              )

              if (available.length === 0 && locked.length === 0) return (
                <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 16, padding: "4rem 2rem", textAlign: "center" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔒</div>
                  <h3 style={{ margin: "0 0 .5rem" }}>Enroll in a course to unlock simulations</h3>
                  <p style={{ color: "var(--text-500)", marginBottom: "1.5rem" }}>Simulations are tied to specific courses. Enroll to access them.</p>
                  <Link to="/courses" className="btn btn-primary">Browse Courses</Link>
                </div>
              )

              // Group available sims by course
              const byCourse = {}
              available.forEach(sim => {
                const key = sim.course_id
                if (!byCourse[key]) byCourse[key] = { title: sim.courses?.title || "Unknown Course", sims: [] }
                byCourse[key].sims.push(sim)
              })

              const diffColor = d => d === "advanced" ? "#E24B4A" : d === "intermediate" ? "#E09B00" : "#0F6E56"
              const diffBg    = d => d === "advanced" ? "#fdf2f2" : d === "intermediate" ? "#fef9e7" : "#e8f5f0"
              const scoreColor = s => s == null ? "#888" : s >= 80 ? "#0F6E56" : s >= 50 ? "#E09B00" : "#E24B4A"
              const scoreLabel = s => s == null ? "Not Scored" : s >= 80 ? "Excellent" : s >= 50 ? "Good Attempt" : "Needs Review"
              return (
                <div>
                  {/* Available — grouped by course */}
                  {Object.entries(byCourse).map(([courseId, group]) => (
                    <div key={courseId} style={{ marginBottom: "2rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
                        <span style={{ fontSize: "1rem" }}>📚</span>
                        <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#0a2e1f" }}>{group.title}</h3>
                        <span style={{ fontSize: "0.75rem", color: "#888" }}>{group.sims.length} simulation{group.sims.length !== 1 ? "s" : ""}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
                        {group.sims.map(sim => (
                          <div key={sim.id} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 16, padding: "1.5rem", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", gap: ".75rem" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <div style={{ fontSize: "1.75rem" }}>🏥</div>
                              <span style={{ fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: .5, color: diffColor(sim.difficulty_level), background: diffBg(sim.difficulty_level), padding: "3px 10px", borderRadius: 99 }}>{sim.difficulty_level}</span>
                            </div>
                            <h3 style={{ fontSize: ".95rem", fontWeight: 700, color: "#0a2e1f", margin: 0 }}>{sim.title}</h3>
                            <p style={{ fontSize: ".82rem", color: "var(--text-500)", margin: 0, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              {sim.patient_scenario}
                            </p>
                            {(() => {
                              const response = simResponseMap[sim.id]
                              const score = response?.overall_score ?? null

                              if (response) {
                                return (
                                  <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: ".5rem" }}>
                                    <div style={{
                                      background: `${scoreColor(score)}15`,
                                      border: `1px solid ${scoreColor(score)}40`,
                                      borderRadius: 8,
                                      padding: ".5rem .85rem",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between"
                                    }}>
                                      <span style={{ fontSize: ".78rem", fontWeight: 700, color: scoreColor(score) }}>
                                        {scoreLabel(score)}
                                      </span>
                                      <span style={{ fontSize: "1rem", fontWeight: 900, color: scoreColor(score) }}>
                                        {score != null ? `${score}/100` : "-"}
                                      </span>
                                    </div>
                                    <Link
                                      to={`/simulation/${sim.id}`}
                                      style={{
                                        background: "#f0f8f5",
                                        color: "#0F6E56",
                                        fontWeight: 700,
                                        padding: ".6rem 1rem",
                                        borderRadius: 8,
                                        textDecoration: "none",
                                        fontSize: ".84rem",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 6,
                                        border: "1px solid #b8dfd3"
                                      }}
                                    >
                                      Review Answers <ArrowRight size={14} />
                                    </Link>
                                  </div>
                                )
                              }

                              return (
                                <Link
                                  to={`/simulation/${sim.id}`}
                                  style={{
                                    background: "#0F6E56",
                                    color: "#fff",
                                    fontWeight: 700,
                                    padding: ".6rem 1rem",
                                    borderRadius: 8,
                                    textDecoration: "none",
                                    fontSize: ".84rem",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 6,
                                    marginTop: "auto"
                                  }}
                                >
                                  Start Simulation <ArrowRight size={14} />
                                </Link>
                              )
                            })()}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Locked simulations — teaser */}
                  {locked.length > 0 && (
                    <div style={{ marginTop: available.length > 0 ? "2rem" : 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
                        <span style={{ fontSize: "1rem" }}>🔒</span>
                        <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#888" }}>More simulations available</h3>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
                        {locked.map(sim => (
                          <div key={sim.id} style={{ background: "#f8f8f8", border: "1px dashed #ddd", borderRadius: 16, padding: "1.5rem", display: "flex", flexDirection: "column", gap: ".75rem", opacity: 0.7 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <div style={{ fontSize: "1.75rem", filter: "grayscale(1)" }}>🏥</div>
                              <span style={{ fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", color: "#aaa", background: "#eee", padding: "3px 10px", borderRadius: 99 }}>{sim.difficulty_level}</span>
                            </div>
                            <h3 style={{ fontSize: ".95rem", fontWeight: 700, color: "#aaa", margin: 0 }}>{sim.title}</h3>
                            <p style={{ fontSize: ".78rem", color: "#bbb", margin: 0 }}>📚 {sim.courses?.title}</p>
                            <Link to="/courses" style={{ background: "#eee", color: "#888", fontWeight: 700, padding: ".6rem 1rem", borderRadius: 8, textDecoration: "none", fontSize: ".84rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: "auto" }}>
                              🔒 Enroll to unlock
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        {/* ── Certificates Tab ── */}
        {activeTab === "certificates" && (
          <div>
            {certificates.length === 0 ? (
              <div style={{
                background: "#fff", border: "1px solid #eee", borderRadius: 16,
                padding: "4rem 2rem", textAlign: "center"
              }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏆</div>
                <h3 style={{ margin: "0 0 .5rem" }}>No certificates yet</h3>
                <p style={{ color: "var(--text-500)", marginBottom: "1.5rem" }}>Complete a course to earn your first certificate.</p>
                <Link to="/courses" className="btn btn-primary">Browse Courses</Link>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
                {certificates.map(c => (
                  <div key={c.id} style={{
                    background: "#fff", border: "1px solid #eee",
                    borderRadius: 16, padding: "1.5rem",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.05)"
                  }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: ".75rem" }}>🏆</div>
                    <h3 style={{ fontSize: ".95rem", fontWeight: 700, color: "#0a2e1f", margin: "0 0 .4rem" }}>
                      {c.courses?.title}
                    </h3>
                    <p style={{ fontSize: ".78rem", color: "var(--text-500)", margin: "0 0 1rem" }}>
                      Issued {new Date(c.issued_date || c.issued_at).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                    <Link to={`/certificate/${c.course_id}`} className="btn btn-primary" style={{ fontSize: ".82rem", width: "100%", textAlign: "center" }}>
                      View Certificate
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Profile Tab ── */}
        {activeTab === "profile" && (
          <div style={{
            background: "#fff", border: "1px solid #eee",
            borderRadius: 16, padding: "2rem",
            boxShadow: "0 1px 6px rgba(0,0,0,0.05)"
          }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 1.5rem", color: "#0a2e1f" }}>Profile Details</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
              {[
                { label: "Full Name", value: profile?.full_name },
                { label: "Email", value: profile?.role === "admin" ? `${user?.email} (Admin)` : user?.email },
                { label: "Professional ID", value: profile?.professional_id || "Not provided" },
                { label: "Role", value: profile?.role || "Student" },
              ].map(f => (
                <div key={f.label} style={{
                  background: "#f8faf9", borderRadius: 10, padding: "1rem 1.25rem",
                  border: "1px solid #edf2ef"
                }}>
                  <p style={{ fontSize: ".75rem", color: "var(--text-500)", fontWeight: 600, margin: "0 0 .3rem", textTransform: "uppercase", letterSpacing: .5 }}>
                    {f.label}
                  </p>
                  <p style={{ fontSize: ".95rem", fontWeight: 600, color: "#111", margin: 0 }}>{f.value}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleProfileSave} style={{ marginTop: "2rem" }}>
              <div style={{
                background: "#f8faf9",
                border: "1px solid #e6eeea",
                borderRadius: 14,
                padding: "1.5rem"
              }}>
                <div style={{ marginBottom: "1rem" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 .35rem", color: "#0a2e1f" }}>
                    Edit Certificate Details
                  </h3>
                  <p style={{ margin: 0, color: "var(--text-500)", fontSize: ".88rem", lineHeight: 1.6 }}>
                    This is the name and professional ID shown on your certificate.
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: ".78rem", color: "var(--text-500)", fontWeight: 700, marginBottom: ".4rem", textTransform: "uppercase", letterSpacing: .5 }}>
                      Full Name
                    </label>
                    <input
                      value={profileForm.full_name}
                      onChange={handleProfileFieldChange("full_name")}
                      placeholder="Dr. Jane Mwangi"
                      required
                      style={profileInputStyle}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: ".78rem", color: "var(--text-500)", fontWeight: 700, marginBottom: ".4rem", textTransform: "uppercase", letterSpacing: .5 }}>
                      Professional ID
                    </label>
                    <input
                      value={profileForm.professional_id}
                      onChange={handleProfileFieldChange("professional_id")}
                      placeholder="PPB-12345"
                      style={profileInputStyle}
                    />
                  </div>
                </div>

                {profileError && (
                  <p style={{ margin: "1rem 0 0", color: "#c0392b", fontSize: ".88rem", fontWeight: 600 }}>
                    {profileError}
                  </p>
                )}

                {profileMessage && (
                  <p style={{ margin: "1rem 0 0", color: "#0F6E56", fontSize: ".88rem", fontWeight: 600 }}>
                    {profileMessage}
                  </p>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: ".85rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="btn btn-primary"
                    style={{ padding: ".75rem 1.35rem" }}
                  >
                    {profileSaving ? "Saving..." : "Save Profile"}
                  </button>
                  <span style={{ fontSize: ".82rem", color: "var(--text-500)" }}>
                    Your next certificate view or download will use the updated details.
                  </span>
                </div>
              </div>
            </form>
          </div>
        )}



      </div>

      <style>{`
        .dashboard-header { transition: all 0.2s ease; }
        .dashboard-stats { transition: all 0.2s ease; }
        .dashboard-tabs { transition: all 0.2s ease; }
        .dashboard-shell {
          width: calc(100% - clamp(2rem, 4vw, 4rem));
          margin: 0 auto;
        }
        .dashboard-tab-button { border-radius: 12px; background: transparent; border: 1px solid transparent; }
        .dashboard-tab-button.active { background: rgba(15,110,86,0.08); color: #0F6E56; border-color: rgba(15,110,86,0.15); }
        .dashboard-header-action { transition: transform 0.2s ease; }
        .dashboard-header-action:hover { transform: translateY(-1px); }
        .cpd-summary-card { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .cpd-summary-card:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
        .dash-courses-grid {
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        }
        .dash-course-card:hover {
          box-shadow: 0 12px 28px rgba(0,0,0,0.08);
        }
        .dash-course-thumb img {
          width: 100%; height: 100%; object-fit: contain; object-position: center;
        }
        @media (max-width: 900px) {
          .dashboard-header {
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 1.75rem 1.5rem !important;
          }
          .dashboard-header-action {
            width: 100% !important;
            justify-content: center !important;
            padding: .85rem 1rem !important;
          }
          .dashboard-stats {
            grid-template-columns: repeat(2, minmax(0,1fr)) !important;
          }
          .cpd-summary-grid {
            grid-template-columns: repeat(2, minmax(0,1fr)) !important;
          }
          .dashboard-tabs {
            flex-wrap: wrap !important;
            gap: 0.75rem !important;
          }
          .dashboard-tab-button {
            width: calc(50% - 0.375rem) !important;
            justify-content: center !important;
            border: 1px solid #eee !important;
            background: #fff !important;
            padding: .9rem 1rem !important;
          }
          .dashboard-tab-button.active {
            border-color: #0F6E56 !important;
            background: #f0f8f5 !important;
          }
          .dash-courses-grid {
            grid-template-columns: repeat(2, minmax(0,1fr)) !important;
            gap: 1rem !important;
          }
          .dash-course-card {
            flex-direction: column !important;
            border-radius: 18px;
          }
          .dash-course-thumb {
            width: 100% !important;
            height: 150px !important;
            border-right: none !important;
            border-bottom: 1px solid #eee !important;
          }
          .dash-course-card > div:nth-child(2) {
            padding: 1rem !important;
          }
          .dash-course-card h3 {
            font-size: .9rem !important;
            line-height: 1.35 !important;
          }
          .dash-course-action {
            border-left: none !important;
            border-top: 1px solid #eee !important;
            flex-direction: column !important;
            justify-content: stretch !important;
            align-items: stretch !important;
            padding: .9rem 1rem !important;
            gap: 0.55rem !important;
          }
          .dash-course-action a {
            width: 100% !important;
            flex: none !important;
            justify-content: center !important;
          }
        }
        @media (max-width: 640px) {
          .dashboard-header { padding: 1.5rem 1rem !important; }
          .dashboard-stats { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
          .cpd-summary-grid { grid-template-columns: 1fr !important; }
          .dashboard-tabs { flex-wrap: wrap !important; gap: 0.5rem !important; }
          .dashboard-tab-button { width: calc(50% - 0.25rem) !important; }
          .dash-courses-grid {
            grid-template-columns: repeat(2, minmax(0,1fr)) !important;
            gap: .75rem !important;
          }
          .dash-course-card { box-shadow: none !important; border: 1px solid #f0f0f0 !important; }
          .dash-course-thumb { height: 118px !important; }
          .dash-course-card > div:nth-child(2) { padding: .8rem !important; }
          .dash-course-card h3 { font-size: .82rem !important; }
          .dash-course-card p { font-size: .74rem !important; }
          .dash-course-action { padding: .75rem !important; gap: .45rem !important; }
          .dash-course-action a { width: 100% !important; font-size: .74rem !important; padding: .55rem .75rem !important; }
          .dash-course-action a:last-child { margin-top: 0 !important; }
        }
        @media (max-width: 420px) {
          .dashboard-tab-button { width: 100% !important; }
          .dashboard-stats { grid-template-columns: 1fr !important; }
          .dash-courses-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
