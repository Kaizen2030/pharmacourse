import { useEffect, useMemo, useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { useAuth } from "../context/AuthContext"
import SEO from "../components/SEO"

const WHATSAPP_TIPS_LINK = "https://wa.me/254790059584?text=Hi%20Julius%2C%20subscribe%20me%20to%20daily%20pharmacy%20tips."

function getInstructorInitials(name) {
  const parts = `${name || ""}`
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)

  if (parts.length === 0) return "PC"
  return parts.map((part) => part[0].toUpperCase()).join("")
}

export default function CourseDetail() {
  const { id } = useParams()
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [instructor, setInstructor] = useState(null)
  const [modules, setModules] = useState([])
  const [enrolled, setEnrolled] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [openMod, setOpenMod] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [bioExpanded, setBioExpanded] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        setLoadError(null)
        setBioExpanded(false)
        setInstructor(null)
        setEnrolled(false)

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

        let query = supabase.from("courses").select("*")
        query = isUUID ? query.eq("id", id) : query.eq("slug", id)

        const { data: c, error: courseErr } = await query.maybeSingle()

        if (courseErr) {
          console.error("Course load error:", courseErr)
          setLoadError(courseErr.message)
          return
        }

        if (!c) {
          setLoadError("Course not found.")
          return
        }

        setCourse(c)

        if (c.instructor_id) {
          const { data: instructorData, error: instructorErr } = await supabase
            .from("instructors")
            .select("*")
            .eq("id", c.instructor_id)
            .maybeSingle()

          if (instructorErr) {
            console.error("Instructor load error:", instructorErr)
          } else {
            setInstructor(instructorData || null)
          }
        }

        const { data: mods, error: modsErr } = await supabase
          .from("course_modules")
          .select("*")
          .eq("course_id", c.id)
          .order("order_index")

        if (modsErr) console.error("Modules error:", modsErr)
        setModules(mods || [])

        if (user?.id) {
          const { data: enrollmentData, error: enrollErr } = await supabase
            .from("course_enrollments")
            .select("id")
            .eq("user_id", user.id)
            .eq("course_id", c.id)
            .maybeSingle()

          if (enrollErr) {
            console.error("Enrollment check error:", enrollErr)
          } else if (enrollmentData) {
            setEnrolled(true)
          }
        }
      } catch (err) {
        console.error("Unexpected error:", err)
        setLoadError(err.message)
      }
    }

    if (id) load()
  }, [id, user?.id])

  async function handleEnroll() {
    if (!user) {
      navigate("/register")
      return
    }

    setEnrolling(true)

    const { error } = await supabase
      .from("course_enrollments")
      .insert({ user_id: user.id, course_id: course.id, status: "enrolled" })

    if (error) {
      console.error("Enroll error:", error)
      alert(`Enrollment failed: ${error.message}\n\nCode: ${error.code}`)
      setEnrolling(false)
      return
    }

    setEnrolled(true)
    setEnrolling(false)

    if (modules.length > 0) {
      navigate(`/learn/${course.id}/${modules[0].id}`)
    }
  }

  const shouldShowBioToggle = useMemo(() => {
    return `${instructor?.bio || ""}`.trim().length > 180
  }, [instructor?.bio])

  if (loadError) {
    return (
      <div className="page" style={{ color: "var(--text-500)", textAlign: "center", paddingTop: "4rem" }}>
        <p style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>Warning: {loadError}</p>
        <Link to="/courses" className="btn btn-primary">Back to Courses</Link>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="page" style={{ color: "var(--text-500)" }}>Loading...</div>
    )
  }

  return (
    <div className="page">
      <SEO
        title={course.title}
        description={
          course.short_desc ||
          course.description ||
          "Pharmacy course with practical lessons, downloadable resources, and a completion certificate."
        }
        path={`/courses/${course.slug || course.id}`}
        type="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Course",
          name: course.title,
          description:
            course.short_desc ||
            course.description ||
            "Pharmacy course with practical lessons and a certificate.",
          provider: {
            "@type": "Organization",
            name: "RemedacarePOS",
            sameAs: "https://www.pharmacourse.co.ke",
          },
        }}
      />

      <div className="detail-layout">
        <div className="detail-main">
          <span className="detail-badge">{course.category}</span>
          <h1>{course.title}</h1>
          <p>{course.description}</p>

          <div className="detail-stats">
            <div className="detail-stat"><strong>{modules.length}</strong> modules</div>
            <div className="detail-stat"><strong>{modules.length}</strong> lessons</div>
            <div className="detail-stat"><strong>{course.is_free ? "Free" : `KES ${course.price}`}</strong></div>
          </div>

          {instructor ? (
            <section className="detail-instructor-card">
              <div className="detail-instructor-header">
                {instructor.photo_url ? (
                  <img
                    src={instructor.photo_url}
                    alt={instructor.name}
                    className="detail-instructor-photo"
                  />
                ) : (
                  <div className="detail-instructor-avatar" aria-label={instructor.name}>
                    {getInstructorInitials(instructor.name)}
                  </div>
                )}

                <div className="detail-instructor-copy">
                  <div className="detail-instructor-topline">
                    <div>
                      <h2>{instructor.name}</h2>
                      <p className="detail-instructor-title">{instructor.title}</p>
                    </div>
                    {instructor.specialization ? (
                      <span className="detail-instructor-specialization">{instructor.specialization}</span>
                    ) : null}
                  </div>

                  <div className={`detail-instructor-bio${bioExpanded ? " expanded" : ""}`}>
                    {instructor.bio || "Experienced pharmacy educator and industry practitioner."}
                  </div>

                  <div className="detail-instructor-actions">
                    {shouldShowBioToggle ? (
                      <button
                        type="button"
                        className="detail-instructor-link"
                        onClick={() => setBioExpanded((current) => !current)}
                      >
                        {bioExpanded ? "Show less" : "Read more"}
                      </button>
                    ) : null}

                    {instructor.linkedin_url ? (
                      <a
                        href={instructor.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="detail-instructor-link"
                      >
                        LinkedIn
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="detail-instructor-meta">
                {instructor.years_experience ? (
                  <span>{instructor.years_experience}+ years experience</span>
                ) : null}
                {instructor.specialization ? <span>{instructor.specialization}</span> : null}
              </div>
            </section>
          ) : null}

          <p className="modules-title">Course Curriculum</p>
          {modules.map((mod, index) => (
            <div key={mod.id} className="module">
              <button className="module-header" onClick={() => setOpenMod(openMod === index ? null : index)}>
                <span>{mod.title}</span>
                <span>{mod.duration ? `${mod.duration} min` : "TBD"} {openMod === index ? "▲" : "▼"}</span>
              </button>
              {openMod === index && (
                <div className="module-lessons">
                  <div className="lesson-row">
                    <span>Video {mod.title}</span>
                    {mod.duration && <span>{mod.duration} min</span>}
                  </div>
                  {mod.description ? (
                    <div
                      style={{
                        padding: "0.5rem 1rem",
                        color: "var(--text-500)",
                        fontSize: "0.9rem",
                        borderTop: "1px solid var(--border)",
                        marginTop: "0.5rem",
                      }}
                    >
                      {mod.description}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}

          <div className="whatsapp-optin-card compact">
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
        </div>

        <aside className="detail-sidebar">
          <div className="sidebar-card">
            <div className="sidebar-thumb">
              {course.image_url ? (
                <img src={course.image_url} alt={course.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                "Course"
              )}
            </div>
            <p className="sidebar-price">{course.is_free ? "Free" : `KES ${course.price}`}</p>
            {enrolled ? (
              <Link to={`/learn/${course.id}/${modules[0]?.id}`} className="btn btn-primary" style={{ width: "100%", marginBottom: "1rem" }}>
                Continue Learning
              </Link>
            ) : isAdmin && modules.length > 0 ? (
              <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1rem" }}>
                <Link to={`/learn/${course.id}/${modules[0].id}`} className="btn btn-primary" style={{ width: "100%" }}>
                  Preview Course
                </Link>
                <Link to={`/certificate/${course.id}`} className="btn btn-outline" style={{ width: "100%" }}>
                  Preview Certificate
                </Link>
              </div>
            ) : (
              <button onClick={handleEnroll} disabled={enrolling} className="btn btn-primary" style={{ width: "100%", marginBottom: "1rem" }}>
                {enrolling ? "Enrolling..." : user ? "Enroll Now - Free" : "Register to Enroll"}
              </button>
            )}
            <ul className="sidebar-includes">
              <li>Self-paced - learn anytime</li>
              <li>Downloadable PDF resources</li>
              <li>Certificate on completion</li>
              <li>Lifetime access</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
