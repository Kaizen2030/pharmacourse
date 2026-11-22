import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight, Award, BadgeCheck, BookOpen, CircleCheck, Clock, FlaskConical, GraduationCap, Lock, MessageCircle,
  PlayCircle, Stethoscope, Target, X,
} from "lucide-react"
import { supabase } from "../lib/supabaseClient"
import { useAuth } from "../context/AuthContext"
import { friendlyError } from "../lib/friendlyError"
import SEO from "../components/SEO"
import { GroupLink } from "../components/JoinGroupCard"
import "../styles/dashboard-ui.css"

const ANNUAL_CPD_GOAL = 20
const CATEGORY_ART = {
  clinical: ["#0F6E56", "#1D9E75"],
  management: ["#185FA5", "#378ADD"],
  compliance: ["#854F0B", "#BA7517"],
}
const categoryArt = (category) => CATEGORY_ART[(category || "").trim().toLowerCase()] || ["#3f2f9e", "#7F77DD"]
const TABS = [
  { key: "courses", label: "My courses", icon: BookOpen },
  { key: "simulations", label: "Simulations", icon: FlaskConical },
  { key: "certificates", label: "Certificates", icon: Award },
  { key: "profile", label: "Profile", icon: GraduationCap },
]

function initials(name, email) {
  const parts = `${name || ""}`.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  if (parts.length) return parts.map((part) => part[0].toUpperCase()).join("")
  return (email || "P").charAt(0).toUpperCase()
}

function formatDate(value) {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })
}

function CourseCover({ course }) {
  const [from, to] = categoryArt(course?.category)
  if (course?.image_url) return <img src={course.image_url} alt="" className="ml-cover-img" loading="lazy" />
  return (
    <div className="ml-cover-art" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }} aria-hidden="true">
      <Stethoscope size={34} />
    </div>
  )
}

function EmptyState(props) {
  const { title, text, action } = props
  return (
    <div className="ml-empty">
      <span className="ml-empty-icon"><props.icon size={26} aria-hidden="true" /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  )
}

export default function Dashboard() {
  const { user, profile, loading: authLoading, updateProfile } = useAuth()
  const [enrollments, setEnrollments] = useState([])
  const [progress, setProgress] = useState({})
  const [certificates, setCertificates] = useState([])
  const [simulations, setSimulations] = useState([])
  const [simResponseMap, setSimResponseMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [activeTab, setActiveTab] = useState("courses")
  const [profileForm, setProfileForm] = useState({ full_name: "", professional_id: "" })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState("")
  const [profileError, setProfileError] = useState("")
  const [hasTutorProfile, setHasTutorProfile] = useState(false)
  const [showWhatsAppOptIn, setShowWhatsAppOptIn] = useState(() => {
    try { return localStorage.getItem("whatsapp_optin_dismissed") !== "true" } catch { return true }
  })

  useEffect(() => {
    if (authLoading) return
    if (!user) { setLoading(false); return }
    let active = true

    async function load() {
      // Independent reads run together instead of one after another.
      const [tutorRes, enrRes, progRes, certRes, simRes, respRes] = await Promise.all([
        supabase.from("instructors").select("id").eq("linked_user_id", user.id).maybeSingle(),
        supabase.from("course_enrollments").select("*, courses(*)").eq("user_id", user.id),
        supabase.from("course_progress").select("course_id, module_id, completed").eq("user_id", user.id),
        supabase.from("certificates").select("*, courses(title)").eq("user_id", user.id),
        supabase.from("case_simulations").select("id, title, patient_scenario, difficulty_level, course_id, courses(title)").eq("is_published", true).order("created_at", { ascending: false }),
        supabase.from("simulation_responses").select("simulation_id, overall_score, submitted_at").eq("user_id", user.id).order("submitted_at", { ascending: false }),
      ])
      if (!active) return
      if (enrRes.error) setLoadError(friendlyError(enrRes.error, "We could not load your courses. Please refresh the page."))

      const enr = enrRes.data || []
      setHasTutorProfile(Boolean(tutorRes.data))
      setEnrollments(enr)
      setCertificates(certRes.data || [])
      setSimulations(simRes.data || [])

      const responseMap = {}
      ;(respRes.data || []).forEach((row) => { if (!responseMap[row.simulation_id]) responseMap[row.simulation_id] = row })
      setSimResponseMap(responseMap)

      if (enr.length > 0) {
        const courseIds = enr.map((e) => e.course_id)
        const { data: allMods } = await supabase
          .from("course_modules").select("id, course_id, order_index").in("course_id", courseIds).order("order_index")
        if (!active) return

        const modulesByCourse = {}
        ;(allMods || []).forEach((m) => { (modulesByCourse[m.course_id] ||= []).push(m.id) })
        const doneModules = new Set()
        const startedSet = new Set()
        ;(progRes.data || []).forEach((row) => {
          startedSet.add(row.course_id)
          if (row.completed) doneModules.add(row.module_id)
        })

        const pMap = {}
        courseIds.forEach((cid) => {
          const modules = modulesByCourse[cid] || []
          const completed = modules.filter((id) => doneModules.has(id)).length
          // "Continue" opens the first lesson not finished yet (not always lesson 1).
          const nextModule = modules.find((id) => !doneModules.has(id)) || modules[0] || null
          pMap[cid] = { total: modules.length, completed, hasStarted: startedSet.has(cid), nextModule }
        })
        setProgress(pMap)
      }
      setLoading(false)
    }

    load().catch((error) => {
      if (!active) return
      console.error("[Dashboard] load failed", error)
      setLoadError("We could not load your learning right now. Please refresh the page.")
      setLoading(false)
    })
    return () => { active = false }
  }, [authLoading, user])

  useEffect(() => {
    setProfileForm({ full_name: profile?.full_name || "", professional_id: profile?.professional_id || "" })
  }, [profile?.full_name, profile?.professional_id])

  const setProfileField = (key) => (event) => {
    const value = event.target.value
    setProfileForm((current) => ({ ...current, [key]: value }))
  }

  async function handleProfileSave(event) {
    event.preventDefault()
    setProfileMessage("")
    setProfileError("")
    const fullName = profileForm.full_name.trim()
    if (!fullName) { setProfileError("Full name is required for your certificate."); return }
    setProfileSaving(true)
    try {
      await updateProfile({ full_name: fullName, professional_id: profileForm.professional_id })
      setProfileMessage("Profile updated. New certificates will use this name.")
    } catch (error) {
      setProfileError(error?.code ? friendlyError(error, "Unable to save your profile right now.") : error.message || "Unable to save your profile right now.")
    } finally {
      setProfileSaving(false)
    }
  }

  function dismissWhatsAppOptIn() {
    try { localStorage.setItem("whatsapp_optin_dismissed", "true") } catch { /* storage blocked */ }
    setShowWhatsAppOptIn(false)
  }

  if (authLoading || loading) {
    return (
      <main className="ml-page">
        <div className="ml-shell" aria-busy="true">
          <div className="ml-skeleton ml-skeleton-hero" />
          <div className="ml-stats">{[0, 1, 2, 3].map((n) => <div key={n} className="ml-skeleton ml-skeleton-stat" />)}</div>
          <div className="ml-skeleton ml-skeleton-row" />
          <p className="ml-sr">Loading your learning…</p>
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="ml-page">
        <div className="ml-shell">
          <EmptyState icon={GraduationCap} title="Sign in to see your learning" text="Your courses, certificates and CPD hours appear here once you sign in."
            action={<Link to="/login" className="btn btn-primary">Sign in</Link>} />
        </div>
      </main>
    )
  }

  // ---- derived numbers ----
  const courseState = (e) => {
    const p = progress[e.course_id]
    const pct = p && p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0
    const done = e.status === "completed" || Boolean(e.completed_at) || (p?.total > 0 && pct === 100)
    const status = done ? "completed" : p?.hasStarted ? "in-progress" : "not-started"
    return { p, pct, done, status }
  }
  const rows = enrollments.map((e) => ({ e, ...courseState(e) }))
  const completedRows = rows.filter((r) => r.done)
  const inProgressRows = rows.filter((r) => r.status === "in-progress")
  // Only real CPD values count; a course without CPD hours adds nothing.
  const cpdEarned = completedRows.reduce((sum, r) => sum + Number(r.e.courses?.cpd_hours || 0), 0)
  const goalPct = Math.min(Math.round((cpdEarned / ANNUAL_CPD_GOAL) * 100), 100)
  const spotlight = inProgressRows[0] || rows.find((r) => r.status === "not-started") || null
  const firstName = profile?.full_name?.split(" ")[0] || "there"
  const enrolledIds = new Set(enrollments.map((e) => e.course_id))
  const mySimulations = simulations.filter((s) => s.course_id && enrolledIds.has(s.course_id))
  const counts = { courses: enrollments.length, simulations: mySimulations.length, certificates: certificates.length }

  const learnHref = (r) => (r.p?.nextModule ? `/learn/${r.e.course_id}/${r.p.nextModule}` : `/courses/${r.e.courses?.slug || r.e.course_id}`)
  const actionLabel = (r) => (r.done ? "Review" : r.p?.hasStarted ? "Continue" : "Start")

  const ring = { "--ml-goal": `${goalPct * 3.6}deg` }

  return (
    <main className="ml-page">
      <SEO title="My Learning" description="Your Pharmacourse courses, progress, CPD hours and certificates." path="/dashboard" noindex />
      <div className="ml-shell">

        {/* Hero */}
        <section className="ml-hero">
          <div className="ml-hero-main">
            <span className="ml-avatar" aria-hidden="true">{initials(profile?.full_name, user.email)}</span>
            <div>
              <p className="ml-eyebrow">My Learning</p>
              <h1>Welcome back, {firstName}</h1>
              <p className="ml-hero-sub">
                {inProgressRows.length > 0
                  ? `You have ${inProgressRows.length} course${inProgressRows.length === 1 ? "" : "s"} in progress. Keep going.`
                  : enrollments.length > 0 ? "Pick a course and start your next lesson." : "Start your first CPD course today."}
              </p>
              <div className="ml-hero-actions">
                <Link to="/courses" className="ml-btn-light">Browse courses <ArrowRight size={16} aria-hidden="true" /></Link>
                {hasTutorProfile ? <Link to="/tutor" className="ml-btn-ghost">Open Tutor studio</Link> : null}
              </div>
            </div>
          </div>
          <div className="ml-goal" aria-label={`Annual CPD goal: ${cpdEarned} of ${ANNUAL_CPD_GOAL} hours`}>
            <div className="ml-goal-ring" style={ring}><span><strong>{goalPct}%</strong><small>of goal</small></span></div>
            <div>
              <p className="ml-goal-title"><Target size={15} aria-hidden="true" /> Annual CPD goal</p>
              <p className="ml-goal-value">{cpdEarned} / {ANNUAL_CPD_GOAL} hours</p>
              <p className="ml-goal-note">From completed courses</p>
            </div>
          </div>
        </section>

        {loadError ? <p role="alert" className="ml-alert">{loadError}</p> : null}

        {/* Stats */}
        <section className="ml-stats" aria-label="Learning summary">
          {[
            { icon: BookOpen, label: "Enrolled", value: enrollments.length, tone: "green" },
            { icon: Clock, label: "In progress", value: inProgressRows.length, tone: "amber" },
            { icon: CircleCheck, label: "Completed", value: completedRows.length, tone: "blue" },
            { icon: Award, label: "Certificates", value: certificates.length, tone: "violet" },
          ].map((stat) => (
            <div key={stat.label} className={`ml-stat ${stat.tone}`}>
              <span className="ml-stat-icon"><stat.icon size={20} aria-hidden="true" /></span>
              <div><strong>{stat.value}</strong><span>{stat.label}</span></div>
            </div>
          ))}
        </section>

        {/* Continue learning spotlight */}
        {spotlight && activeTab === "courses" ? (
          <section className="ml-spotlight">
            <div className="ml-spotlight-cover"><CourseCover course={spotlight.e.courses} /></div>
            <div className="ml-spotlight-body">
              <p className="ml-eyebrow dark">{spotlight.status === "in-progress" ? "Continue where you left off" : "Ready when you are"}</p>
              <h2>{spotlight.e.courses?.title || "Your course"}</h2>
              <div className="ml-progress" aria-label={`${spotlight.pct}% complete`}><span style={{ width: `${spotlight.pct}%` }} /></div>
              <p className="ml-muted">{spotlight.p?.completed || 0} of {spotlight.p?.total || 0} lessons complete · {spotlight.pct}%</p>
            </div>
            <Link to={learnHref(spotlight)} className="btn btn-primary ml-spotlight-cta">
              <PlayCircle size={18} aria-hidden="true" /> {actionLabel(spotlight)} learning
            </Link>
          </section>
        ) : null}

        {/* Tabs */}
        <div className="ml-tabs" role="tablist" aria-label="My Learning sections">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`ml-tab${activeTab === tab.key ? " active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <tab.icon size={16} aria-hidden="true" />
              {tab.label}
              {counts[tab.key] != null ? <span className="ml-tab-count">{counts[tab.key]}</span> : null}
            </button>
          ))}
        </div>

        {/* My courses */}
        {activeTab === "courses" && (
          <section className="ml-panel">
            {showWhatsAppOptIn ? (
              <div className="ml-wa-banner">
                <span className="ml-wa-icon"><MessageCircle size={20} aria-hidden="true" /></span>
                <div className="ml-wa-copy">
                  <strong>Get course updates on WhatsApp</strong>
                  <span>Your tutors can send reminders and tips for the courses you take.</span>
                </div>
                <Link to="/whatsapp-settings" className="ml-wa-btn">Set up</Link>
                <button type="button" className="ml-icon-btn" onClick={dismissWhatsAppOptIn} aria-label="Dismiss WhatsApp card"><X size={16} /></button>
              </div>
            ) : null}

            {rows.length === 0 ? (
              <EmptyState icon={BookOpen} title="No courses yet" text="Browse practical CPD courses built by practising pharmacists."
                action={<Link to="/courses" className="btn btn-primary">Browse courses</Link>} />
            ) : (
              <div className="ml-course-grid">
                {rows.map((r) => (
                  <article key={r.e.id} className="ml-course">
                    <div className="ml-course-cover">
                      <CourseCover course={r.e.courses} />
                      <span className={`ml-status ${r.status}`}>
                        {r.status === "completed" ? "Completed" : r.status === "in-progress" ? "In progress" : "Not started"}
                      </span>
                    </div>
                    <div className="ml-course-body">
                      {r.e.courses?.category ? <span className="ml-chip">{r.e.courses.category}</span> : null}
                      <h3>{r.e.courses?.title || "Course"}</h3>
                      <p className="ml-muted">
                        {r.p?.completed || 0} / {r.p?.total || 0} lessons
                        {Number(r.e.courses?.cpd_hours) > 0 ? ` · ${Number(r.e.courses.cpd_hours)} CPD hrs` : ""}
                      </p>
                      <div className="ml-progress" aria-label={`${r.pct}% complete`}><span style={{ width: `${r.pct}%` }} /></div>
                      <GroupLink courseId={r.e.course_id} />
                    </div>
                    <div className="ml-course-actions">
                      {r.done ? (
                        <Link to={`/certificate/${r.e.course_id}`} className="ml-btn-outline"><Award size={15} aria-hidden="true" /> Certificate</Link>
                      ) : null}
                      <Link to={learnHref(r)} className="ml-btn-primary">{actionLabel(r)} <ArrowRight size={15} aria-hidden="true" /></Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Simulations */}
        {activeTab === "simulations" && (
          <section className="ml-panel">
            {(() => {
              const locked = simulations.filter((s) => s.course_id && !enrolledIds.has(s.course_id))
              if (simulations.length === 0) {
                return <EmptyState icon={FlaskConical} title="No simulations yet" text="Patient case simulations will appear here once they are published." />
              }
              if (mySimulations.length === 0 && locked.length === 0) {
                return <EmptyState icon={Lock} title="Enrol in a course to unlock simulations" text="Simulations belong to specific courses."
                  action={<Link to="/courses" className="btn btn-primary">Browse courses</Link>} />
              }
              const byCourse = {}
              mySimulations.forEach((sim) => {
                (byCourse[sim.course_id] ||= { title: sim.courses?.title || "Course", sims: [] }).sims.push(sim)
              })
              const scoreTone = (s) => (s == null ? "none" : s >= 80 ? "good" : s >= 50 ? "ok" : "low")
              const scoreLabel = (s) => (s == null ? "Not scored" : s >= 80 ? "Excellent" : s >= 50 ? "Good attempt" : "Needs review")
              return (
                <>
                  {Object.entries(byCourse).map(([courseId, group]) => (
                    <div key={courseId} className="ml-sim-group">
                      <h3 className="ml-group-title"><BookOpen size={16} aria-hidden="true" /> {group.title} <span>{group.sims.length}</span></h3>
                      <div className="ml-sim-grid">
                        {group.sims.map((sim) => {
                          const response = simResponseMap[sim.id]
                          const score = response?.overall_score ?? null
                          return (
                            <article key={sim.id} className="ml-sim">
                              <div className="ml-sim-top">
                                <span className="ml-sim-icon"><Stethoscope size={18} aria-hidden="true" /></span>
                                <span className={`ml-level ${sim.difficulty_level || "beginner"}`}>{sim.difficulty_level || "beginner"}</span>
                              </div>
                              <h4>{sim.title}</h4>
                              <p className="ml-clamp">{sim.patient_scenario}</p>
                              {response ? (
                                <div className={`ml-score ${scoreTone(score)}`}>
                                  <span>{scoreLabel(score)}</span><strong>{score != null ? `${score}/100` : "–"}</strong>
                                </div>
                              ) : null}
                              <Link to={`/simulation/${sim.id}`} className={response ? "ml-btn-outline wide" : "ml-btn-primary wide"}>
                                {response ? "Review answers" : "Start simulation"} <ArrowRight size={15} aria-hidden="true" />
                              </Link>
                            </article>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  {locked.length > 0 ? (
                    <div className="ml-sim-group">
                      <h3 className="ml-group-title muted"><Lock size={16} aria-hidden="true" /> More simulations in other courses</h3>
                      <div className="ml-sim-grid">
                        {locked.map((sim) => (
                          <article key={sim.id} className="ml-sim locked">
                            <div className="ml-sim-top">
                              <span className="ml-sim-icon"><Lock size={18} aria-hidden="true" /></span>
                              <span className="ml-level">{sim.difficulty_level || "beginner"}</span>
                            </div>
                            <h4>{sim.title}</h4>
                            <p className="ml-muted">{sim.courses?.title}</p>
                            <Link to="/courses" className="ml-btn-outline wide">Enrol to unlock</Link>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              )
            })()}
          </section>
        )}

        {/* Certificates */}
        {activeTab === "certificates" && (
          <section className="ml-panel">
            {certificates.length === 0 ? (
              <EmptyState icon={Award} title="No certificates yet" text="Finish a course to earn a certificate employers can verify."
                action={<Link to="/courses" className="btn btn-primary">Browse courses</Link>} />
            ) : (
              <div className="ml-cert-grid">
                {certificates.map((c) => (
                  <article key={c.id} className="ml-cert">
                    <span className="ml-cert-icon"><BadgeCheck size={22} aria-hidden="true" /></span>
                    <h3>{c.courses?.title || "Certificate"}</h3>
                    <p className="ml-muted">Issued {formatDate(c.issued_date || c.issued_at || c.created_at)}</p>
                    <div className="ml-cert-actions">
                      <Link to={`/certificate/${c.course_id}`} className="ml-btn-primary">View certificate</Link>
                      <Link to={`/verify/${c.id}`} className="ml-btn-outline">Verify link</Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Profile */}
        {activeTab === "profile" && (
          <section className="ml-panel ml-profile">
            <div className="ml-profile-grid">
              {[
                { label: "Full name", value: profile?.full_name || "Not set" },
                { label: "Email", value: user.email },
                { label: "Professional ID", value: profile?.professional_id || "Not provided" },
                { label: "Account", value: profile?.role === "admin" ? "Administrator" : "Learner" },
              ].map((field) => (
                <div key={field.label} className="ml-profile-item"><span>{field.label}</span><strong>{field.value}</strong></div>
              ))}
            </div>

            <form onSubmit={handleProfileSave} className="ml-form">
              <div>
                <h3>Certificate details</h3>
                <p className="ml-muted">This name and professional ID are printed on your certificates.</p>
              </div>
              <div className="ml-form-row">
                <label className="ml-field">
                  <span>Full name</span>
                  <input value={profileForm.full_name} onChange={setProfileField("full_name")} placeholder="Dr. Jane Mwangi" required autoComplete="name" />
                </label>
                <label className="ml-field">
                  <span>Professional ID</span>
                  <input value={profileForm.professional_id} onChange={setProfileField("professional_id")} placeholder="PPB-12345" />
                </label>
              </div>
              {profileError ? <p role="alert" className="ml-alert">{profileError}</p> : null}
              {profileMessage ? <p role="status" className="ml-alert ok">{profileMessage}</p> : null}
              <div className="ml-form-actions">
                <button type="submit" disabled={profileSaving} className="btn btn-primary">{profileSaving ? "Saving…" : "Save details"}</button>
                <span className="ml-muted">Your next certificate view or download uses the updated details.</span>
              </div>
            </form>
          </section>
        )}
      </div>
    </main>
  )
}
