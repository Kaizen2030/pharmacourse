import { useEffect, useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { useAuth } from "../context/AuthContext"
import SEO from "../components/SEO"

export default function CourseDetail() {
  const { id } = useParams()
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [modules, setModules] = useState([])
  const [enrolled, setEnrolled] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [openMod, setOpenMod] = useState(null)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        setLoadError(null)

        // Try loading by UUID first, then fall back to slug
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

        // Load modules
        const { data: mods, error: modsErr } = await supabase
          .from("course_modules")
          .select("*")
          .eq("course_id", c.id)
          .order("order_index")

        if (modsErr) console.error("Modules error:", modsErr)
        setModules(mods || [])

        // Check enrollment
        if (user?.id) {
          const { data: e, error: enrollErr } = await supabase
            .from("course_enrollments")
            .select("id")
            .eq("user_id", user.id)
            .eq("course_id", c.id)
            .maybeSingle()

          if (enrollErr) {
            console.error("Enrollment check error:", enrollErr)
          } else if (e) {
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
    if (!user) { navigate("/register"); return }
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

  if (loadError) return (
    <div className="page" style={{ color: "var(--text-500)", textAlign: "center", paddingTop: "4rem" }}>
      <p style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>⚠️ {loadError}</p>
      <Link to="/courses" className="btn btn-primary">Back to Courses</Link>
    </div>
  )

  if (!course) return (
    <div className="page" style={{ color: "var(--text-500)" }}>Loading…</div>
  )

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
            name: "PharmaCourse",
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

          <p className="modules-title">Course Curriculum</p>
          {modules.map((mod, i) => (
            <div key={mod.id} className="module">
              <button className="module-header" onClick={() => setOpenMod(openMod === i ? null : i)}>
                <span>{mod.title}</span>
                <span>{mod.duration ? `${mod.duration} min` : "TBD"} {openMod === i ? "▲" : "▼"}</span>
              </button>
              {openMod === i && (
                <div className="module-lessons">
                  <div className="lesson-row">
                    <span>📹 {mod.title}</span>
                    {mod.duration && <span>{mod.duration} min</span>}
                  </div>
                  {mod.description && (
                    <div style={{ padding: "0.5rem 1rem", color: "var(--text-500)", fontSize: "0.9rem", borderTop: "1px solid var(--border)", marginTop: "0.5rem" }}>
                      {mod.description}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <aside className="detail-sidebar">
          <div className="sidebar-card">
            <div className="sidebar-thumb">
              {course.image_url
                ? <img src={course.image_url} alt={course.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : "🧬"}
            </div>
            <p className="sidebar-price">{course.is_free ? "Free" : `KES ${course.price}`}</p>
            {enrolled ? (
              <Link to={`/learn/${course.id}/${modules[0]?.id}`} className="btn btn-primary" style={{ width: "100%", marginBottom: "1rem" }}>
                Continue Learning →
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
                {enrolling ? "Enrolling…" : user ? "Enroll Now — Free" : "Register to Enroll"}
              </button>
            )}
            <ul className="sidebar-includes">
              <li>✅ Self-paced — learn anytime</li>
              <li>✅ Downloadable PDF resources</li>
              <li>✅ Certificate on completion</li>
              <li>✅ Lifetime access</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
