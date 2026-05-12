# PharmaCourse — Full Screen Setup Script
# Run this from INSIDE your pharmcourse folder in VS Code terminal (PowerShell)
# Right-click the terminal tab > select PowerShell if needed

# ── Core config files ──────────────────────────────────────────

Set-Content vite.config.js @'
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
'@

Set-Content src/index.css @'
@import "tailwindcss";

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --green:       #1A6B4A;
  --green-dark:  #0F4A33;
  --green-light: #E8F5EE;
  --green-mid:   #C6E6D4;
  --text-900:    #111827;
  --text-500:    #6B7280;
  --border:      #E5E7EB;
  --bg:          #F9FAFB;
  --white:       #FFFFFF;
  --error:       #DC2626;
  --success:     #16A34A;
}

body {
  font-family: "Inter", sans-serif;
  background: var(--bg);
  color: var(--text-900);
  font-size: 15px;
  line-height: 1.6;
}

h1, h2, h3 {
  font-family: "DM Serif Display", serif;
  line-height: 1.25;
}

a { color: inherit; text-decoration: none; }

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: .4rem;
  padding: .55rem 1.25rem;
  border-radius: 8px;
  font-size: .9rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: background .18s, opacity .18s;
}
.btn-primary { background: var(--green); color: #fff; }
.btn-primary:hover { background: var(--green-dark); }
.btn-outline { background: transparent; border: 1.5px solid var(--border); color: var(--text-900); }
.btn-outline:hover { border-color: var(--green); color: var(--green); }

input, select, textarea {
  width: 100%;
  padding: .6rem .85rem;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  font-size: .9rem;
  font-family: inherit;
  background: var(--white);
  color: var(--text-900);
  transition: border-color .15s;
}
input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: var(--green);
}

.card {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.page { max-width: 1100px; margin: 0 auto; padding: 2.5rem 5%; }
.page-sm { max-width: 480px; margin: 0 auto; padding: 3rem 5%; }

.label { font-size: .82rem; font-weight: 600; color: var(--text-500); margin-bottom: .3rem; display: block; letter-spacing: .03em; text-transform: uppercase; }
.error-msg { color: var(--error); font-size: .82rem; margin-top: .3rem; }

.badge {
  display: inline-block;
  padding: .2rem .65rem;
  border-radius: 99px;
  font-size: .75rem;
  font-weight: 600;
  background: var(--green-light);
  color: var(--green-dark);
}

.progress-bar-bg {
  background: var(--border);
  border-radius: 99px;
  height: 6px;
  overflow: hidden;
}
.progress-bar-fill {
  background: var(--green);
  height: 100%;
  border-radius: 99px;
  transition: width .4s ease;
}
'@

# Update index.html head
(Get-Content index.html) -replace '<title>.*</title>',
  '<title>PharmaCourse</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>' |
  Set-Content index.html

# ── src/lib/supabaseClient.js ──────────────────────────────────

Set-Content src/lib/supabaseClient.js @'
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
'@

# ── src/context/AuthContext.jsx ────────────────────────────────

Set-Content src/context/AuthContext.jsx @'
import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single()
    setProfile(data)
    setLoading(false)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin: profile?.role === "admin" }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
'@

# ── src/main.jsx ───────────────────────────────────────────────

Set-Content src/main.jsx @'
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App"

createRoot(document.getElementById("root")).render(
  <StrictMode><App /></StrictMode>
)
'@

# ── src/App.jsx ────────────────────────────────────────────────

Set-Content src/App.jsx @'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import Home from "./pages/Home"
import Courses from "./pages/Courses"
import CourseDetail from "./pages/CourseDetail"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Dashboard from "./pages/Dashboard"
import CoursePlayer from "./pages/CoursePlayer"
import Certificate from "./pages/Certificate"
import AdminDashboard from "./pages/admin/AdminDashboard"
import CourseForm from "./pages/admin/CourseForm"

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  return user ? children : <Navigate to="/login" />
}

function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth()
  if (loading) return <Spinner />
  return isAdmin ? children : <Navigate to="/" />
}

function Spinner() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh" }}>
      <div style={{ width:32, height:32, border:"3px solid var(--border)", borderTopColor:"var(--green)",
        borderRadius:"50%", animation:"spin .7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function AppRoutes() {
  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh" }}>
      <Navbar />
      <main style={{ flex:1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:slug" element={<CourseDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/learn/:courseId/:lessonId" element={<PrivateRoute><CoursePlayer /></PrivateRoute>} />
          <Route path="/certificate/:courseId" element={<PrivateRoute><Certificate /></PrivateRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/courses/new" element={<AdminRoute><CourseForm /></AdminRoute>} />
          <Route path="/admin/courses/:id/edit" element={<AdminRoute><CourseForm /></AdminRoute>} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
'@

# ── src/components/Navbar.jsx ─────────────────────────────────

Set-Content src/components/Navbar.jsx @'
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { supabase } from "../lib/supabaseClient"

export default function Navbar() {
  const { user, profile, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate("/")
  }

  const linkStyle = (path) => ({
    color: isActive(path) ? "var(--green)" : "var(--text-500)",
    fontWeight: isActive(path) ? 600 : 500,
    fontSize: ".9rem",
    transition: "color .15s",
  })

  return (
    <nav style={{
      background:"var(--white)", borderBottom:"1px solid var(--border)",
      position:"sticky", top:0, zIndex:100,
      padding:"0 5%", display:"flex", alignItems:"center",
      justifyContent:"space-between", height:"62px",
    }}>
      <Link to="/" style={{ fontFamily:"'DM Serif Display', serif", fontSize:"1.4rem", color:"var(--green)" }}>
        PharmaCourse
      </Link>

      <div style={{ display:"flex", alignItems:"center", gap:"2rem" }}>
        <Link to="/courses" style={linkStyle("/courses")}>Explore</Link>

        {user ? (
          <>
            <Link to="/dashboard" style={linkStyle("/dashboard")}>My Learning</Link>
            {isAdmin && <Link to="/admin" style={{ ...linkStyle("/admin"), color:"var(--green)" }}>Admin</Link>}
            <div style={{ display:"flex", alignItems:"center", gap:".75rem" }}>
              <span style={{ fontSize:".82rem", color:"var(--text-500)" }}>
                {profile?.full_name?.split(" ")[0]}
              </span>
              <button onClick={handleLogout} className="btn btn-outline" style={{ padding:".35rem .9rem", fontSize:".82rem" }}>
                Sign Out
              </button>
            </div>
          </>
        ) : (
          <div style={{ display:"flex", gap:".75rem" }}>
            <Link to="/login" className="btn btn-outline" style={{ padding:".38rem .9rem", fontSize:".85rem" }}>Sign In</Link>
            <Link to="/register" className="btn btn-primary" style={{ padding:".38rem .9rem", fontSize:".85rem" }}>Register</Link>
          </div>
        )}
      </div>
    </nav>
  )
}
'@

# ── src/components/Footer.jsx ─────────────────────────────────

Set-Content src/components/Footer.jsx @'
import { Link } from "react-router-dom"

export default function Footer() {
  return (
    <footer style={{ background:"var(--white)", borderTop:"1px solid var(--border)", padding:"2rem 5%", marginTop:"auto" }}>
      <div style={{ maxWidth:1100, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"1rem" }}>
        <span style={{ fontFamily:"'DM Serif Display',serif", color:"var(--green)", fontSize:"1.1rem" }}>PharmaCourse</span>
        <div style={{ display:"flex", gap:"1.5rem" }}>
          <Link to="/courses" style={{ color:"var(--text-500)", fontSize:" .85rem" }}>Explore</Link>
          <Link to="/login" style={{ color:"var(--text-500)", fontSize:" .85rem" }}>Sign In</Link>
        </div>
        <p style={{ color:"var(--text-500)", fontSize:" .8rem" }}>© 2026 PharmaCourse. All rights reserved.</p>
      </div>
    </footer>
  )
}
'@

# ── src/components/CourseCard.jsx ─────────────────────────────

Set-Content src/components/CourseCard.jsx @'
import { Link } from "react-router-dom"

export default function CourseCard({ course }) {
  return (
    <div className="card" style={{ transition:"box-shadow .2s", cursor:"pointer" }}
      onMouseEnter={e => e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,.08)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow="none"}>
      <div style={{ height:160, background:"var(--green-light)", overflow:"hidden" }}>
        {course.thumbnail_url
          ? <img src={course.thumbnail_url} alt={course.title} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          : <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"var(--green)", fontSize:"2.5rem" }}>🧬</div>
        }
      </div>
      <div style={{ padding:"1.2rem" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:" .5rem" }}>
          <span className="badge">{course.category || "Pharmacy"}</span>
          <span style={{ fontSize:" .8rem", color:"var(--text-500)" }}>{course.is_free ? "Free" : `$${course.price}`}</span>
        </div>
        <h3 style={{ fontSize:"1.05rem", marginBottom:" .4rem", lineHeight:1.3 }}>{course.title}</h3>
        <p style={{ color:"var(--text-500)", fontSize:" .85rem", marginBottom:"1rem", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
          {course.short_desc || course.description}
        </p>
        <Link to={`/courses/${course.slug}`} className="btn btn-primary" style={{ width:"100%", fontSize:" .85rem" }}>
          View Course →
        </Link>
      </div>
    </div>
  )
}
'@

# ── src/components/ProgressBar.jsx ────────────────────────────

Set-Content src/components/ProgressBar.jsx @'
export default function ProgressBar({ percent, label }) {
  return (
    <div>
      {label && (
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:" .3rem" }}>
          <span style={{ fontSize:" .82rem", color:"var(--text-500)" }}>{label}</span>
          <span style={{ fontSize:" .82rem", fontWeight:600, color:"var(--green)" }}>{percent}%</span>
        </div>
      )}
      <div className="progress-bar-bg">
        <div className="progress-bar-fill" style={{ width:`${percent}%` }} />
      </div>
    </div>
  )
}
'@

# ── src/pages/Home.jsx ─────────────────────────────────────────

Set-Content src/pages/Home.jsx @'
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import CourseCard from "../components/CourseCard"

const features = [
  { icon:"🎓", title:"Self-Paced Learning", desc:"Learn at your own speed. Pause, rewind, revisit any lesson whenever you need." },
  { icon:"📄", title:"Downloadable Resources", desc:"Every lesson includes PDF summaries and clinical case studies to keep." },
  { icon:"🏆", title:"CPD Certificates", desc:"Earn a verifiable certificate of completion to support your professional development." },
]

export default function Home() {
  const [courses, setCourses] = useState([])

  useEffect(() => {
    supabase.from("courses").select("*").eq("is_published", true).limit(3).then(({ data }) => {
      if (data) setCourses(data)
    })
  }, [])

  return (
    <div>
      {/* Hero */}
      <section style={{ background:"var(--green)", color:"#fff", padding:"5rem 5%", textAlign:"center" }}>
        <div style={{ maxWidth:680, margin:"0 auto" }}>
          <span className="badge" style={{ background:"rgba(255,255,255,.18)", color:"#fff", marginBottom:"1rem" }}>
            Built for Pharmacists
          </span>
          <h1 style={{ fontSize:"clamp(2rem,5vw,3rem)", marginBottom:"1rem", fontFamily:"'DM Serif Display',serif" }}>
            Professional Development,<br />At Your Own Pace
          </h1>
          <p style={{ fontSize:"1.05rem", opacity:.85, marginBottom:"2rem", lineHeight:1.7 }}>
            Evidence-based pharmacy courses with downloadable resources and CPD certificates.
            Start with Antimicrobial Resistance — more courses coming.
          </p>
          <div style={{ display:"flex", gap:"1rem", justifyContent:"center", flexWrap:"wrap" }}>
            <Link to="/courses" className="btn" style={{ background:"#fff", color:"var(--green)", padding:" .7rem 1.75rem", fontSize:"1rem" }}>
              Explore Courses →
            </Link>
            <Link to="/register" className="btn" style={{ background:"transparent", border:"2px solid rgba(255,255,255,.5)", color:"#fff", padding:" .7rem 1.75rem", fontSize:"1rem" }}>
              Create Free Account
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding:"4rem 5%", background:"var(--bg)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <h2 style={{ textAlign:"center", marginBottom:"2.5rem", fontSize:"1.8rem" }}>Why PharmaCourse?</h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:"1.5rem" }}>
            {features.map(f => (
              <div key={f.title} className="card" style={{ padding:"1.75rem", textAlign:"center" }}>
                <div style={{ fontSize:"2.5rem", marginBottom:"1rem" }}>{f.icon}</div>
                <h3 style={{ fontSize:"1.1rem", marginBottom:" .5rem" }}>{f.title}</h3>
                <p style={{ color:"var(--text-500)", fontSize:" .9rem", lineHeight:1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      {courses.length > 0 && (
        <section style={{ padding:"4rem 5%", background:"var(--white)" }}>
          <div style={{ maxWidth:1100, margin:"0 auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"2rem" }}>
              <h2 style={{ fontSize:"1.8rem" }}>Featured Courses</h2>
              <Link to="/courses" style={{ color:"var(--green)", fontWeight:600, fontSize:" .9rem" }}>View all →</Link>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:"1.5rem" }}>
              {courses.map(c => <CourseCard key={c.id} course={c} />)}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section style={{ padding:"4rem 5%", background:"var(--green-light)", textAlign:"center" }}>
        <div style={{ maxWidth:520, margin:"0 auto" }}>
          <h2 style={{ fontSize:"1.8rem", marginBottom:"1rem" }}>Ready to Start Learning?</h2>
          <p style={{ color:"var(--text-500)", marginBottom:"1.5rem" }}>
            Create a free account and enroll in the AMR course today.
          </p>
          <Link to="/register" className="btn btn-primary" style={{ padding:" .7rem 2rem", fontSize:"1rem" }}>
            Get Started — It's Free
          </Link>
        </div>
      </section>
    </div>
  )
}
'@

# ── src/pages/Courses.jsx ──────────────────────────────────────

Set-Content src/pages/Courses.jsx @'
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import CourseCard from "../components/CourseCard"

export default function Courses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from("courses").select("*").eq("is_published", true)
      .then(({ data }) => { setCourses(data || []); setLoading(false) })
  }, [])

  return (
    <div className="page">
      <div style={{ marginBottom:"2rem" }}>
        <h1 style={{ fontSize:"2rem", marginBottom:" .4rem" }}>Explore Courses</h1>
        <p style={{ color:"var(--text-500)" }}>Self-paced pharmacy courses with downloadable resources and certificates.</p>
      </div>

      {loading ? (
        <p style={{ color:"var(--text-500)" }}>Loading courses…</p>
      ) : courses.length === 0 ? (
        <div className="card" style={{ padding:"3rem", textAlign:"center" }}>
          <p style={{ color:"var(--text-500)" }}>No courses published yet. Check back soon.</p>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:"1.5rem" }}>
          {courses.map(c => <CourseCard key={c.id} course={c} />)}
        </div>
      )}
    </div>
  )
}
'@

# ── src/pages/CourseDetail.jsx ─────────────────────────────────

Set-Content src/pages/CourseDetail.jsx @'
import { useEffect, useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { useAuth } from "../context/AuthContext"

export default function CourseDetail() {
  const { slug } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [modules, setModules] = useState([])
  const [enrolled, setEnrolled] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [openMod, setOpenMod] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: c } = await supabase.from("courses").select("*").eq("slug", slug).single()
      if (!c) return
      setCourse(c)

      const { data: mods } = await supabase.from("modules").select("*, lessons(*)").eq("course_id", c.id).order("order_index")
      setModules(mods || [])

      if (user) {
        const { data: e } = await supabase.from("enrollments").select("id").eq("user_id", user.id).eq("course_id", c.id).single()
        setEnrolled(!!e)
      }
    }
    load()
  }, [slug, user])

  async function handleEnroll() {
    if (!user) { navigate("/register"); return }
    setEnrolling(true)
    await supabase.from("enrollments").insert({ user_id: user.id, course_id: course.id })
    setEnrolled(true)
    setEnrolling(false)
    // Navigate to first lesson
    const firstLesson = modules[0]?.lessons?.[0]
    if (firstLesson) navigate(`/learn/${course.id}/${firstLesson.id}`)
  }

  if (!course) return <div className="page" style={{ color:"var(--text-500)" }}>Loading…</div>

  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)

  return (
    <div className="page">
      <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:"2.5rem", alignItems:"start" }}>
        {/* Left */}
        <div>
          <span className="badge" style={{ marginBottom:"1rem" }}>{course.category}</span>
          <h1 style={{ fontSize:"2rem", marginBottom:"1rem" }}>{course.title}</h1>
          <p style={{ color:"var(--text-500)", lineHeight:1.8, marginBottom:"2rem" }}>{course.description}</p>

          <div style={{ display:"flex", gap:"1.5rem", marginBottom:"2rem", flexWrap:"wrap" }}>
            <span style={{ fontSize:" .85rem", color:"var(--text-500)" }}>📚 {modules.length} modules</span>
            <span style={{ fontSize:" .85rem", color:"var(--text-500)" }}>🎬 {totalLessons} lessons</span>
            <span style={{ fontSize:" .85rem", color:"var(--green)", fontWeight:600 }}>{course.is_free ? "Free" : `$${course.price}`}</span>
          </div>

          {/* Curriculum */}
          <h2 style={{ fontSize:"1.3rem", marginBottom:"1rem" }}>Curriculum</h2>
          {modules.map((mod, i) => (
            <div key={mod.id} className="card" style={{ marginBottom:" .75rem" }}>
              <button onClick={() => setOpenMod(openMod === i ? null : i)} style={{
                width:"100%", padding:"1rem 1.25rem", display:"flex", justifyContent:"space-between",
                alignItems:"center", background:"none", border:"none", cursor:"pointer", textAlign:"left",
              }}>
                <span style={{ fontWeight:600, fontSize:" .95rem" }}>{mod.title}</span>
                <span style={{ color:"var(--text-500)", fontSize:" .8rem" }}>
                  {mod.lessons?.length || 0} lessons {openMod === i ? "▲" : "▼"}
                </span>
              </button>
              {openMod === i && (
                <div style={{ borderTop:"1px solid var(--border)", padding:" .5rem 0" }}>
                  {(mod.lessons || []).sort((a,b) => a.order_index - b.order_index).map((lesson, li) => (
                    <div key={lesson.id} style={{ padding:" .6rem 1.25rem", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:" .88rem" }}>
                        {li < 2 ? "🔓 " : "🔒 "}{lesson.title}
                      </span>
                      {lesson.duration_secs > 0 && (
                        <span style={{ fontSize:" .78rem", color:"var(--text-500)" }}>
                          {Math.round(lesson.duration_secs / 60)} min
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right — sticky CTA card */}
        <div className="card" style={{ padding:"1.75rem", position:"sticky", top:"80px" }}>
          <div style={{ height:140, background:"var(--green-light)", borderRadius:8, marginBottom:"1.25rem", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"3rem" }}>
            {course.thumbnail_url ? <img src={course.thumbnail_url} style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:8 }} /> : "🧬"}
          </div>
          <p style={{ fontSize:"1.4rem", fontWeight:700, marginBottom:"1rem", color: course.is_free ? "var(--green)" : "var(--text-900)" }}>
            {course.is_free ? "Free" : `$${course.price}`}
          </p>
          {enrolled ? (
            <Link to={`/learn/${course.id}/${modules[0]?.lessons?.[0]?.id}`} className="btn btn-primary" style={{ width:"100%", marginBottom:" .75rem" }}>
              Continue Learning →
            </Link>
          ) : (
            <button onClick={handleEnroll} disabled={enrolling} className="btn btn-primary" style={{ width:"100%", marginBottom:" .75rem" }}>
              {enrolling ? "Enrolling…" : user ? "Enroll Now — Free" : "Register to Enroll"}
            </button>
          )}
          <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:" .5rem" }}>
            <li style={{ fontSize:" .82rem", color:"var(--text-500)" }}>✅ Self-paced — learn anytime</li>
            <li style={{ fontSize:" .82rem", color:"var(--text-500)" }}>✅ Downloadable PDF resources</li>
            <li style={{ fontSize:" .82rem", color:"var(--text-500)" }}>✅ Certificate on completion</li>
            <li style={{ fontSize:" .82rem", color:"var(--text-500)" }}>✅ Lifetime access</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
'@

# ── src/pages/Login.jsx ──────────────────────────────────────

Set-Content src/pages/Login.jsx @'
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError(""); setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message); setLoading(false) }
    else navigate("/dashboard")
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/dashboard` } })
  }

  return (
    <div className="page-sm">
      <h1 style={{ fontSize:"1.8rem", marginBottom:" .4rem", textAlign:"center" }}>Welcome back</h1>
      <p style={{ color:"var(--text-500)", textAlign:"center", marginBottom:"2rem", fontSize:" .9rem" }}>
        Sign in to continue your learning
      </p>

      <div className="card" style={{ padding:"2rem" }}>
        <button onClick={handleGoogle} className="btn btn-outline" style={{ width:"100%", marginBottom:"1.25rem" }}>
          <img src="https://www.google.com/favicon.ico" width={16} height={16} alt="" />
          Continue with Google
        </button>

        <div style={{ display:"flex", alignItems:"center", gap:"1rem", marginBottom:"1.25rem" }}>
          <hr style={{ flex:1, borderColor:"var(--border)" }} />
          <span style={{ fontSize:" .78rem", color:"var(--text-500)" }}>or</span>
          <hr style={{ flex:1, borderColor:"var(--border)" }} />
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom:"1rem" }}>
            <label className="label">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div style={{ marginBottom:"1.5rem" }}>
            <label className="label">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <p className="error-msg" style={{ marginBottom:"1rem" }}>{error}</p>}
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width:"100%" }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>

      <p style={{ textAlign:"center", marginTop:"1.5rem", fontSize:" .88rem", color:"var(--text-500)" }}>
        No account? <Link to="/register" style={{ color:"var(--green)", fontWeight:600 }}>Register free</Link>
      </p>
    </div>
  )
}
'@

# ── src/pages/Register.jsx ─────────────────────────────────────

Set-Content src/pages/Register.jsx @'
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name:"", professional_id:"", email:"", password:"", confirm:"" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }

  async function handleRegister(e) {
    e.preventDefault()
    setError("")
    if (form.password !== form.confirm) { setError("Passwords do not match."); return }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return }
    setLoading(true)

    const { error: err } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.full_name, professional_id: form.professional_id } }
    })

    if (err) { setError(err.message); setLoading(false) }
    else setDone(true)
  }

  if (done) return (
    <div className="page-sm" style={{ textAlign:"center" }}>
      <div style={{ fontSize:"3rem", marginBottom:"1rem" }}>📬</div>
      <h1 style={{ fontSize:"1.6rem", marginBottom:" .5rem" }}>Check your email</h1>
      <p style={{ color:"var(--text-500)", lineHeight:1.7 }}>
        We sent a confirmation link to <strong>{form.email}</strong>.<br />
        Click it to activate your account, then sign in.
      </p>
      <Link to="/login" className="btn btn-primary" style={{ marginTop:"1.5rem" }}>Go to Sign In</Link>
    </div>
  )

  return (
    <div className="page-sm">
      <h1 style={{ fontSize:"1.8rem", marginBottom:" .4rem", textAlign:"center" }}>Create your account</h1>
      <p style={{ color:"var(--text-500)", textAlign:"center", marginBottom:"2rem", fontSize:" .9rem" }}>Free access to pharmacy CPD courses</p>

      <div className="card" style={{ padding:"2rem" }}>
        <form onSubmit={handleRegister}>
          <div style={{ marginBottom:"1rem" }}>
            <label className="label">Full Name</label>
            <input value={form.full_name} onChange={set("full_name")} placeholder="Dr. Jane Mwangi" required />
          </div>
          <div style={{ marginBottom:"1rem" }}>
            <label className="label">Pharmacy License / Professional ID</label>
            <input value={form.professional_id} onChange={set("professional_id")} placeholder="e.g. PPB-12345" />
            <p style={{ fontSize:" .78rem", color:"var(--text-500)", marginTop:" .3rem" }}>This appears on your certificate. Not verified.</p>
          </div>
          <div style={{ marginBottom:"1rem" }}>
            <label className="label">Email Address</label>
            <input type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" required />
          </div>
          <div style={{ marginBottom:"1rem" }}>
            <label className="label">Password</label>
            <input type="password" value={form.password} onChange={set("password")} placeholder="At least 8 characters" required />
          </div>
          <div style={{ marginBottom:"1.5rem" }}>
            <label className="label">Confirm Password</label>
            <input type="password" value={form.confirm} onChange={set("confirm")} placeholder="Repeat password" required />
          </div>
          {error && <p className="error-msg" style={{ marginBottom:"1rem" }}>{error}</p>}
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width:"100%" }}>
            {loading ? "Creating account…" : "Create Free Account"}
          </button>
        </form>
      </div>

      <p style={{ textAlign:"center", marginTop:"1.5rem", fontSize:" .88rem", color:"var(--text-500)" }}>
        Already registered? <Link to="/login" style={{ color:"var(--green)", fontWeight:600 }}>Sign in</Link>
      </p>
    </div>
  )
}
'@

# ── src/pages/Dashboard.jsx ────────────────────────────────────

Set-Content src/pages/Dashboard.jsx @'
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { useAuth } from "../context/AuthContext"
import ProgressBar from "../components/ProgressBar"

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [enrollments, setEnrollments] = useState([])
  const [progress, setProgress] = useState({})
  const [certificates, setCertificates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      const { data: enr } = await supabase
        .from("enrollments").select("*, courses(*)")
        .eq("user_id", user.id)

      const { data: prog } = await supabase
        .from("user_course_progress").select("*")
        .eq("user_id", user.id)

      const { data: certs } = await supabase
        .from("certificates").select("*, courses(title)")
        .eq("user_id", user.id)

      setEnrollments(enr || [])
      const pMap = {}
      ;(prog || []).forEach(p => { pMap[p.course_id] = p })
      setProgress(pMap)
      setCertificates(certs || [])
      setLoading(false)
    }
    load()
  }, [user])

  if (loading) return <div className="page" style={{ color:"var(--text-500)" }}>Loading…</div>

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom:"2rem" }}>
        <h1 style={{ fontSize:"2rem", marginBottom:" .3rem" }}>My Learning</h1>
        <p style={{ color:"var(--text-500)" }}>Welcome back, {profile?.full_name?.split(" ")[0] || "Pharmacist"}</p>
      </div>

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:"1rem", marginBottom:"2.5rem" }}>
        {[
          { label:"Enrolled", value:enrollments.length, icon:"📚" },
          { label:"Certificates", value:certificates.length, icon:"🏆" },
          { label:"In Progress", value: enrollments.filter(e => !e.completed_at).length, icon:"⏳" },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding:"1.25rem", display:"flex", alignItems:"center", gap:"1rem" }}>
            <span style={{ fontSize:"1.75rem" }}>{s.icon}</span>
            <div>
              <p style={{ fontSize:"1.5rem", fontWeight:700, lineHeight:1 }}>{s.value}</p>
              <p style={{ fontSize:" .82rem", color:"var(--text-500)" }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Enrolled Courses */}
      <h2 style={{ fontSize:"1.3rem", marginBottom:"1rem" }}>My Courses</h2>
      {enrollments.length === 0 ? (
        <div className="card" style={{ padding:"2.5rem", textAlign:"center" }}>
          <p style={{ color:"var(--text-500)", marginBottom:"1rem" }}>You have not enrolled in any courses yet.</p>
          <Link to="/courses" className="btn btn-primary">Browse Courses</Link>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"1rem", marginBottom:"2.5rem" }}>
          {enrollments.map(e => {
            const p = progress[e.course_id]
            const pct = p ? Number(p.percent_complete) : 0
            return (
              <div key={e.id} className="card" style={{ padding:"1.25rem", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"1rem", flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:200 }}>
                  <h3 style={{ fontSize:"1rem", marginBottom:" .5rem" }}>{e.courses?.title}</h3>
                  <ProgressBar percent={pct} label={`${p?.completed_lessons || 0} / ${p?.total_lessons || 0} lessons`} />
                </div>
                <div style={{ display:"flex", gap:" .75rem" }}>
                  {pct === 100 ? (
                    <Link to={`/certificate/${e.course_id}`} className="btn btn-outline" style={{ fontSize:" .85rem" }}>🏆 View Certificate</Link>
                  ) : null}
                  <Link to={`/courses/${e.courses?.slug}`} className="btn btn-primary" style={{ fontSize:" .85rem" }}>
                    {pct > 0 ? "Continue →" : "Start →"}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Certificates */}
      {certificates.length > 0 && (
        <>
          <h2 style={{ fontSize:"1.3rem", marginBottom:"1rem" }}>Certificates Earned</h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))", gap:"1rem" }}>
            {certificates.map(c => (
              <div key={c.id} className="card" style={{ padding:"1.25rem", textAlign:"center", background:"var(--green-light)" }}>
                <div style={{ fontSize:"2.5rem", marginBottom:" .5rem" }}>🏆</div>
                <h3 style={{ fontSize:" .95rem", marginBottom:" .3rem" }}>{c.courses?.title}</h3>
                <p style={{ fontSize:" .78rem", color:"var(--text-500)", marginBottom:"1rem" }}>
                  Issued {new Date(c.issued_at).toLocaleDateString()}
                </p>
                <Link to={`/certificate/${c.course_id}`} className="btn btn-primary" style={{ fontSize:" .82rem", width:"100%" }}>
                  View Certificate
                </Link>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Profile */}
      <div className="card" style={{ padding:"1.5rem", marginTop:"2.5rem" }}>
        <h2 style={{ fontSize:"1.1rem", marginBottom:"1rem" }}>Profile</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:" .75rem" }}>
          {[
            { label:"Full Name", value: profile?.full_name },
            { label:"Email", value: profile?.role === "admin" ? user?.email + " (Admin)" : user?.email },
            { label:"Professional ID", value: profile?.professional_id || "Not provided" },
          ].map(f => (
            <div key={f.label}>
              <p style={{ fontSize:" .78rem", color:"var(--text-500)", fontWeight:600, marginBottom:" .2rem" }}>{f.label}</p>
              <p style={{ fontSize:" .9rem" }}>{f.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
'@

# ── src/pages/CoursePlayer.jsx ─────────────────────────────────

Set-Content src/pages/CoursePlayer.jsx @'
import { useEffect, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { useAuth } from "../context/AuthContext"

export default function CoursePlayer() {
  const { courseId, lessonId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [modules, setModules] = useState([])
  const [lesson, setLesson] = useState(null)
  const [resources, setResources] = useState([])
  const [completedIds, setCompletedIds] = useState(new Set())
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: mods } = await supabase
        .from("modules").select("*, lessons(*)").eq("course_id", courseId).order("order_index")
      setModules(mods || [])

      const { data: les } = await supabase.from("lessons").select("*").eq("id", lessonId).single()
      setLesson(les)

      const { data: res } = await supabase.from("resources").select("*").eq("lesson_id", lessonId)
      setResources(res || [])

      const { data: prog } = await supabase.from("progress").select("lesson_id").eq("user_id", user.id).eq("completed", true)
      setCompletedIds(new Set((prog || []).map(p => p.lesson_id)))
    }
    load()
  }, [courseId, lessonId, user.id])

  async function getSignedUrl(filePath) {
    const { data } = await supabase.storage.from("course-pdfs").createSignedUrl(filePath, 3600)
    return data?.signedUrl
  }

  async function handleDownload(res) {
    const url = await getSignedUrl(res.file_url)
    if (url) window.open(url, "_blank")
  }

  async function markComplete() {
    setMarking(true)
    const existing = await supabase.from("progress").select("id").eq("user_id", user.id).eq("lesson_id", lessonId).single()
    if (existing.data) {
      await supabase.from("progress").update({ completed: true, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", existing.data.id)
    } else {
      await supabase.from("progress").insert({ user_id: user.id, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() })
    }
    setCompletedIds(prev => new Set([...prev, lessonId]))
    setMarking(false)

    // Auto-advance to next lesson
    const allLessons = modules.flatMap(m => (m.lessons || []).sort((a,b) => a.order_index - b.order_index))
    const idx = allLessons.findIndex(l => l.id === lessonId)
    if (idx < allLessons.length - 1) {
      navigate(`/learn/${courseId}/${allLessons[idx+1].id}`)
    } else {
      navigate(`/certificate/${courseId}`)
    }
  }

  const isCompleted = completedIds.has(lessonId)

  return (
    <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", minHeight:"calc(100vh - 62px)" }}>
      {/* Sidebar */}
      <aside style={{ background:"var(--white)", borderRight:"1px solid var(--border)", overflowY:"auto", padding:"1.25rem 0" }}>
        <div style={{ padding:"0 1.25rem 1rem", borderBottom:"1px solid var(--border)", marginBottom:" .5rem" }}>
          <Link to={`/courses`} style={{ fontSize:" .78rem", color:"var(--text-500)" }}>← All Courses</Link>
        </div>
        {modules.map(mod => (
          <div key={mod.id}>
            <p style={{ padding:" .5rem 1.25rem", fontSize:" .78rem", fontWeight:700, color:"var(--text-500)", textTransform:"uppercase", letterSpacing:" .05em" }}>
              {mod.title}
            </p>
            {(mod.lessons || []).sort((a,b) => a.order_index - b.order_index).map(les => {
              const active = les.id === lessonId
              const done = completedIds.has(les.id)
              return (
                <Link key={les.id} to={`/learn/${courseId}/${les.id}`} style={{
                  display:"flex", alignItems:"center", gap:" .6rem",
                  padding:" .55rem 1.25rem", fontSize:" .85rem",
                  background: active ? "var(--green-light)" : "transparent",
                  color: active ? "var(--green)" : "var(--text-900)",
                  fontWeight: active ? 600 : 400,
                  borderLeft: active ? "3px solid var(--green)" : "3px solid transparent",
                }}>
                  <span style={{ fontSize:" .9rem" }}>{done ? "✅" : "○"}</span>
                  <span style={{ flex:1, lineHeight:1.4 }}>{les.title}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </aside>

      {/* Main content */}
      <main style={{ padding:"2rem", overflowY:"auto" }}>
        {lesson ? (
          <>
            <h1 style={{ fontSize:"1.6rem", marginBottom:"1.25rem" }}>{lesson.title}</h1>

            {/* Video */}
            <div style={{ background:"#000", borderRadius:10, overflow:"hidden", marginBottom:"1.5rem", aspectRatio:"16/9" }}>
              {lesson.video_url ? (
                lesson.video_url.includes("youtube") || lesson.video_url.includes("youtu.be") || lesson.video_url.includes("vimeo") ? (
                  <iframe
                    src={lesson.video_url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                    style={{ width:"100%", height:"100%", border:"none" }}
                    allowFullScreen
                  />
                ) : (
                  <video src={lesson.video_url} controls style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                )
              ) : (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"#666", flexDirection:"column", gap:"1rem" }}>
                  <span style={{ fontSize:"3rem" }}>🎬</span>
                  <p style={{ fontSize:" .9rem" }}>Video not uploaded yet</p>
                </div>
              )}
            </div>

            {/* Description */}
            {lesson.description && (
              <div style={{ marginBottom:"1.5rem" }}>
                <h3 style={{ fontSize:"1rem", marginBottom:" .5rem" }}>Lesson Notes</h3>
                <p style={{ color:"var(--text-500)", lineHeight:1.8 }}>{lesson.description}</p>
              </div>
            )}

            {/* Downloads */}
            {resources.length > 0 && (
              <div style={{ marginBottom:"1.5rem" }}>
                <h3 style={{ fontSize:"1rem", marginBottom:" .75rem" }}>📎 Downloadable Resources</h3>
                <div style={{ display:"flex", flexDirection:"column", gap:" .5rem" }}>
                  {resources.map(r => (
                    <div key={r.id} className="card" style={{ padding:" .85rem 1.1rem", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <p style={{ fontSize:" .9rem", fontWeight:500 }}>{r.title}</p>
                        {r.file_size_kb && <p style={{ fontSize:" .75rem", color:"var(--text-500)" }}>{Math.round(r.file_size_kb/1024*10)/10} MB · PDF</p>}
                      </div>
                      <button onClick={() => handleDownload(r)} className="btn btn-outline" style={{ fontSize:" .82rem" }}>
                        ⬇ Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Complete button */}
            <div style={{ marginTop:"1.5rem" }}>
              {isCompleted ? (
                <div style={{ display:"flex", alignItems:"center", gap:" .6rem", color:"var(--success)" }}>
                  <span>✅</span><span style={{ fontWeight:600 }}>Lesson Completed</span>
                </div>
              ) : (
                <button onClick={markComplete} disabled={marking} className="btn btn-primary" style={{ padding:" .65rem 1.75rem" }}>
                  {marking ? "Saving…" : "Mark as Complete →"}
                </button>
              )}
            </div>
          </>
        ) : (
          <p style={{ color:"var(--text-500)" }}>Loading lesson…</p>
        )}
      </main>
    </div>
  )
}
'@

# ── src/pages/Certificate.jsx ──────────────────────────────────

Set-Content src/pages/Certificate.jsx @'
import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { useAuth } from "../context/AuthContext"
import { jsPDF } from "jspdf"

export default function Certificate() {
  const { courseId } = useParams()
  const { user, profile } = useAuth()
  const [cert, setCert] = useState(null)
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: c } = await supabase.from("courses").select("*").eq("id", courseId).single()
      setCourse(c)

      // Check/create certificate
      let { data: existing } = await supabase.from("certificates").select("*").eq("user_id", user.id).eq("course_id", courseId).single()
      if (!existing) {
        const { data: newCert } = await supabase.from("certificates").insert({ user_id: user.id, course_id: courseId }).select().single()
        existing = newCert
      }
      setCert(existing)
      setLoading(false)
    }
    load()
  }, [courseId, user])

  function downloadPDF() {
    const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" })
    const W = doc.internal.pageSize.getWidth()
    const H = doc.internal.pageSize.getHeight()

    // Border
    doc.setDrawColor(26,107,74)
    doc.setLineWidth(4)
    doc.rect(10, 10, W-20, H-20)
    doc.setLineWidth(1)
    doc.rect(13, 13, W-26, H-26)

    // Title
    doc.setFont("helvetica","bold")
    doc.setFontSize(28)
    doc.setTextColor(26,107,74)
    doc.text("Certificate of Completion", W/2, 45, { align:"center" })

    doc.setFont("helvetica","normal")
    doc.setFontSize(14)
    doc.setTextColor(100,100,100)
    doc.text("This certifies that", W/2, 62, { align:"center" })

    doc.setFont("helvetica","bold")
    doc.setFontSize(26)
    doc.setTextColor(17,24,39)
    doc.text(profile?.full_name || "Pharmacist", W/2, 80, { align:"center" })

    if (profile?.professional_id) {
      doc.setFont("helvetica","normal")
      doc.setFontSize(11)
      doc.setTextColor(107,114,128)
      doc.text(`License No: ${profile.professional_id}`, W/2, 89, { align:"center" })
    }

    doc.setFont("helvetica","normal")
    doc.setFontSize(14)
    doc.setTextColor(100,100,100)
    doc.text("has successfully completed the course", W/2, 102, { align:"center" })

    doc.setFont("helvetica","bold")
    doc.setFontSize(20)
    doc.setTextColor(26,107,74)
    doc.text(course?.title || "", W/2, 118, { align:"center" })

    doc.setFont("helvetica","normal")
    doc.setFontSize(11)
    doc.setTextColor(107,114,128)
    doc.text(`Date: ${new Date(cert?.issued_at).toLocaleDateString("en-GB", { year:"numeric",month:"long",day:"numeric" })}`, W/2, 132, { align:"center" })
    doc.text(`Certificate ID: ${cert?.id}`, W/2, 139, { align:"center" })
    doc.text("PharmaCourse — Professional Pharmacy CPD Platform", W/2, H-18, { align:"center" })

    doc.save(`PharmaCourse_Certificate_${profile?.full_name?.replace(/ /g,"_")}.pdf`)
  }

  if (loading) return <div className="page" style={{ color:"var(--text-500)" }}>Loading…</div>

  return (
    <div className="page" style={{ maxWidth:800, textAlign:"center" }}>
      <h1 style={{ fontSize:"2rem", marginBottom:" .5rem" }}>🏆 Congratulations!</h1>
      <p style={{ color:"var(--text-500)", marginBottom:"2.5rem" }}>You have completed <strong>{course?.title}</strong></p>

      {/* Certificate preview */}
      <div style={{
        border:"4px solid var(--green)", borderRadius:12, padding:"3rem 2.5rem",
        background:"var(--white)", marginBottom:"2rem", position:"relative"
      }}>
        <div style={{ position:"absolute", inset:8, border:"1px solid var(--green-mid)", borderRadius:8, pointerEvents:"none" }} />
        <p style={{ color:"var(--text-500)", fontSize:" .9rem", marginBottom:" .75rem" }}>Certificate of Completion</p>
        <h2 style={{ fontSize:"1.75rem", marginBottom:" .3rem" }}>{profile?.full_name}</h2>
        {profile?.professional_id && <p style={{ color:"var(--text-500)", fontSize:" .85rem", marginBottom:"1rem" }}>License No: {profile.professional_id}</p>}
        <p style={{ color:"var(--text-500)", marginBottom:" .5rem" }}>has successfully completed</p>
        <h3 style={{ color:"var(--green)", fontSize:"1.3rem", marginBottom:"1.5rem" }}>{course?.title}</h3>
        <p style={{ fontSize:" .82rem", color:"var(--text-500)" }}>
          {new Date(cert?.issued_at).toLocaleDateString("en-GB", { year:"numeric",month:"long",day:"numeric" })}
        </p>
        <p style={{ fontSize:" .75rem", color:"var(--border)", marginTop:" .5rem" }}>ID: {cert?.id}</p>
      </div>

      <div style={{ display:"flex", gap:"1rem", justifyContent:"center" }}>
        <button onClick={downloadPDF} className="btn btn-primary" style={{ padding:" .7rem 1.75rem" }}>
          ⬇ Download PDF Certificate
        </button>
        <Link to="/dashboard" className="btn btn-outline" style={{ padding:" .7rem 1.75rem" }}>
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
'@

# ── src/pages/admin/AdminDashboard.jsx ────────────────────────

Set-Content src/pages/admin/AdminDashboard.jsx @'
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../../lib/supabaseClient"

export default function AdminDashboard() {
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from("course_stats").select("*").then(({ data }) => {
      setStats(data || [])
      setLoading(false)
    })
  }, [])

  async function togglePublish(id, current) {
    await supabase.from("courses").update({ is_published: !current }).eq("id", id)
    setStats(prev => prev.map(c => c.id === id ? { ...c, is_published: !current } : c))
  }

  return (
    <div className="page">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"2rem" }}>
        <div>
          <h1 style={{ fontSize:"2rem", marginBottom:" .3rem" }}>Admin Panel</h1>
          <p style={{ color:"var(--text-500)" }}>Manage your courses and content</p>
        </div>
        <Link to="/admin/courses/new" className="btn btn-primary">+ Add New Course</Link>
      </div>

      {loading ? (
        <p style={{ color:"var(--text-500)" }}>Loading…</p>
      ) : stats.length === 0 ? (
        <div className="card" style={{ padding:"3rem", textAlign:"center" }}>
          <p style={{ color:"var(--text-500)", marginBottom:"1rem" }}>No courses yet.</p>
          <Link to="/admin/courses/new" className="btn btn-primary">Create Your First Course</Link>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
          {stats.map(c => (
            <div key={c.id} className="card" style={{ padding:"1.25rem", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"1rem" }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:" .75rem", marginBottom:" .3rem" }}>
                  <h3 style={{ fontSize:"1rem" }}>{c.title}</h3>
                  <span className="badge" style={{ background: c.is_published ? "var(--green-light)" : "var(--border)", color: c.is_published ? "var(--green-dark)" : "var(--text-500)" }}>
                    {c.is_published ? "Published" : "Draft"}
                  </span>
                </div>
                <p style={{ fontSize:" .82rem", color:"var(--text-500)" }}>
                  {c.total_enrollments} enrolled · {c.total_completions} completed
                </p>
              </div>
              <div style={{ display:"flex", gap:" .75rem" }}>
                <button onClick={() => togglePublish(c.id, c.is_published)} className="btn btn-outline" style={{ fontSize:" .82rem" }}>
                  {c.is_published ? "Unpublish" : "Publish"}
                </button>
                <Link to={`/admin/courses/${c.id}/edit`} className="btn btn-primary" style={{ fontSize:" .82rem" }}>Edit</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
'@

# ── src/pages/admin/CourseForm.jsx ────────────────────────────

Set-Content src/pages/admin/CourseForm.jsx @'
import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabaseClient"
import { useAuth } from "../../context/AuthContext"

export default function CourseForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { user } = useAuth()

  const [form, setForm] = useState({ title:"", slug:"", short_desc:"", description:"", category:"Microbiology", is_free:true, price:"0", is_published:false })
  const [modules, setModules] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [courseId, setCourseId] = useState(id || null)

  useEffect(() => {
    if (!isEdit) return
    async function load() {
      const { data: c } = await supabase.from("courses").select("*").eq("id", id).single()
      if (c) setForm({ title:c.title, slug:c.slug, short_desc:c.short_desc||"", description:c.description||"", category:c.category||"Microbiology", is_free:c.is_free, price:c.price||"0", is_published:c.is_published })
      const { data: mods } = await supabase.from("modules").select("*, lessons(*)").eq("course_id", id).order("order_index")
      setModules(mods || [])
    }
    load()
  }, [id, isEdit])

  function setF(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }
  function autoSlug(title) { return title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") }

  async function saveCourse(e) {
    e.preventDefault()
    setError(""); setSaving(true)
    const payload = { ...form, price: parseFloat(form.price) || 0 }
    if (!payload.slug) payload.slug = autoSlug(payload.title)

    if (isEdit) {
      const { error: err } = await supabase.from("courses").update(payload).eq("id", id)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      payload.created_by = user.id
      const { data, error: err } = await supabase.from("courses").insert(payload).select().single()
      if (err) { setError(err.message); setSaving(false); return }
      setCourseId(data.id)
      navigate(`/admin/courses/${data.id}/edit`, { replace:true })
    }
    setSaving(false)
    alert("Course saved!")
  }

  async function addModule() {
    if (!courseId) { alert("Save the course first."); return }
    const title = prompt("Module title:")
    if (!title) return
    const { data } = await supabase.from("modules").insert({ course_id: courseId, title, order_index: modules.length }).select().single()
    setModules(prev => [...prev, { ...data, lessons: [] }])
  }

  async function addLesson(modId, modIdx) {
    const title = prompt("Lesson title:")
    if (!title) return
    const mod = modules[modIdx]
    const { data } = await supabase.from("lessons").insert({ module_id: modId, title, order_index: (mod.lessons||[]).length }).select().single()
    setModules(prev => prev.map((m,i) => i === modIdx ? { ...m, lessons: [...(m.lessons||[]), data] } : m))
  }

  async function updateLessonVideo(lessonId, modIdx, lesIdx) {
    const url = prompt("Paste video URL (YouTube, Vimeo, or direct .mp4):")
    if (!url) return
    await supabase.from("lessons").update({ video_url: url }).eq("id", lessonId)
    setModules(prev => prev.map((m,mi) => mi === modIdx ? {
      ...m, lessons: m.lessons.map((l,li) => li === lesIdx ? { ...l, video_url: url } : l)
    } : m))
  }

  return (
    <div className="page" style={{ maxWidth:800 }}>
      <h1 style={{ fontSize:"1.8rem", marginBottom:"1.75rem" }}>{isEdit ? "Edit Course" : "New Course"}</h1>

      <div className="card" style={{ padding:"2rem", marginBottom:"2rem" }}>
        <form onSubmit={saveCourse}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem", marginBottom:"1rem" }}>
            <div>
              <label className="label">Course Title</label>
              <input value={form.title} onChange={e => { setF("title")(e); if (!isEdit) setForm(f => ({ ...f, slug: autoSlug(e.target.value) })) }} placeholder="Antimicrobial Resistance" required />
            </div>
            <div>
              <label className="label">Slug (URL)</label>
              <input value={form.slug} onChange={setF("slug")} placeholder="antimicrobial-resistance" required />
            </div>
          </div>
          <div style={{ marginBottom:"1rem" }}>
            <label className="label">Short Description (card)</label>
            <input value={form.short_desc} onChange={setF("short_desc")} placeholder="One-line summary for course cards" />
          </div>
          <div style={{ marginBottom:"1rem" }}>
            <label className="label">Full Description</label>
            <textarea value={form.description} onChange={setF("description")} rows={4} placeholder="Detailed course description…" style={{ resize:"vertical" }} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem", marginBottom:"1.5rem" }}>
            <div>
              <label className="label">Category</label>
              <select value={form.category} onChange={setF("category")}> 
                <option>Microbiology</option>
                <option>Clinical</option>
                <option>Stewardship</option>
                <option>Pharmacovigilance</option>
                <option>General</option>
              </select>
            </div>
            <div>
              <label className="label">Pricing</label>
              <select value={form.is_free ? "free" : "paid"} onChange={e => setForm(f => ({ ...f, is_free: e.target.value === "free" }))}>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div>
              <label className="label">Price ($)</label>
              <input type="number" value={form.price} onChange={setF("price")} min="0" step="0.01" disabled={form.is_free} />
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:" .75rem", marginBottom:"1.5rem" }}>
            <input type="checkbox" id="pub" checked={form.is_published} onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} style={{ width:"auto" }} />
            <label htmlFor="pub" style={{ cursor:"pointer", fontSize:" .9rem" }}>Publish this course (visible to students)</label>
          </div>
          {error && <p className="error-msg" style={{ marginBottom:"1rem" }}>{error}</p>}
          <button type="submit" disabled={saving} className="btn btn-primary">{saving ? "Saving…" : "Save Course"}</button>
        </form>
      </div>

      {/* Modules & Lessons */}
      {courseId && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
            <h2 style={{ fontSize:"1.3rem" }}>Modules & Lessons</h2>
            <button onClick={addModule} className="btn btn-outline" style={{ fontSize:" .85rem" }}>+ Add Module</button>
          </div>
          {modules.length === 0 ? (
            <div className="card" style={{ padding:"2rem", textAlign:"center" }}>
              <p style={{ color:"var(--text-500)" }}>No modules yet. Click "Add Module" to start building the curriculum.</p>
            </div>
          ) : modules.map((mod, mi) => (
            <div key={mod.id} className="card" style={{ marginBottom:"1rem" }}>
              <div style={{ padding:"1rem 1.25rem", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid var(--border)" }}>
                <h3 style={{ fontSize:" .95rem", fontWeight:600 }}>{mod.title}</h3>
                <button onClick={() => addLesson(mod.id, mi)} className="btn btn-outline" style={{ fontSize:" .78rem", padding:" .3rem .75rem" }}>+ Lesson</button>
              </div>
              {(mod.lessons || []).sort((a,b) => a.order_index - b.order_index).map((les, li) => (
                <div key={les.id} style={{ padding:" .7rem 1.25rem", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid var(--border)" }}>
                  <span style={{ fontSize:" .88rem" }}>{les.title}</span>
                  <button onClick={() => updateLessonVideo(les.id, mi, li)} className="btn btn-outline" style={{ fontSize:" .75rem", padding:" .25rem .65rem" }}>
                    {les.video_url ? "✅ Video" : "Add Video"}
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
'@

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  All PharmaCourse screens created successfully!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Now run:  npm run dev" -ForegroundColor Cyan
Write-Host "Then open: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
