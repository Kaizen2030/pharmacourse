import { useEffect, useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import {
  Award, BadgeCheck, BookOpen, Check, ChevronDown, ChevronRight, Clock, Download, GraduationCap,
  ExternalLink, Infinity as InfinityIcon, PlayCircle, Share2, Smartphone,
} from "lucide-react"
import { supabase } from "../lib/supabaseClient"
import { useAuth } from "../context/AuthContext"
import SEO from "../components/SEO"
import WhatsAppOptInCard from "../components/WhatsAppOptInCard"
import JoinGroupCard from "../components/JoinGroupCard"
import { fetchMyCourseGroup } from "../lib/courseGroup"
import { alertDialog } from "../lib/dialog"
import CheckoutModal from "../components/CheckoutModal"
import ComingSoonPopup from "../components/ComingSoonPopup"
import { normalizePhone } from "../lib/tutorWhatsApp"
import { SUPPORT_WA_NUMBER, waLink } from "../lib/whatsappConfig"
import { courseApplicationLink, tutorApplicationLink } from "../lib/courseAvailability"
import "../styles/courses-ui.css"

function initials(name) {
  const parts = `${name || ""}`.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  return parts.length ? parts.map((part) => part[0].toUpperCase()).join("") : "PC"
}

// Outcomes / prerequisites may be stored as an array or as text with one item per line.
function toList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean)
  return String(value || "")
    .split(/\r?\n|•|;/)
    .map((item) => item.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean)
}

function formatMinutes(total) {
  const minutes = Math.round(Number(total) || 0)
  if (minutes <= 0) return null
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

export default function CourseDetail() {
  const { id } = useParams()
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [instructor, setInstructor] = useState(null)
  const [modules, setModules] = useState([])
  const [completedIds, setCompletedIds] = useState(new Set())
  const [enrolled, setEnrolled] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [openMod, setOpenMod] = useState(0)
  const [loadError, setLoadError] = useState(null)
  const [bioExpanded, setBioExpanded] = useState(false)
  const [justEnrolled, setJustEnrolled] = useState(false)
  const [shareState, setShareState] = useState("")
  const [showComingSoon, setShowComingSoon] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        setLoadError(null)
        setBioExpanded(false)
        setInstructor(null)
        setEnrolled(false)
        setCompletedIds(new Set())

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        let query = supabase.from("courses").select("*")
        query = isUUID ? query.eq("id", id) : query.eq("slug", id)
        const { data: c, error: courseErr } = await query.maybeSingle()

        if (courseErr) {
          console.error("Course load error:", courseErr)
          setLoadError("This course could not be loaded. Please try again.")
          return
        }
        if (!c) {
          setLoadError("We could not find that course.")
          return
        }
        setCourse(c)

        // Outline only: lesson videos and content are never needed on this page.
        const [instructorResult, modulesResult, enrollmentResult, progressResult] = await Promise.all([
          c.instructor_id
            ? supabase.from("instructors").select("*").eq("id", c.instructor_id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          supabase.from("course_outline").select("id, title, description, order_index, duration_minutes").eq("course_id", c.id).order("order_index"),
          user?.id
            ? supabase.from("course_enrollments").select("id").eq("user_id", user.id).eq("course_id", c.id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          user?.id
            ? supabase.from("course_progress").select("module_id, completed").eq("user_id", user.id).eq("course_id", c.id)
            : Promise.resolve({ data: [], error: null }),
        ])

        if (instructorResult.error) console.error("Instructor load error:", instructorResult.error)
        else setInstructor(instructorResult.data || null)
        if (modulesResult.error) console.error("Modules error:", modulesResult.error)
        setModules(modulesResult.data || [])
        if (enrollmentResult.error) console.error("Enrollment check error:", enrollmentResult.error)
        else if (enrollmentResult.data) setEnrolled(true)
        if (!progressResult.error) setCompletedIds(new Set((progressResult.data || []).filter((row) => row.completed).map((row) => row.module_id)))
      } catch (err) {
        console.error("Unexpected error:", err)
        setLoadError("This course could not be loaded. Please try again.")
      }
    }
    if (id) load()
  }, [id, user?.id])

  const isPaidCourse = Boolean(course) && !course.is_free && Number(course.price) > 0
  const hasModules = modules.length > 0
  const isComingSoon = !hasModules
  const totalMinutes = modules.reduce((sum, mod) => sum + (Number(mod.duration_minutes) || 0), 0)
  const totalTime = formatMinutes(totalMinutes)
  const cpd = Number(course?.cpd_hours || 0)
  const outcomes = toList(course?.learning_outcomes)
  const prerequisites = toList(course?.prerequisites)
  const learnItems = outcomes.length ? outcomes : modules.map((mod) => mod.title).filter(Boolean).slice(0, 8)
  const doneCount = modules.filter((mod) => completedIds.has(mod.id)).length
  const progressPct = hasModules ? Math.round((doneCount / modules.length) * 100) : 0
  const nextModule = modules.find((mod) => !completedIds.has(mod.id)) || modules[0]
  const showBioToggle = `${instructor?.bio || ""}`.trim().length > 260
  const payNumber = normalizePhone(instructor?.whatsapp_number) || SUPPORT_WA_NUMBER
  const payLink = course
    ? waLink(`Hi, I want to enroll in "${course.title}" (KES ${course.price}). My account email is ${user?.email || "(not signed in)"}.`, payNumber)
    : ""
  // Courses without lessons still show their normal price; enrolling opens the "coming soon" pop-up.
  const showsApplication = isComingSoon && Boolean(course?.is_available)
  const priceLabel = showsApplication ? "Coming soon" : isPaidCourse ? `KES ${Number(course?.price || 0).toLocaleString("en-KE")}` : "Free"

  async function handleEnroll() {
    if (!user) {
      navigate("/register")
      return
    }
    // Paid courses cannot be self-enrolled; the database blocks it too. This just gives a clear message.
    if (isPaidCourse && !isAdmin) {
      setShowCheckout(true)
      return
    }
    setEnrolling(true)
    const { error } = await supabase.from("course_enrollments").insert({ user_id: user.id, course_id: course.id, status: "enrolled" })
    if (error) {
      console.error("Enroll error:", error)
      setEnrolling(false)
      await alertDialog("Enrolment failed", error.code === "P0001" || /payment/i.test(error.message || "")
        ? "This course needs payment before enrolment."
        : "We could not enrol you right now. Please try again.")
      return
    }
    setEnrolled(true)
    setEnrolling(false)
    // Show the class-group invite first. No group set up for this course: straight to lesson 1.
    let hasGroup = false
    try { hasGroup = Boolean((await fetchMyCourseGroup(course.id))?.invite_url) } catch { hasGroup = false }
    if (hasGroup) {
      setJustEnrolled(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else if (modules.length > 0) {
      navigate(`/learn/${course.id}/${modules[0].id}`)
    }
  }

  function startLearning() {
    if (nextModule) navigate(`/learn/${course.id}/${nextModule.id}`)
  }

  async function shareCourse() {
    const url = `${window.location.origin}/courses/${course.slug || course.id}`
    try {
      if (navigator.share) {
        await navigator.share({ title: course.title, text: course.short_desc || course.title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setShareState("Link copied")
      window.setTimeout(() => setShareState(""), 2000)
    } catch {
      /* the person closed the share sheet */
    }
  }

  if (loadError) {
    return (
      <div className="pc-page">
        <div className="pc-wrap" style={{ paddingTop: "3rem" }}>
          <div className="pc-empty">
            <h2>{loadError}</h2>
            <Link to="/courses" className="btn btn-primary">Browse courses</Link>
          </div>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="pc-page">
        <section className="pcd-hero"><div className="pc-wrap" style={{ minHeight: 220 }} aria-busy="true" /></section>
        <div className="pc-wrap pcd-body"><div className="pc-skeleton" style={{ height: 320 }}><div style={{ height: "100%" }} /></div></div>
      </div>
    )
  }

  // The main call to action, shared by the sidebar card and the phone bottom bar.
  function renderPrimaryAction(compact = false) {
    if (enrolled) {
      return (
        <button type="button" className="btn btn-primary" onClick={startLearning} disabled={!hasModules}>
          <PlayCircle size={18} aria-hidden="true" /> {doneCount > 0 ? (compact ? "Resume" : "Resume learning") : (compact ? "Start" : "Start learning")}
        </button>
      )
    }
    if (isAdmin && hasModules) return <Link to={`/learn/${course.id}/${modules[0].id}`} className="btn btn-primary">Preview course</Link>
    if (showsApplication) {
      return <a href={courseApplicationLink({ ...course, whatsapp_number: course.whatsapp_number || instructor?.whatsapp_number }, user?.email)} target="_blank" rel="noreferrer noopener" className="btn btn-primary">Apply to enrol</a>
    }
    if (isComingSoon) {
      const label = isPaidCourse
        ? (user ? (compact ? "Buy now" : `Buy now · ${priceLabel}`) : "Sign in to buy")
        : user ? (compact ? "Enrol free" : "Enrol for free") : (compact ? "Register" : "Register to enrol")
      return <button type="button" className="btn btn-primary" onClick={() => setShowComingSoon(true)}>{label}</button>
    }
    if (isPaidCourse) {
      return (
        <button type="button" className="btn btn-primary" onClick={() => (user ? setShowCheckout(true) : navigate("/login"))}>
          {user ? (compact ? "Buy now" : `Buy now · ${priceLabel}`) : (compact ? "Sign in to buy" : "Sign in to buy")}
        </button>
      )
    }
    return (
      <button type="button" onClick={handleEnroll} disabled={enrolling} className="btn btn-primary">
        {enrolling ? "Enrolling…" : user ? (compact ? "Enrol free" : "Enrol for free") : (compact ? "Register" : "Register to enrol")}
      </button>
    )
  }

  return (
    <div className="pc-page pcd-page-pad">
      {showComingSoon ? (
        <ComingSoonPopup
          courseTitle={course.title}
          notifyHref={waLink(`Hi, please let me know when "${course.title}" opens for enrolment.${user?.email ? ` My account email is ${user.email}.` : ""}`, normalizePhone(course.whatsapp_number || instructor?.whatsapp_number) || SUPPORT_WA_NUMBER || "254790059584")}
          tutorHref={tutorApplicationLink({ ...course, whatsapp_number: course.whatsapp_number || instructor?.whatsapp_number })}
          onClose={() => setShowComingSoon(false)}
        />
      ) : null}
      {showCheckout && course ? (
        <CheckoutModal
          course={course}
          user={user}
          whatsappLink={payLink}
          onClose={() => setShowCheckout(false)}
          onPaid={() => setEnrolled(true)}
        />
      ) : null}
      <SEO
        title={course.title}
        description={course.short_desc || course.description || "Pharmacy course with practical lessons, downloadable resources, and a completion certificate."}
        path={`/courses/${course.slug || course.id}`}
        type="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Course",
          name: course.title,
          description: course.short_desc || course.description || "Pharmacy course with practical lessons and a certificate.",
          provider: { "@type": "Organization", name: "Pharmacourse", sameAs: "https://www.pharmacourse.co.ke" },
        }}
      />

      <section className="pcd-hero">
        <div className="pc-wrap pcd-hero-grid">
          <div>
            <nav className="pcd-crumbs" aria-label="Breadcrumb">
              <Link to="/courses">Courses</Link>
              {course.category ? <><ChevronRight size={14} aria-hidden="true" /><Link to={`/courses?category=${encodeURIComponent(course.category)}`}>{course.category}</Link></> : null}
            </nav>
            <h1>{course.title}</h1>
            {course.short_desc || course.description ? <p className="pcd-sub">{course.short_desc || course.description}</p> : null}
            <div className="pcd-hero-meta">
              {hasModules ? <span className="pcd-pill"><BookOpen size={15} aria-hidden="true" />{modules.length} {modules.length === 1 ? "module" : "modules"}</span> : null}
              {totalTime ? <span className="pcd-pill"><Clock size={15} aria-hidden="true" />{totalTime} of lessons</span> : null}
              {cpd > 0 ? <span className="pcd-pill"><Award size={15} aria-hidden="true" />{cpd} CPD {cpd === 1 ? "hour" : "hours"}</span> : null}
              {course.level ? <span className="pcd-pill"><GraduationCap size={15} aria-hidden="true" />{course.level}</span> : null}
              <span className="pcd-pill"><BadgeCheck size={15} aria-hidden="true" />Certificate</span>
            </div>
            {instructor ? (
              <div className="pcd-by">
                {instructor.photo_url ? <img src={instructor.photo_url} alt="" /> : <span className="pcd-avatar-sm" aria-hidden="true">{initials(instructor.name)}</span>}
                <span>Taught by <strong>{instructor.name}</strong>{instructor.title ? `, ${instructor.title}` : ""}</span>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="pc-wrap pcd-body">
        <div className="pcd-main">
          {justEnrolled ? (
            <JoinGroupCard courseId={course.id} highlight>
              <button type="button" className="btn btn-outline" onClick={startLearning} style={{ justifySelf: "start" }}>Continue to lesson 1</button>
            </JoinGroupCard>
          ) : null}

          {enrolled && hasModules ? (
            <section className="pcd-section" aria-label="Your progress">
              <div className="pcd-curr-head"><h2>Your progress</h2><span>{doneCount} of {modules.length} modules complete</span></div>
              <div style={{ height: 8, borderRadius: 999, background: "var(--gray-100)", overflow: "hidden" }} role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
                <div style={{ width: `${progressPct}%`, height: "100%", background: "linear-gradient(90deg, var(--green), #1d9e75)", borderRadius: 999 }} />
              </div>
              {progressPct === 100 ? (
                <Link to={`/certificate/${course.id}`} className="btn btn-outline" style={{ marginTop: "1rem" }}><BadgeCheck size={18} aria-hidden="true" />View your certificate</Link>
              ) : null}
            </section>
          ) : null}

          {learnItems.length ? (
            <section className="pcd-section">
              <h2>{outcomes.length ? "What you will learn" : "What this course covers"}</h2>
              <ul className="pcd-learn">
                {learnItems.map((item, index) => <li key={index}><Check size={18} aria-hidden="true" />{item}</li>)}
              </ul>
            </section>
          ) : null}

          <section className="pcd-section">
            <div className="pcd-curr-head">
              <h2>Course content</h2>
              {hasModules ? <span>{modules.length} {modules.length === 1 ? "module" : "modules"}{totalTime ? ` · ${totalTime}` : ""}</span> : null}
            </div>
            {hasModules ? (
              <div className="pcd-mods">
                {modules.map((mod, index) => {
                  const open = openMod === index
                  const time = formatMinutes(mod.duration_minutes)
                  const done = completedIds.has(mod.id)
                  return (
                    <div key={mod.id} className="pcd-mod" data-open={open}>
                      <button type="button" aria-expanded={open} onClick={() => setOpenMod(open ? null : index)}>
                        <span className="pcd-mod-num" aria-hidden="true">{done ? <Check size={15} /> : index + 1}</span>
                        <span className="pcd-mod-title">{mod.title}{done ? <span className="sr-only"> (completed)</span> : null}</span>
                        {time ? <span className="pcd-mod-time"><Clock size={14} aria-hidden="true" />{time}</span> : null}
                        <ChevronDown size={18} className="pcd-mod-chev" aria-hidden="true" />
                      </button>
                      {open ? <div className="pcd-mod-body">{mod.description || "Video lesson with downloadable notes."}</div> : null}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p>The lessons for this course are being prepared. {course.is_available ? "Applications are open now." : "Check back soon."}</p>
            )}
          </section>

          {prerequisites.length ? (
            <section className="pcd-section">
              <h2>Before you start</h2>
              <ul className="pcd-learn">{prerequisites.map((item, index) => <li key={index}><Check size={18} aria-hidden="true" />{item}</li>)}</ul>
            </section>
          ) : null}

          {course.description && course.short_desc ? (
            <section className="pcd-section">
              <h2>About this course</h2>
              <p>{course.description}</p>
            </section>
          ) : null}

          {instructor ? (
            <section className="pcd-section">
              <h2>Your instructor</h2>
              <div className="pcd-instructor">
                {instructor.photo_url ? <img src={instructor.photo_url} alt={instructor.name} /> : <div className="pcd-avatar" aria-hidden="true">{initials(instructor.name)}</div>}
                <div style={{ minWidth: 0 }}>
                  <h3>{instructor.name}</h3>
                  {instructor.title ? <p className="pcd-role">{instructor.title}</p> : null}
                  <div className={`pcd-bio${showBioToggle && !bioExpanded ? " is-clamped" : ""}`}>
                    {instructor.bio || "Experienced pharmacy educator and industry practitioner."}
                  </div>
                  <div className="pcd-tags">
                    {instructor.years_experience ? <span className="pcd-tag">{instructor.years_experience}+ years experience</span> : null}
                    {instructor.specialization ? <span className="pcd-tag">{instructor.specialization}</span> : null}
                  </div>
                  <div style={{ display: "flex", gap: "0.8rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
                    {showBioToggle ? <button type="button" className="pc-link-btn" onClick={() => setBioExpanded((value) => !value)}>{bioExpanded ? "Show less" : "Read more"}</button> : null}
                    {instructor.linkedin_url ? <a href={instructor.linkedin_url} target="_blank" rel="noreferrer noopener" className="pc-link-btn" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><ExternalLink size={15} aria-hidden="true" />LinkedIn</a> : null}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <WhatsAppOptInCard course={course} instructor={instructor} enrolled={enrolled || isAdmin} />
        </div>

        <aside className="pcd-buy" aria-label="Enrol">
          <div className="pcd-buy-card">
            <div className="pcd-buy-media">
              {course.image_url ? <img src={course.image_url} alt="" /> : (
                <div className="pc-card-art" style={{ background: "linear-gradient(135deg, #0f6e56, #1d9e75)" }} aria-hidden="true"><span>{course.category || "Pharmacy"}</span></div>
              )}
            </div>
            <div className="pcd-buy-inner">
              <div className={`pcd-buy-price${!isPaidCourse && !showsApplication ? " is-free" : ""}`}>{priceLabel}</div>
              {renderPrimaryAction()}
              {!enrolled && isAdmin && hasModules ? <Link to={`/certificate/${course.id}`} className="btn btn-outline">Preview certificate</Link> : null}
              {!enrolled ? (
                <a href={tutorApplicationLink({ ...course, whatsapp_number: course.whatsapp_number || instructor?.whatsapp_number })} target="_blank" rel="noreferrer noopener" className="btn btn-outline">Apply as tutor</a>
              ) : null}
              {!enrolled && isPaidCourse && !isComingSoon && !user ? <Link to="/register" className="btn btn-outline">Create your account first</Link> : null}
              {!enrolled ? (
                <p className="pcd-buy-note">
                  {isComingSoon
                    ? (course.is_available ? "Send an application on WhatsApp and we will confirm the next steps." : "New course: the lessons are being prepared.")
                    : isPaidCourse ? "Pay by M-Pesa, card or bank. Access starts as soon as your payment is confirmed." : "Free to join. Start the first lesson right away."}
                </p>
              ) : null}
              <ul className="pcd-includes">
                <li><Smartphone size={17} aria-hidden="true" />Learn on your phone, at your pace</li>
                {totalTime ? <li><PlayCircle size={17} aria-hidden="true" />{totalTime} of video lessons</li> : null}
                <li><Download size={17} aria-hidden="true" />Downloadable notes and resources</li>
                {cpd > 0 ? <li><Award size={17} aria-hidden="true" />{cpd} CPD {cpd === 1 ? "hour" : "hours"}</li> : null}
                <li><BadgeCheck size={17} aria-hidden="true" />Verifiable certificate on completion</li>
                <li><InfinityIcon size={17} aria-hidden="true" />Lifetime access</li>
              </ul>
              <div className="pcd-share">
                <button type="button" className="pc-link-btn" onClick={shareCourse} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Share2 size={16} aria-hidden="true" />{shareState || "Share this course"}
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="pcd-mobile-cta">
        <span className={`pc-price${!isPaidCourse && !showsApplication ? " is-free" : ""}`}>{enrolled ? `${progressPct}% done` : priceLabel}</span>
        {renderPrimaryAction(true)}
      </div>
    </div>
  )
}
