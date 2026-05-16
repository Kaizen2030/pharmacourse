import { useState, useEffect, useRef } from "react"
import { supabase } from "../../lib/supabaseClient"
import { useAuth } from "../../context/AuthContext"
import {
  BookOpen, Home, LogOut, Plus, Edit2, Trash2, Eye, EyeOff,
  Save, GripVertical, AlertCircle, RefreshCw, FlaskConical, Users, Award, ExternalLink, Video, Building2, Tags
} from "lucide-react"
import Pagination from "../../components/Pagination"
import MarkdownContent from "../../components/MarkdownContent"
import "./AdminDashboard.css"
import { DEFAULT_CERTIFICATE_SETTINGS, normalizeCertificateSettings } from "../../lib/certificateSettings"
import {
  createEmptyBlogSection,
  getPopulatedBlogSections,
  hasPopulatedBlogSections,
  normalizeBlogCategory,
  normalizeBlogSections,
  slugifyBlogCategory,
} from "../../lib/blogHelpers"

const ADMIN_USERS_PAGE_SIZE = 12
const ADMIN_COURSES_PAGE_SIZE = 10
const ADMIN_SIMULATIONS_PAGE_SIZE = 8
const ADMIN_PEARLS_PAGE_SIZE = 8
const TEAM_PLAN_TIER_ORDER = ["starter", "growth", "enterprise"]

async function uploadImageToMedia(file, folder = "images") {
  if (!file) throw new Error("No file selected.")
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file (jpg, png, webp, etc.)")
  }

  const safeName = `${folder}/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, "_")}`
  const { error } = await supabase.storage
    .from("media")
    .upload(safeName, file, { cacheControl: "3600", upsert: false })

  if (error) throw error

  const { data: urlData } = supabase.storage
    .from("media")
    .getPublicUrl(safeName)

  return urlData.publicUrl
}

async function ensureBlogCategoryRecord(categoryName) {
  const normalizedName = normalizeBlogCategory(categoryName)
  if (!normalizedName) return

  const payload = {
    name: normalizedName,
    slug: slugifyBlogCategory(normalizedName),
    is_active: true,
  }

  const { error } = await supabase
    .from("blog_categories")
    .upsert(payload, { onConflict: "slug" })

  if (error) {
    throw error
  }
}

export default function AdminDashboard() {
  const { user, profile, loading: authLoading, isAdmin, isSuperAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState("courses")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    if (!user || !isAdmin) {
      window.location.href = "/dashboard"
      return
    }

    if (profile) setLoading(false)
  }, [authLoading, user, profile, isAdmin])

  useEffect(() => {
    if (!isSuperAdmin && (activeTab === "admins" || activeTab === "certificate" || activeTab === "team-plans")) {
      setActiveTab("courses")
    }
  }, [activeTab, isSuperAdmin])

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  if (loading) return <div className="page">Loading...</div>

  return (
    <div className="admin-layout">
      <div className="admin-sidebar">
        <div className="admin-header">
          <h2>RemedaCare Admin</h2>
          <p className="admin-user">{profile?.full_name}</p>
          {isAdmin && (
            <span
              className={`admin-role-badge${isSuperAdmin ? " super" : " content"}`}
            >
              {isSuperAdmin ? "Super Admin" : "Content Admin"}
            </span>
          )}
        </div>

        <nav className="admin-menu">
          <button
            className={`menu-item ${activeTab === "courses" ? "active" : ""}`}
            onClick={() => setActiveTab("courses")}
          >
            <BookOpen size={20} />
            <span>Courses</span>
          </button>
          <button
            className={`menu-item ${activeTab === "instructors" ? "active" : ""}`}
            onClick={() => setActiveTab("instructors")}
          >
            <Users size={20} />
            <span>Instructors</span>
          </button>
          <button
            className={`menu-item ${activeTab === "workshops" ? "active" : ""}`}
            onClick={() => setActiveTab("workshops")}
          >
            <Video size={20} />
            <span>Workshops</span>
          </button>
          <button
            className={`menu-item ${activeTab === "blog" ? "active" : ""}`}
            onClick={() => setActiveTab("blog")}
          >
            <Edit2 size={20} />
            <span>Blog</span>
          </button>
          <button
            className={`menu-item ${activeTab === "blog-categories" ? "active" : ""}`}
            onClick={() => setActiveTab("blog-categories")}
          >
            <Tags size={20} />
            <span>Blog Categories</span>
          </button>
          <button
            className={`menu-item ${activeTab === "testimonials" ? "active" : ""}`}
            onClick={() => setActiveTab("testimonials")}
          >
            <Award size={20} />
            <span>Testimonials</span>
          </button>
          <button
            className={`menu-item ${activeTab === "leaderboard" ? "active" : ""}`}
            onClick={() => setActiveTab("leaderboard")}
          >
            <RefreshCw size={20} />
            <span>Leaderboard</span>
          </button>
          {isSuperAdmin && (
            <button
              className={`menu-item ${activeTab === "team-plans" ? "active" : ""}`}
              onClick={() => setActiveTab("team-plans")}
            >
              <Building2 size={20} />
              <span>Team Plans</span>
            </button>
          )}
          <button
            className={`menu-item ${activeTab === "homepage" ? "active" : ""}`}
            onClick={() => setActiveTab("homepage")}
          >
            <Home size={20} />
            <span>Homepage</span>
          </button>
          <button
            className={`menu-item ${activeTab === "quizzes" ? "active" : ""}`}
            onClick={() => setActiveTab("quizzes")}
          >
            <Plus size={20} />
            <span>Quizzes</span>
          </button>
          <button
            className={`menu-item ${activeTab === "simulations" ? "active" : ""}`}
            onClick={() => setActiveTab("simulations")}
          >
            <FlaskConical size={20} />
            <span>Simulations</span>
          </button>
          {isSuperAdmin && (
            <button
              className={`menu-item ${activeTab === "admins" ? "active" : ""}`}
              onClick={() => setActiveTab("admins")}
            >
              <Users size={20} />
              <span>Admins</span>
            </button>
          )}
          {isSuperAdmin && (
            <button
              className={`menu-item ${activeTab === "certificate" ? "active" : ""}`}
              onClick={() => setActiveTab("certificate")}
            >
              <Award size={20} />
              <span>Certificate</span>
            </button>
          )}
        </nav>

        <button className="logout-btn" onClick={logout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>

      <div className="admin-content">
        {activeTab === "courses" && <PaginatedCoursesTab />}
        {activeTab === "instructors" && <InstructorsTab />}
        {activeTab === "workshops" && <WorkshopsTab />}
        {activeTab === "blog" && <BlogTab />}
        {activeTab === "blog-categories" && <BlogCategoriesTab />}
        {activeTab === "testimonials" && <TestimonialsTab />}
        {activeTab === "leaderboard" && <LeaderboardTab />}
        {isSuperAdmin && activeTab === "team-plans" && <TeamPlansTab />}
        {activeTab === "homepage" && <HomepageTab />}
        {activeTab === "quizzes" && <QuizManagementTab />}
        {activeTab === "simulations" && <ScalableSimulationsTab />}
        {isSuperAdmin && activeTab === "admins" && <ScalableAdminUsersTab />}
        {isSuperAdmin && activeTab === "certificate" && <CertificateSettingsTab />}
      </div>
    </div>
  )
}

// ─── COURSES TAB ─────────────────────────────────────────────────────────────

function AdminUsersTab() {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    loadProfiles()
  }, [])

  async function loadProfiles() {
    setLoading(true)
    setError("")

    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, full_name, email, professional_id, role")
      .order("full_name", { ascending: true })

    if (error) {
      setError(error.message)
      setProfiles([])
    } else {
      setProfiles(data || [])
    }

    setLoading(false)
  }

  async function promoteToAdmin(targetProfile) {
    if (!window.confirm(`Make ${targetProfile.email || targetProfile.full_name || "this user"} an admin?`)) return

    setSavingId(targetProfile.id)
    setError("")
    setMessage("")

    const { error } = await supabase
      .from("user_profiles")
      .update({ role: "admin" })
      .eq("id", targetProfile.id)

    if (error) {
      setError(`${error.message}. If this is a permissions issue, run the updated admin profile policy in supabase/rls_reset.sql.`)
    } else {
      setMessage(`${targetProfile.email || targetProfile.full_name || "User"} is now an admin.`)
      await loadProfiles()
    }

    setSavingId(null)
  }

  async function demoteAdmin(targetProfile) {
    const adminCount = profiles.filter((profile) => profile.role === "admin").length

    if (targetProfile.id === user?.id) {
      setError("You cannot remove your own admin access from this screen.")
      return
    }

    if (adminCount <= 1) {
      setError("You cannot demote the last remaining admin.")
      return
    }

    if (!window.confirm(`Remove admin access from ${targetProfile.email || targetProfile.full_name || "this admin"}?`)) return

    setSavingId(targetProfile.id)
    setError("")
    setMessage("")

    const { error } = await supabase
      .from("user_profiles")
      .update({ role: "student" })
      .eq("id", targetProfile.id)

    if (error) {
      setError(error.message)
    } else {
      setMessage(`${targetProfile.email || targetProfile.full_name || "User"} is no longer an admin.`)
      await loadProfiles()
    }

    setSavingId(null)
  }

  const query = search.trim().toLowerCase()
  const filtered = profiles.filter((profile) => {
    if (!query) return true
    return [profile.full_name, profile.email, profile.professional_id, profile.role]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  })

  const admins = filtered.filter((profile) => profile.role === "admin")
  const candidates = filtered.filter((profile) => profile.role !== "admin")

  return (
    <div className="admin-section">
      <div className="section-header">
        <div>
          <h2>Admin Management</h2>
          <p style={{ color: "var(--gray-500)", marginTop: "0.4rem" }}>
            View current admins, promote signed-up users, and remove admin access when needed.
          </p>
        </div>
        <button className="btn-secondary" onClick={loadProfiles}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, professional ID, role, or admin tier"
          style={{
            width: "100%",
            maxWidth: "420px",
            padding: "0.85rem 1rem",
            borderRadius: "0.75rem",
            border: "1px solid var(--gray-300)",
            fontSize: "0.95rem"
          }}
        />
      </div>

      {message && (
        <div style={{ marginBottom: "1rem", padding: "0.9rem 1rem", borderRadius: "0.75rem", background: "#dcfce7", color: "#166534", fontWeight: 600 }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: "1rem", padding: "0.9rem 1rem", borderRadius: "0.75rem", background: "#fee2e2", color: "#991b1b", fontWeight: 600 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: "var(--gray-500)" }}>Loading users...</p>
      ) : (
        <div style={{ display: "grid", gap: "2rem" }}>
          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0 }}>Current Admins</h3>
                <p style={{ margin: "0.35rem 0 0", color: "var(--gray-500)", fontSize: "0.84rem" }}>
                  You cannot remove yourself or the last remaining admin.
                </p>
              </div>
              <span style={{ fontSize: "0.85rem", color: "var(--gray-500)" }}>{admins.length} admin{admins.length === 1 ? "" : "s"}</span>
            </div>

            {admins.length === 0 ? (
              <div className="empty-state"><p>No admins found.</p></div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
                {admins.map((profile) => (
                  <div key={profile.id} style={{ background: "var(--gray-50)", border: "1px solid var(--gray-300)", borderRadius: "0.9rem", padding: "1.1rem 1.15rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.8rem" }}>
                      <strong style={{ color: "var(--gray-900)", fontSize: "1rem" }}>{profile.full_name || "Unnamed admin"}</strong>
                      <span style={{ background: "#dcfce7", color: "#166534", borderRadius: "999px", padding: "0.25rem 0.65rem", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" }}>
                        Admin
                      </span>
                    </div>
                    <p style={{ margin: "0 0 0.45rem", color: "var(--gray-600)", fontSize: "0.9rem" }}>{profile.email || "No email"}</p>
                    <p style={{ margin: 0, color: "var(--gray-500)", fontSize: "0.82rem" }}>
                      {profile.professional_id ? `Professional ID: ${profile.professional_id}` : "No professional ID"}
                    </p>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.9rem" }}>
                      <button
                        className="btn-secondary"
                        onClick={() => demoteAdmin(profile)}
                        disabled={savingId === profile.id || profile.id === user?.id || admins.length <= 1}
                        style={{
                          borderColor: "#fecaca",
                          color: "#b91c1c",
                          background: profile.id === user?.id || admins.length <= 1 ? "#f9fafb" : "#fff"
                        }}
                      >
                        {savingId === profile.id ? "Updating..." : profile.id === user?.id ? "Your Account" : admins.length <= 1 ? "Last Admin" : "Remove Admin"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>Promote Signed-up Users</h3>
              <span style={{ fontSize: "0.85rem", color: "var(--gray-500)" }}>{candidates.length} user{candidates.length === 1 ? "" : "s"}</span>
            </div>

            {candidates.length === 0 ? (
              <div className="empty-state">
                <p>No non-admin signed-up users found for the current filter.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {candidates.map((profile) => (
                  <div
                    key={profile.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      alignItems: "center",
                      gap: "1rem",
                      padding: "1rem 1.15rem",
                      background: "var(--gray-50)",
                      border: "1px solid var(--gray-300)",
                      borderRadius: "0.9rem"
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: "block", color: "var(--gray-900)", fontSize: "0.98rem", marginBottom: "0.3rem" }}>
                        {profile.full_name || "Unnamed user"}
                      </strong>
                      <p style={{ margin: "0 0 0.3rem", color: "var(--gray-600)", fontSize: "0.9rem" }}>{profile.email || "No email"}</p>
                      <p style={{ margin: 0, color: "var(--gray-500)", fontSize: "0.82rem" }}>
                        {profile.professional_id ? `Professional ID: ${profile.professional_id}` : "No professional ID"} · Role: {profile.role || "student"}
                      </p>
                    </div>
                    <button
                      className="btn-primary"
                      onClick={() => promoteToAdmin(profile)}
                      disabled={savingId === profile.id}
                    >
                      {savingId === profile.id ? "Promoting..." : "Make Admin"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function CoursesTab() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingCourse, setEditingCourse] = useState(null)

  useEffect(() => { loadCourses() }, [])

  async function loadCourses() {
    const { data } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false })
    setCourses(data || [])
    setLoading(false)
  }

  async function togglePublish(id, current) {
    await supabase.from("courses").update({ is_published: !current }).eq("id", id)
    loadCourses()
  }

  async function deleteCourse(id) {
    if (!window.confirm("Delete this course and all lessons?")) return
    await supabase.from("courses").delete().eq("id", id)
    loadCourses()
  }

  return (
    <div className="admin-section">
      <div className="section-header">
        <h2>Course Management</h2>
        <button className="btn-primary" onClick={() => setEditingCourse({ id: "new" })}>
          <Plus size={16} /> Create Course
        </button>
      </div>

      {loading ? (
        <p style={{ color: "var(--gray-500)" }}>Loading...</p>
      ) : courses.length === 0 ? (
        <div className="empty-state"><p>No courses yet. Create your first course!</p></div>
      ) : (
        <div className="courses-list">
          {courses.map(course => (
            <div key={course.id} className="course-item">
              <div className="course-info">
                <h3>{course.title}</h3>
                <p className="course-desc">{course.short_desc || course.description}</p>
                <div className="course-meta">
                  <span>{course.is_free ? "Free" : `KES ${course.price}`}</span>
                  <span className={`status ${course.is_published ? "published" : "draft"}`}>
                    {course.is_published ? "Published" : "Draft"}
                  </span>
                </div>
              </div>
              <div className="course-actions">
                <button className="btn-icon" title={course.is_published ? "Unpublish" : "Publish"}
                  onClick={() => togglePublish(course.id, course.is_published)}>
                  {course.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button className="btn-icon" title="Edit course" onClick={() => setEditingCourse(course)}>
                  <Edit2 size={16} />
                </button>
                <button className="btn-icon danger" title="Delete course" onClick={() => deleteCourse(course.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingCourse && (
        <CourseEditorModal
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
          onSave={() => { setEditingCourse(null); loadCourses() }}
        />
      )}
    </div>
  )
}

function ScalableAdminUsersTab() {
  const { user } = useAuth()
  const [admins, setAdmins] = useState([])
  const [candidates, setCandidates] = useState([])
  const [adminCount, setAdminCount] = useState(0)
  const [candidateCount, setCandidateCount] = useState(0)
  const [adminPage, setAdminPage] = useState(1)
  const [candidatePage, setCandidatePage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [selectedAdminRoles, setSelectedAdminRoles] = useState({})

  useEffect(() => {
    loadProfiles()
  }, [adminPage, candidatePage, search])

  useEffect(() => {
    setAdminPage(1)
    setCandidatePage(1)
  }, [search])

  function buildSearchFilter(query) {
    const normalized = query.trim()
    if (!normalized) return null

    const escaped = normalized.replace(/[%_]/g, "\\$&")
    return `full_name.ilike.%${escaped}%,email.ilike.%${escaped}%,professional_id.ilike.%${escaped}%,role.ilike.%${escaped}%,admin_role.ilike.%${escaped}%`
  }

  function getAdminRoleLabel(adminRole) {
    return adminRole === "super" ? "Super Admin" : "Content Admin"
  }

  function getSelectedAdminRole(profileId) {
    return selectedAdminRoles[profileId] || "content"
  }

  async function loadProfiles() {
    setLoading(true)
    setError("")

    const searchFilter = buildSearchFilter(search)
    const adminFrom = (adminPage - 1) * ADMIN_USERS_PAGE_SIZE
    const adminTo = adminFrom + ADMIN_USERS_PAGE_SIZE - 1
    const candidateFrom = (candidatePage - 1) * ADMIN_USERS_PAGE_SIZE
    const candidateTo = candidateFrom + ADMIN_USERS_PAGE_SIZE - 1

    let adminQuery = supabase
      .from("user_profiles")
      .select("id, full_name, email, professional_id, role, admin_role", { count: "exact" })
      .eq("role", "admin")
      .order("full_name", { ascending: true })
      .range(adminFrom, adminTo)

    let candidateQuery = supabase
      .from("user_profiles")
      .select("id, full_name, email, professional_id, role, admin_role", { count: "exact" })
      .neq("role", "admin")
      .order("full_name", { ascending: true })
      .range(candidateFrom, candidateTo)

    if (searchFilter) {
      adminQuery = adminQuery.or(searchFilter)
      candidateQuery = candidateQuery.or(searchFilter)
    }

    const [
      { data: adminData, count: adminTotal, error: adminError },
      { data: candidateData, count: candidateTotal, error: candidateError }
    ] = await Promise.all([adminQuery, candidateQuery])

    if (adminError || candidateError) {
      setError(adminError?.message || candidateError?.message || "Failed to load users.")
      setAdmins([])
      setCandidates([])
      setAdminCount(0)
      setCandidateCount(0)
    } else {
      setAdmins(adminData || [])
      setCandidates(candidateData || [])
      setAdminCount(adminTotal || 0)
      setCandidateCount(candidateTotal || 0)
    }

    setLoading(false)
  }

  async function promoteToAdmin(targetProfile) {
    const nextAdminRole = getSelectedAdminRole(targetProfile.id)

    if (!window.confirm(`Make ${targetProfile.email || targetProfile.full_name || "this user"} a ${getAdminRoleLabel(nextAdminRole)}?`)) return

    setSavingId(targetProfile.id)
    setError("")
    setMessage("")

    const { error: promoteError } = await supabase
      .from("user_profiles")
      .update({ role: "admin", admin_role: nextAdminRole })
      .eq("id", targetProfile.id)

    if (promoteError) {
      setError(`${promoteError.message}. If this is a permissions issue, run the updated admin profile policy in supabase/rls_reset.sql.`)
    } else {
      setMessage(`${targetProfile.email || targetProfile.full_name || "User"} is now a ${getAdminRoleLabel(nextAdminRole)}.`)
      setSelectedAdminRoles((current) => {
        const nextRoles = { ...current }
        delete nextRoles[targetProfile.id]
        return nextRoles
      })
      await loadProfiles()
    }

    setSavingId(null)
  }

  async function demoteAdmin(targetProfile) {
    if (targetProfile.id === user?.id) {
      setError("You cannot remove your own admin access from this screen.")
      return
    }

    if (adminCount <= 1) {
      setError("You cannot demote the last remaining admin.")
      return
    }

    if (!window.confirm(`Remove admin access from ${targetProfile.email || targetProfile.full_name || "this admin"}?`)) return

    setSavingId(targetProfile.id)
    setError("")
    setMessage("")

    const { error: demoteError } = await supabase
      .from("user_profiles")
      .update({ role: "student", admin_role: null })
      .eq("id", targetProfile.id)

    if (demoteError) {
      setError(demoteError.message)
    } else {
      setMessage(`${targetProfile.email || targetProfile.full_name || "User"} is no longer an admin.`)
      await loadProfiles()
    }

    setSavingId(null)
  }

  const adminTotalPages = Math.max(1, Math.ceil(adminCount / ADMIN_USERS_PAGE_SIZE))
  const candidateTotalPages = Math.max(1, Math.ceil(candidateCount / ADMIN_USERS_PAGE_SIZE))

  return (
    <div className="admin-section">
      <div className="section-header">
        <div>
          <h2>Admin Management</h2>
          <p style={{ color: "var(--gray-500)", marginTop: "0.4rem" }}>
            View current admins, promote signed-up users, and remove admin access when needed.
          </p>
        </div>
        <button className="btn-secondary" onClick={loadProfiles}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, professional ID, role, or admin tier"
          style={{
            width: "100%",
            maxWidth: "420px",
            padding: "0.85rem 1rem",
            borderRadius: "0.75rem",
            border: "1px solid var(--gray-300)",
            fontSize: "0.95rem"
          }}
        />
      </div>

      {message && (
        <div style={{ marginBottom: "1rem", padding: "0.9rem 1rem", borderRadius: "0.75rem", background: "#dcfce7", color: "#166534", fontWeight: 600 }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: "1rem", padding: "0.9rem 1rem", borderRadius: "0.75rem", background: "#fee2e2", color: "#991b1b", fontWeight: 600 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: "var(--gray-500)" }}>Loading users...</p>
      ) : (
        <div style={{ display: "grid", gap: "2rem" }}>
          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0 }}>Current Admins</h3>
                <p style={{ margin: "0.35rem 0 0", color: "var(--gray-500)", fontSize: "0.84rem" }}>
                  You cannot remove yourself or the last remaining admin.
                </p>
              </div>
              <span style={{ fontSize: "0.85rem", color: "var(--gray-500)" }}>{adminCount} admin{adminCount === 1 ? "" : "s"}</span>
            </div>

            {admins.length === 0 ? (
              <div className="empty-state"><p>No admins found.</p></div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
                  {admins.map((profile) => (
                    <div key={profile.id} style={{ background: "var(--gray-50)", border: "1px solid var(--gray-300)", borderRadius: "0.9rem", padding: "1.1rem 1.15rem" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.8rem" }}>
                        <strong style={{ color: "var(--gray-900)", fontSize: "1rem" }}>{profile.full_name || "Unnamed admin"}</strong>
                        <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                          <span style={{ background: "#dcfce7", color: "#166534", borderRadius: "999px", padding: "0.25rem 0.65rem", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" }}>
                            Admin
                          </span>
                          <span style={{
                            background: profile.admin_role === "super" ? "#ede9fe" : "#e0f2fe",
                            color: profile.admin_role === "super" ? "#6d28d9" : "#0f766e",
                            borderRadius: "999px",
                            padding: "0.25rem 0.65rem",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            textTransform: "uppercase"
                          }}>
                            {getAdminRoleLabel(profile.admin_role)}
                          </span>
                        </div>
                      </div>
                      <p style={{ margin: "0 0 0.45rem", color: "var(--gray-600)", fontSize: "0.9rem" }}>{profile.email || "No email"}</p>
                      <p style={{ margin: 0, color: "var(--gray-500)", fontSize: "0.82rem" }}>
                        {profile.professional_id ? `Professional ID: ${profile.professional_id}` : "No professional ID"} | Tier: {getAdminRoleLabel(profile.admin_role)}
                      </p>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.9rem" }}>
                        <button
                          className="btn-secondary"
                          onClick={() => demoteAdmin(profile)}
                          disabled={savingId === profile.id || profile.id === user?.id || adminCount <= 1}
                          style={{
                            borderColor: "#fecaca",
                            color: "#b91c1c",
                            background: profile.id === user?.id || adminCount <= 1 ? "#f9fafb" : "#fff"
                          }}
                        >
                          {savingId === profile.id ? "Updating..." : profile.id === user?.id ? "Your Account" : adminCount <= 1 ? "Last Admin" : "Remove Admin"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <Pagination
                  currentPage={adminPage}
                  totalPages={adminTotalPages}
                  totalItems={adminCount}
                  pageSize={ADMIN_USERS_PAGE_SIZE}
                  onPageChange={setAdminPage}
                  label="admins"
                />
              </>
            )}
          </section>

          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>Promote Signed-up Users</h3>
              <span style={{ fontSize: "0.85rem", color: "var(--gray-500)" }}>{candidateCount} user{candidateCount === 1 ? "" : "s"}</span>
            </div>

            {candidates.length === 0 ? (
              <div className="empty-state">
                <p>No non-admin signed-up users found for the current filter.</p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {candidates.map((profile) => (
                    <div
                      key={profile.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto auto",
                        alignItems: "end",
                        gap: "1rem",
                        padding: "1rem 1.15rem",
                        background: "var(--gray-50)",
                        border: "1px solid var(--gray-300)",
                        borderRadius: "0.9rem"
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ display: "block", color: "var(--gray-900)", fontSize: "0.98rem", marginBottom: "0.3rem" }}>
                          {profile.full_name || "Unnamed user"}
                        </strong>
                        <p style={{ margin: "0 0 0.3rem", color: "var(--gray-600)", fontSize: "0.9rem" }}>{profile.email || "No email"}</p>
                        <p style={{ margin: 0, color: "var(--gray-500)", fontSize: "0.82rem" }}>
                          {profile.professional_id ? `Professional ID: ${profile.professional_id}` : "No professional ID"} | Role: {profile.role || "student"}
                        </p>
                      </div>
                      <label style={{ display: "grid", gap: "0.35rem", minWidth: "170px" }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--gray-600)" }}>Admin Tier</span>
                        <select
                          value={getSelectedAdminRole(profile.id)}
                          onChange={(event) => setSelectedAdminRoles((current) => ({ ...current, [profile.id]: event.target.value }))}
                          disabled={savingId === profile.id}
                          style={{
                            padding: "0.72rem 0.85rem",
                            borderRadius: "0.75rem",
                            border: "1px solid var(--gray-300)",
                            background: "#fff",
                            fontSize: "0.92rem",
                            color: "var(--gray-900)"
                          }}
                        >
                          <option value="content">Content Admin</option>
                          <option value="super">Super Admin</option>
                        </select>
                      </label>
                      <button
                        className="btn-primary"
                        onClick={() => promoteToAdmin(profile)}
                        disabled={savingId === profile.id}
                      >
                        {savingId === profile.id ? "Promoting..." : "Make Admin"}
                      </button>
                    </div>
                  ))}
                </div>
                <Pagination
                  currentPage={candidatePage}
                  totalPages={candidateTotalPages}
                  totalItems={candidateCount}
                  pageSize={ADMIN_USERS_PAGE_SIZE}
                  onPageChange={setCandidatePage}
                  label="users"
                />
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function PaginatedCoursesTab() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingCourse, setEditingCourse] = useState(null)
  const [page, setPage] = useState(1)
  const [totalCourses, setTotalCourses] = useState(0)

  useEffect(() => {
    loadCourses(page)
  }, [page])

  async function loadCourses(targetPage = page) {
    setLoading(true)

    const from = (targetPage - 1) * ADMIN_COURSES_PAGE_SIZE
    const to = from + ADMIN_COURSES_PAGE_SIZE - 1

    const { data, count, error } = await supabase
      .from("courses")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) {
      console.error("Failed to load courses:", error)
      setCourses([])
      setTotalCourses(0)
    } else {
      setCourses(data || [])
      setTotalCourses(count || 0)
    }

    setLoading(false)
  }

  async function togglePublish(id, current) {
    await supabase.from("courses").update({ is_published: !current }).eq("id", id)
    await loadCourses(page)
  }

  async function deleteCourse(id) {
    if (!window.confirm("Delete this course and all lessons?")) return
    await supabase.from("courses").delete().eq("id", id)

    const nextTotal = Math.max(totalCourses - 1, 0)
    const nextTotalPages = Math.max(1, Math.ceil(nextTotal / ADMIN_COURSES_PAGE_SIZE))
    const nextPage = Math.min(page, nextTotalPages)

    setPage(nextPage)
    await loadCourses(nextPage)
  }

  const totalPages = Math.max(1, Math.ceil(totalCourses / ADMIN_COURSES_PAGE_SIZE))

  return (
    <div className="admin-section">
      <div className="section-header">
        <h2>Course Management</h2>
        <button className="btn-primary" onClick={() => setEditingCourse({ id: "new" })}>
          <Plus size={16} /> Create Course
        </button>
      </div>

      {loading ? (
        <p style={{ color: "var(--gray-500)" }}>Loading...</p>
      ) : courses.length === 0 ? (
        <div className="empty-state"><p>No courses yet. Create your first course!</p></div>
      ) : (
        <>
          <div className="courses-list">
            {courses.map((course) => (
              <div key={course.id} className="course-item">
                <div className="course-info">
                  <h3>{course.title}</h3>
                  <p className="course-desc">{course.short_desc || course.description}</p>
                  <div className="course-meta">
                    <span>{course.is_free ? "Free" : `KES ${course.price}`}</span>
                    <span className={`status ${course.is_published ? "published" : "draft"}`}>
                      {course.is_published ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>
                <div className="course-actions">
                  <button className="btn-icon" title={course.is_published ? "Unpublish" : "Publish"}
                    onClick={() => togglePublish(course.id, course.is_published)}>
                    {course.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button className="btn-icon" title="Edit course" onClick={() => setEditingCourse(course)}>
                    <Edit2 size={16} />
                  </button>
                  <button className="btn-icon danger" title="Delete course" onClick={() => deleteCourse(course.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalCourses}
            pageSize={ADMIN_COURSES_PAGE_SIZE}
            onPageChange={setPage}
            label="courses"
          />
        </>
      )}

      {editingCourse && (
        <CourseEditorModal
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
          onSave={() => { setEditingCourse(null); loadCourses(page) }}
        />
      )}
    </div>
  )
}

const EMPTY_INSTRUCTOR_FORM = {
  id: "",
  name: "",
  title: "",
  bio: "",
  photo_url: "",
  linkedin_url: "",
  years_experience: "",
  specialization: "",
}

function getInstructorInitials(name) {
  const parts = `${name || ""}`.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  if (parts.length === 0) return "IN"
  return parts.map((part) => part[0].toUpperCase()).join("")
}

function InstructorsTab() {
  const [instructors, setInstructors] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_INSTRUCTOR_FORM)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const photoInputRef = useRef(null)

  useEffect(() => {
    loadInstructors()
  }, [])

  async function loadInstructors() {
    setLoading(true)
    setError("")

    const { data, error: loadError } = await supabase
      .from("instructors")
      .select("*")
      .order("name", { ascending: true })

    if (loadError) {
      setError(loadError.message)
      setInstructors([])
    } else {
      setInstructors(data || [])
    }

    setLoading(false)
  }

  function updateFormField(field) {
    return (event) => {
      setForm((current) => ({ ...current, [field]: event.target.value }))
    }
  }

  function resetForm() {
    setForm(EMPTY_INSTRUCTOR_FORM)
    setShowForm(false)
    setEditingId(null)
    setUploadingPhoto(false)
  }

  function startCreate() {
    setError("")
    setMessage("")
    setEditingId(null)
    setForm(EMPTY_INSTRUCTOR_FORM)
    setShowForm(true)
  }

  function startEdit(instructor) {
    setError("")
    setMessage("")
    setEditingId(instructor.id)
    setForm({
      id: instructor.id || "",
      name: instructor.name || "",
      title: instructor.title || "",
      bio: instructor.bio || "",
      photo_url: instructor.photo_url || "",
      linkedin_url: instructor.linkedin_url || "",
      years_experience: instructor.years_experience ?? "",
      specialization: instructor.specialization || "",
    })
    setShowForm(true)
  }

  async function handlePhotoUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file for the instructor photo.")
      return
    }

    setUploadingPhoto(true)
    setError("")
    setMessage("")

    try {
      const safeName = `instructors/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, "_")}`
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(safeName, file, { cacheControl: "3600", upsert: false })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from("media")
        .getPublicUrl(safeName)

      setForm((current) => ({ ...current, photo_url: urlData.publicUrl }))
    } catch (uploadError) {
      setError(uploadError.message || "Failed to upload instructor photo.")
    } finally {
      setUploadingPhoto(false)
      event.target.value = ""
    }
  }

  async function saveInstructor(event) {
    event.preventDefault()

    if (!form.name.trim()) {
      setError("Instructor name is required.")
      return
    }

    setSaving(true)
    setError("")
    setMessage("")

    const payload = {
      id: editingId || form.id || crypto.randomUUID(),
      name: form.name.trim(),
      title: form.title.trim() || null,
      bio: form.bio.trim() || null,
      photo_url: form.photo_url.trim() || null,
      linkedin_url: form.linkedin_url.trim() || null,
      years_experience: form.years_experience === "" ? null : Number(form.years_experience),
      specialization: form.specialization.trim() || null,
      updated_at: new Date().toISOString(),
    }

    const { error: saveError } = await supabase
      .from("instructors")
      .upsert(payload, { onConflict: "id" })

    if (saveError) {
      setError(`${saveError.message}. If this is a permissions issue, re-run supabase/instructors_setup.sql in Supabase.`)
    } else {
      setMessage(editingId ? "Instructor updated successfully." : "Instructor added successfully.")
      resetForm()
      await loadInstructors()
    }

    setSaving(false)
  }

  async function deleteInstructor(instructor) {
    if (!window.confirm(`Delete instructor ${instructor.name || "this record"}?`)) return

    setDeletingId(instructor.id)
    setError("")
    setMessage("")

    const { error: deleteError } = await supabase
      .from("instructors")
      .delete()
      .eq("id", instructor.id)

    if (deleteError) {
      setError(deleteError.message)
    } else {
      setMessage("Instructor deleted successfully.")
      if (editingId === instructor.id) resetForm()
      await loadInstructors()
    }

    setDeletingId(null)
  }

  return (
    <div className="admin-section">
      <div className="section-header">
        <div>
          <h2>Instructors</h2>
          <p style={{ color: "var(--gray-500)", marginTop: "0.4rem" }}>
            Manage instructor bios, experience, and LinkedIn profiles used across course pages.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button className="btn-secondary" onClick={loadInstructors}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn-primary" onClick={startCreate}>
            <Plus size={16} /> Add Instructor
          </button>
        </div>
      </div>

      {message && (
        <div style={{ marginBottom: "1rem", padding: "0.9rem 1rem", borderRadius: "0.75rem", background: "#dcfce7", color: "#166534", fontWeight: 600 }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: "1rem", padding: "0.9rem 1rem", borderRadius: "0.75rem", background: "#fee2e2", color: "#991b1b", fontWeight: 600 }}>
          {error}
        </div>
      )}

      {showForm && (
        <form className="instructor-form-card" onSubmit={saveInstructor}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: 0 }}>{editingId ? "Edit Instructor" : "Add Instructor"}</h3>
              <p style={{ margin: "0.35rem 0 0", color: "var(--gray-500)", fontSize: "0.9rem" }}>
                Update the instructor profile shown on course detail pages.
              </p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Name</label>
              <input value={form.name} onChange={updateFormField("name")} placeholder="Dr. Jane Mwangi" required />
            </div>
            <div className="form-group">
              <label>Title</label>
              <input value={form.title} onChange={updateFormField("title")} placeholder="Clinical Pharmacist" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Specialization</label>
              <input value={form.specialization} onChange={updateFormField("specialization")} placeholder="Pharmacy Practice" />
            </div>
            <div className="form-group">
              <label>Years of Experience</label>
              <input type="number" min="0" value={form.years_experience} onChange={updateFormField("years_experience")} placeholder="8" />
            </div>
          </div>

          <div className="form-group">
            <label>Bio</label>
            <textarea rows={3} value={form.bio} onChange={updateFormField("bio")} placeholder="Short professional summary for this instructor." />
          </div>

          <div className="form-group">
            <label>Instructor Photo</label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handlePhotoUpload}
            />

            <div className="instructor-photo-editor">
              <div className="instructor-photo-preview">
                {form.photo_url ? (
                  <img src={form.photo_url} alt={form.name || "Instructor preview"} className="instructor-photo-preview-image" />
                ) : (
                  <div className="instructor-avatar instructor-avatar-fallback instructor-photo-preview-fallback">
                    {getInstructorInitials(form.name)}
                  </div>
                )}
              </div>

              <div className="instructor-photo-editor-copy">
                <p style={{ margin: 0, color: "var(--gray-600)", fontSize: "0.9rem" }}>
                  Upload a profile photo to show on the admin list and the public course detail page.
                </p>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.85rem" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? "Uploading..." : form.photo_url ? "Change Photo" : "Upload Photo"}
                  </button>
                  {form.photo_url ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setForm((current) => ({ ...current, photo_url: "" }))}
                    >
                      Remove Photo
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Photo URL</label>
              <input value={form.photo_url} onChange={updateFormField("photo_url")} placeholder="https://..." />
              <small>You can paste a URL here or use the upload button above.</small>
            </div>
            <div className="form-group">
              <label>LinkedIn URL</label>
              <input value={form.linkedin_url} onChange={updateFormField("linkedin_url")} placeholder="https://linkedin.com/in/..." />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", flexWrap: "wrap" }}>
            <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={16} />
              {saving ? "Saving..." : editingId ? "Save Changes" : "Save Instructor"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={{ color: "var(--gray-500)" }}>Loading instructors...</p>
      ) : instructors.length === 0 ? (
        <div className="empty-state"><p>No instructors found yet. Add your first instructor profile.</p></div>
      ) : (
        <>
          <div className="instructors-table-head">
            <span>Instructor</span>
            <span>Title</span>
            <span>Specialization</span>
            <span>Experience</span>
            <span>LinkedIn</span>
            <span>Actions</span>
          </div>

          <div className="instructors-list">
            {instructors.map((instructor) => (
              <div key={instructor.id} className="instructor-row">
                <div className="instructor-person">
                  {instructor.photo_url ? (
                    <img
                      src={instructor.photo_url}
                      alt={instructor.name || "Instructor"}
                      className="instructor-avatar"
                    />
                  ) : (
                    <div className="instructor-avatar instructor-avatar-fallback">
                      {getInstructorInitials(instructor.name)}
                    </div>
                  )}

                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: "block", color: "var(--gray-900)", fontSize: "0.96rem" }}>
                      {instructor.name || "Unnamed instructor"}
                    </strong>
                    {instructor.bio && (
                      <p className="instructor-bio-preview">{instructor.bio}</p>
                    )}
                  </div>
                </div>

                <div className="instructor-cell">
                  {instructor.title || <span style={{ color: "var(--gray-500)" }}>Not set</span>}
                </div>

                <div className="instructor-cell">
                  {instructor.specialization || <span style={{ color: "var(--gray-500)" }}>Not set</span>}
                </div>

                <div className="instructor-cell">
                  {typeof instructor.years_experience === "number"
                    ? `${instructor.years_experience} year${instructor.years_experience === 1 ? "" : "s"}`
                    : <span style={{ color: "var(--gray-500)" }}>Not set</span>}
                </div>

                <div className="instructor-cell">
                  {instructor.linkedin_url ? (
                    <a
                      href={instructor.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      className="instructor-link"
                      aria-label={`Open LinkedIn for ${instructor.name || "instructor"}`}
                    >
                      <ExternalLink size={16} />
                    </a>
                  ) : (
                    <span style={{ color: "var(--gray-500)" }}>Not set</span>
                  )}
                </div>

                <div className="course-actions">
                  <button className="btn-icon" title="Edit instructor" onClick={() => startEdit(instructor)}>
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="btn-icon danger"
                    title="Delete instructor"
                    onClick={() => deleteInstructor(instructor)}
                    disabled={deletingId === instructor.id}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const EMPTY_WORKSHOP_FORM = {
  id: "",
  title: "",
  description: "",
  date: "",
  time: "",
  duration_minutes: "",
  host_name: "",
  host_title: "",
  is_free: true,
  price: "",
  whatsapp_link: "",
  is_upcoming: true,
  cover_image_url: "",
  tags: "",
}

function sortWorkshops(rows) {
  return [...(rows || [])].sort((a, b) => {
    if (a.is_upcoming !== b.is_upcoming) {
      return a.is_upcoming ? -1 : 1
    }

    const aTime = a.date ? new Date(`${a.date}T${a.time || "00:00"}`).getTime() : 0
    const bTime = b.date ? new Date(`${b.date}T${b.time || "00:00"}`).getTime() : 0

    if (a.is_upcoming) return aTime - bTime
    return bTime - aTime
  })
}

function formatWorkshopDate(dateValue) {
  if (!dateValue) return "Date not set"
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString()
}

function WorkshopsTab() {
  const [workshops, setWorkshops] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_WORKSHOP_FORM)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const coverInputRef = useRef(null)

  useEffect(() => {
    loadWorkshops()
  }, [])

  async function loadWorkshops() {
    setLoading(true)
    setError("")

    const { data, error: loadError } = await supabase
      .from("workshops")
      .select("*")

    if (loadError) {
      setError(loadError.message)
      setWorkshops([])
    } else {
      setWorkshops(sortWorkshops(data || []))
    }

    setLoading(false)
  }

  function resetForm() {
    setForm(EMPTY_WORKSHOP_FORM)
    setEditingId(null)
    setShowForm(false)
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function startCreate() {
    setError("")
    setMessage("")
    setEditingId(null)
    setForm(EMPTY_WORKSHOP_FORM)
    setShowForm(true)
  }

  function startEdit(workshop) {
    setError("")
    setMessage("")
    setEditingId(workshop.id)
    setForm({
      id: workshop.id || "",
      title: workshop.title || "",
      description: workshop.description || "",
      date: workshop.date || "",
      time: workshop.time ? `${workshop.time}`.slice(0, 5) : "",
      duration_minutes: workshop.duration_minutes ?? "",
      host_name: workshop.host_name || "",
      host_title: workshop.host_title || "",
      is_free: workshop.is_free ?? true,
      price: workshop.is_free ? "" : workshop.price ?? "",
      whatsapp_link: workshop.whatsapp_link || "",
      is_upcoming: workshop.is_upcoming ?? true,
      cover_image_url: workshop.cover_image_url || "",
      tags: Array.isArray(workshop.tags) ? workshop.tags.join(", ") : "",
    })
    setShowForm(true)
  }

  async function handleCoverUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingCover(true)
    setError("")
    setMessage("")

    try {
      const publicUrl = await uploadImageToMedia(file, "workshops")
      updateField("cover_image_url", publicUrl)
      setMessage("Workshop cover uploaded. Save the workshop to keep it.")
    } catch (uploadError) {
      setError(uploadError.message || "Unable to upload workshop cover.")
    } finally {
      setUploadingCover(false)
      event.target.value = ""
    }
  }

  async function saveWorkshop(event) {
    event.preventDefault()

    if (!form.title.trim()) {
      setError("Workshop title is required.")
      return
    }

    setSaving(true)
    setError("")
    setMessage("")

    const tagList = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)

    const payload = {
      id: editingId || form.id || crypto.randomUUID(),
      title: form.title.trim(),
      description: form.description.trim() || null,
      date: form.date || null,
      time: form.time || null,
      duration_minutes: form.duration_minutes === "" ? null : Number(form.duration_minutes),
      host_name: form.host_name.trim() || null,
      host_title: form.host_title.trim() || null,
      is_free: !!form.is_free,
      price: form.is_free ? 0 : (form.price === "" ? 0 : Number(form.price)),
      whatsapp_link: form.whatsapp_link.trim() || null,
      is_upcoming: !!form.is_upcoming,
      cover_image_url: form.cover_image_url.trim() || null,
      tags: tagList,
      updated_at: new Date().toISOString(),
    }

    const { error: saveError } = await supabase
      .from("workshops")
      .upsert(payload, { onConflict: "id" })

    if (saveError) {
      setError(`${saveError.message}. If this is a permissions issue, re-run supabase/workshops_setup.sql in Supabase.`)
    } else {
      setMessage(editingId ? "Workshop updated successfully." : "Workshop added successfully.")
      resetForm()
      await loadWorkshops()
    }

    setSaving(false)
  }

  async function toggleUpcoming(workshop) {
    setTogglingId(workshop.id)
    setError("")
    setMessage("")

    const { error: toggleError } = await supabase
      .from("workshops")
      .update({ is_upcoming: !workshop.is_upcoming, updated_at: new Date().toISOString() })
      .eq("id", workshop.id)

    if (toggleError) {
      setError(toggleError.message)
    } else {
      setMessage(`Workshop moved to ${workshop.is_upcoming ? "past sessions" : "upcoming"}.`)
      await loadWorkshops()
    }

    setTogglingId(null)
  }

  async function deleteWorkshop(workshop) {
    if (!window.confirm(`Delete workshop ${workshop.title || "this record"}?`)) return

    setDeletingId(workshop.id)
    setError("")
    setMessage("")

    const { error: deleteError } = await supabase
      .from("workshops")
      .delete()
      .eq("id", workshop.id)

    if (deleteError) {
      setError(deleteError.message)
    } else {
      setMessage("Workshop deleted successfully.")
      if (editingId === workshop.id) resetForm()
      await loadWorkshops()
    }

    setDeletingId(null)
  }

  return (
    <div className="admin-section">
      <div className="section-header">
        <div>
          <h2>Workshops</h2>
          <p style={{ color: "var(--gray-500)", marginTop: "0.4rem" }}>
            Manage upcoming live workshops and past sessions shown on the public workshops page.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button className="btn-secondary" onClick={loadWorkshops}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn-primary" onClick={startCreate}>
            <Plus size={16} /> Add Workshop
          </button>
        </div>
      </div>

      {message && (
        <div style={{ marginBottom: "1rem", padding: "0.9rem 1rem", borderRadius: "0.75rem", background: "#dcfce7", color: "#166534", fontWeight: 600 }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: "1rem", padding: "0.9rem 1rem", borderRadius: "0.75rem", background: "#fee2e2", color: "#991b1b", fontWeight: 600 }}>
          {error}
        </div>
      )}

      {showForm && (
        <form className="instructor-form-card" onSubmit={saveWorkshop}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: 0 }}>{editingId ? "Edit Workshop" : "Add Workshop"}</h3>
              <p style={{ margin: "0.35rem 0 0", color: "var(--gray-500)", fontSize: "0.9rem" }}>
                Update workshop details, registration links, and public listing badges.
              </p>
            </div>
          </div>

          <div className="form-group">
            <label>Title</label>
            <input value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder="Live Clinical Pearls Webinar" required />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea rows={3} value={form.description} onChange={(event) => updateField("description", event.target.value)} placeholder="Short workshop summary." />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={form.date} onChange={(event) => updateField("date", event.target.value)} />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input type="time" value={form.time} onChange={(event) => updateField("time", event.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Duration (minutes)</label>
              <input type="number" min="0" value={form.duration_minutes} onChange={(event) => updateField("duration_minutes", event.target.value)} placeholder="60" />
            </div>
            <div className="form-group">
              <label>Price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) => updateField("price", event.target.value)}
                placeholder="0"
                disabled={form.is_free}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Host Name</label>
              <input value={form.host_name} onChange={(event) => updateField("host_name", event.target.value)} placeholder="Dr. Jane Mwangi" />
            </div>
            <div className="form-group">
              <label>Host Title</label>
              <input value={form.host_title} onChange={(event) => updateField("host_title", event.target.value)} placeholder="Senior Clinical Pharmacist" />
            </div>
          </div>

          <div className="form-group">
            <label>WhatsApp Link</label>
            <input value={form.whatsapp_link} onChange={(event) => updateField("whatsapp_link", event.target.value)} placeholder="https://wa.me/..." />
          </div>

          <div className="form-group">
            <label>Cover Image</label>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleCoverUpload}
            />
            <div className="instructor-photo-editor">
              <div className="admin-image-upload-preview">
                {form.cover_image_url ? (
                  <img
                    src={form.cover_image_url}
                    alt={form.title || "Workshop cover preview"}
                    className="admin-image-upload-preview-image"
                  />
                ) : (
                  <div className="admin-image-upload-placeholder">
                    <span>No cover image</span>
                  </div>
                )}
              </div>
              <div className="instructor-photo-editor-copy">
                <p className="admin-image-upload-copy">
                  Upload a workshop cover image or paste an external URL below.
                </p>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.85rem" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploadingCover}
                  >
                    {uploadingCover ? "Uploading..." : form.cover_image_url ? "Change Image" : "Upload Image"}
                  </button>
                  {form.cover_image_url ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => updateField("cover_image_url", "")}
                    >
                      Remove Image
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Cover Image URL</label>
            <input value={form.cover_image_url} onChange={(event) => updateField("cover_image_url", event.target.value)} placeholder="https://..." />
            <small>You can keep using a direct image URL if you prefer.</small>
          </div>

          <div className="form-group">
            <label>Tags</label>
            <input value={form.tags} onChange={(event) => updateField("tags", event.target.value)} placeholder="CPD, Webinar, Recording Available" />
            <small>Separate tags with commas. They will be saved as an array.</small>
          </div>

          <div className="form-row">
            <label className="workshop-checkbox">
              <input
                type="checkbox"
                checked={form.is_free}
                onChange={(event) => {
                  const checked = event.target.checked
                  setForm((current) => ({ ...current, is_free: checked, price: checked ? "" : current.price }))
                }}
              />
              <span>Free workshop</span>
            </label>
            <label className="workshop-checkbox">
              <input
                type="checkbox"
                checked={form.is_upcoming}
                onChange={(event) => updateField("is_upcoming", event.target.checked)}
              />
              <span>Show as upcoming</span>
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", flexWrap: "wrap" }}>
            <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={16} />
              {saving ? "Saving..." : editingId ? "Save Changes" : "Save Workshop"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={{ color: "var(--gray-500)" }}>Loading workshops...</p>
      ) : workshops.length === 0 ? (
        <div className="empty-state"><p>No workshops found yet. Add your first workshop.</p></div>
      ) : (
        <div className="workshops-list">
          {workshops.map((workshop) => (
            <div key={workshop.id} className="workshop-row">
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: "block", color: "var(--gray-900)", fontSize: "1rem", marginBottom: "0.35rem" }}>
                  {workshop.title || "Untitled workshop"}
                </strong>
                <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.45rem" }}>
                  <span className={`status ${workshop.is_free ? "published" : "draft"}`}>
                    {workshop.is_free ? "Free" : `KES ${Number(workshop.price || 0).toLocaleString()}`}
                  </span>
                  <span
                    className="status"
                    style={{
                      background: workshop.is_upcoming ? "#dcfce7" : "#e5e7eb",
                      color: workshop.is_upcoming ? "#166534" : "#4b5563"
                    }}
                  >
                    {workshop.is_upcoming ? "Upcoming" : "Past"}
                  </span>
                </div>
                <p style={{ margin: 0, color: "var(--gray-600)", fontSize: "0.9rem", lineHeight: 1.45 }}>
                  {formatWorkshopDate(workshop.date)} | {workshop.host_name || "Host not set"}
                </p>
              </div>

              <div className="workshop-meta">
                <span>{workshop.time || "Time not set"}</span>
                <span>{workshop.duration_minutes ? `${workshop.duration_minutes} min` : "Duration not set"}</span>
              </div>

              <div className="workshop-actions">
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => toggleUpcoming(workshop)}
                  disabled={togglingId === workshop.id}
                  style={{ minWidth: "128px", justifyContent: "center" }}
                >
                  {togglingId === workshop.id ? "Updating..." : workshop.is_upcoming ? "Mark Past" : "Mark Upcoming"}
                </button>
                <button className="btn-icon" title="Edit workshop" onClick={() => startEdit(workshop)}>
                  <Edit2 size={16} />
                </button>
                <button
                  className="btn-icon danger"
                  title="Delete workshop"
                  onClick={() => deleteWorkshop(workshop)}
                  disabled={deletingId === workshop.id}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const EMPTY_BLOG_FORM = {
  id: "",
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  content_sections: [],
  cover_image_url: "",
  author_name: "",
  author_title: "",
  category: "General",
  tags: "",
  is_published: false,
  published_at: null,
}

function slugifyPostTitle(value) {
  return `${value || ""}`
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function formatBlogDate(dateValue) {
  if (!dateValue) return "Draft"
  return new Date(dateValue).toLocaleDateString()
}

function getBlogSectionLabel(index, totalCount) {
  if (totalCount <= 1) return "Subsection"
  return `Subsection ${index + 1}`
}

function BlogRichTextEditor({ value, onChange }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || ""
    }
  }, [value])

  function exec(command, commandValue = null) {
    ref.current?.focus()
    document.execCommand(command, false, commandValue)
    onChange(ref.current?.innerHTML || "")
  }

  return (
    <div className="blog-editor">
      <div className="blog-editor-toolbar">
        {[["bold", "B"], ["italic", "I"], ["underline", "U"]].map(([command, label]) => (
          <button
            key={command}
            type="button"
            className="blog-editor-btn"
            onMouseDown={(event) => {
              event.preventDefault()
              exec(command)
            }}
          >
            <span style={command === "bold" ? { fontWeight: 700 } : command === "italic" ? { fontStyle: "italic" } : { textDecoration: "underline" }}>
              {label}
            </span>
          </button>
        ))}
        <div className="blog-editor-sep" />
        <button type="button" className="blog-editor-btn" onMouseDown={(event) => { event.preventDefault(); exec("formatBlock", "h3") }}>
          H3
        </button>
        <button type="button" className="blog-editor-btn" onMouseDown={(event) => { event.preventDefault(); exec("formatBlock", "p") }}>
          P
        </button>
        <div className="blog-editor-sep" />
        <button type="button" className="blog-editor-btn" onMouseDown={(event) => { event.preventDefault(); exec("insertUnorderedList") }}>
          List
        </button>
        <button type="button" className="blog-editor-btn" onMouseDown={(event) => { event.preventDefault(); exec("insertOrderedList") }}>
          1. List
        </button>
        <div className="blog-editor-sep" />
        <button type="button" className="blog-editor-btn blog-editor-btn-danger" onMouseDown={(event) => { event.preventDefault(); exec("removeFormat") }}>
          Clear
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="blog-editor-area"
        data-placeholder="Write the full blog article here..."
        onInput={() => onChange(ref.current?.innerHTML || "")}
      />
    </div>
  )
}

function BlogDraftPreview({ form }) {
  const normalizedCategory = normalizeBlogCategory(form.category) || "General"
  const authorName = `${form.author_name || ""}`.trim() || "PharmaCourse Team"
  const authorTitle = `${form.author_title || ""}`.trim() || "Editorial Team"
  const contentSections = getPopulatedBlogSections(form.content_sections)
  const hasRichContent = /<[^>]+>/.test(`${form.content || ""}`)
  const previewDate = form.is_published && form.published_at ? formatBlogDate(form.published_at) : "Draft preview"
  const previewExcerpt = `${form.excerpt || ""}`.trim()
  const previewTitle = `${form.title || ""}`.trim() || "Untitled blog post"

  return (
    <div className="blog-draft-preview-wrap">
      <div className="blog-draft-preview-head">
        <div>
          <h4>Live Preview</h4>
          <p>Review how this article will look before you publish it.</p>
        </div>
        <span className={`blog-draft-preview-status${form.is_published ? " published" : ""}`}>
          {form.is_published ? "Marked for publish" : "Draft"}
        </span>
      </div>

      <article className="blog-draft-preview-card">
        <div className="blog-draft-preview-meta">
          <span className="blog-draft-preview-badge">{normalizedCategory}</span>
          <span>{previewDate}</span>
          <span>{authorName}</span>
        </div>

        <h1>{previewTitle}</h1>
        {previewExcerpt ? <p className="blog-draft-preview-subtitle">{previewExcerpt}</p> : null}

        <div className="blog-draft-preview-cover-frame">
          {form.cover_image_url ? (
            <img src={form.cover_image_url} alt={previewTitle} className="blog-draft-preview-cover" />
          ) : (
            <div className="blog-draft-preview-cover-fallback">
              <span>{normalizedCategory}</span>
            </div>
          )}
        </div>

        {`${form.content || ""}`.trim() ? (
          hasRichContent ? (
            <div
              className="blog-draft-preview-html"
              dangerouslySetInnerHTML={{ __html: form.content }}
            />
          ) : (
            <MarkdownContent content={form.content} className="markdown-content blog-draft-preview-markdown" />
          )
        ) : (
          <div className="blog-draft-preview-empty">Main article content will appear here.</div>
        )}

        {contentSections.length > 0 ? (
          <div className="blog-draft-preview-sections">
            {contentSections.map((section, index) => (
              <section key={`preview-section-${index}`} className="blog-draft-preview-section">
                <div className="blog-draft-preview-section-copy">
                  {section.title ? <h2>{section.title}</h2> : null}
                  {section.body ? (
                    <MarkdownContent
                      content={section.body}
                      className="markdown-content blog-draft-preview-markdown"
                    />
                  ) : (
                    <p className="blog-draft-preview-empty">Section copy will appear here.</p>
                  )}
                </div>

                {section.images.length > 0 ? (
                  <div className="blog-draft-preview-gallery">
                    {section.images.map((imageUrl, imageIndex) => (
                      <div key={`${imageUrl}-${imageIndex}`} className="blog-draft-preview-gallery-item">
                        <img src={imageUrl} alt={section.title || `Section image ${imageIndex + 1}`} />
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ))}
          </div>
        ) : null}

        <section className="blog-draft-preview-author">
          <div className="blog-draft-preview-author-avatar">{authorName.slice(0, 2).toUpperCase()}</div>
          <div>
            <h3>{authorName}</h3>
            <p>{authorTitle}</p>
          </div>
        </section>
      </article>
    </div>
  )
}

function BlogTab() {
  const [posts, setPosts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingSectionIndex, setUploadingSectionIndex] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [slugTouched, setSlugTouched] = useState(false)
  const [form, setForm] = useState(EMPTY_BLOG_FORM)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const coverInputRef = useRef(null)
  const sectionImageInputRefs = useRef({})

  const categorySuggestions = Array.from(
    new Set(
      categories
        .concat(
          posts
            .map((post) => `${post.category || ""}`.trim())
            .filter(Boolean)
        )
        .concat(`${form.category || ""}`.trim() ? [`${form.category || ""}`.trim()] : [])
        .map((category) => normalizeBlogCategory(category))
        .filter(Boolean)
    )
  ).sort((first, second) => first.localeCompare(second))

  useEffect(() => {
    loadPosts()
    loadCategories()
  }, [])

  async function loadPosts() {
    setLoading(true)
    setError("")

    const { data, error: loadError } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false })

    if (loadError) {
      setError(loadError.message)
      setPosts([])
    } else {
      setPosts(data || [])
    }

    setLoading(false)
  }

  async function loadCategories() {
    const { data, error: loadError } = await supabase
      .from("blog_categories")
      .select("name")
      .order("name", { ascending: true })

    if (!loadError) {
      setCategories((data || []).map((category) => normalizeBlogCategory(category.name)).filter(Boolean))
    }
  }

  function resetForm() {
    setForm(EMPTY_BLOG_FORM)
    setEditingId(null)
    setSlugTouched(false)
    setShowForm(false)
    setShowPreview(true)
  }

  function startCreate() {
    setError("")
    setMessage("")
    setEditingId(null)
    setSlugTouched(false)
    setForm(EMPTY_BLOG_FORM)
    setShowForm(true)
    setShowPreview(true)
  }

  function startEdit(post) {
    setError("")
    setMessage("")
    setEditingId(post.id)
    setSlugTouched(true)
    setForm({
      id: post.id || "",
      title: post.title || "",
      slug: post.slug || "",
      excerpt: post.excerpt || "",
      content: post.content || "",
      content_sections: normalizeBlogSections(post.content_sections),
      cover_image_url: post.cover_image_url || "",
      author_name: post.author_name || "",
      author_title: post.author_title || "",
      category: post.category || "General",
      tags: Array.isArray(post.tags) ? post.tags.join(", ") : "",
      is_published: !!post.is_published,
      published_at: post.published_at || null,
    })
    setShowForm(true)
    setShowPreview(true)
  }

  function updateTitle(nextTitle) {
    setForm((current) => ({
      ...current,
      title: nextTitle,
      slug: slugTouched ? current.slug : slugifyPostTitle(nextTitle),
    }))
  }

  function updateSlug(nextSlug) {
    setSlugTouched(true)
    setForm((current) => ({ ...current, slug: slugifyPostTitle(nextSlug) }))
  }

  function updateCategory(nextCategory) {
    setForm((current) => ({ ...current, category: nextCategory }))
  }

  function normalizeCategoryField() {
    setForm((current) => ({
      ...current,
      category: normalizeBlogCategory(current.category),
    }))
  }

  function addContentSection() {
    setForm((current) => ({
      ...current,
      content_sections: [...normalizeBlogSections(current.content_sections), createEmptyBlogSection()],
    }))
  }

  function updateContentSection(index, field, value) {
    setForm((current) => ({
      ...current,
      content_sections: normalizeBlogSections(current.content_sections).map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, [field]: value } : section
      ),
    }))
  }

  function removeContentSection(index) {
    setForm((current) => ({
      ...current,
      content_sections: normalizeBlogSections(current.content_sections).filter((_, sectionIndex) => sectionIndex !== index),
    }))
  }

  function addSectionImageUrl(index, value) {
    const normalizedValue = `${value || ""}`.trim()
    if (!normalizedValue) return

    setForm((current) => ({
      ...current,
      content_sections: normalizeBlogSections(current.content_sections).map((section, sectionIndex) => {
        if (sectionIndex !== index) return section
        return {
          ...section,
          images: [...section.images, normalizedValue],
        }
      }),
    }))
  }

  function removeSectionImage(index, imageIndex) {
    setForm((current) => ({
      ...current,
      content_sections: normalizeBlogSections(current.content_sections).map((section, sectionIndex) => {
        if (sectionIndex !== index) return section
        return {
          ...section,
          images: section.images.filter((_, currentImageIndex) => currentImageIndex !== imageIndex),
        }
      }),
    }))
  }

  async function handleCoverUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingCover(true)
    setError("")
    setMessage("")

    try {
      const publicUrl = await uploadImageToMedia(file, "blog")
      setForm((current) => ({ ...current, cover_image_url: publicUrl }))
      setMessage("Blog cover uploaded. Save the post to keep it.")
    } catch (uploadError) {
      setError(uploadError.message || "Unable to upload blog cover.")
    } finally {
      setUploadingCover(false)
      event.target.value = ""
    }
  }

  async function handleSectionImageUpload(index, event) {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    setUploadingSectionIndex(index)
    setError("")
    setMessage("")

    try {
      const uploadedUrls = []
      for (const file of files) {
        const publicUrl = await uploadImageToMedia(file, "blog/sections")
        uploadedUrls.push(publicUrl)
      }

      setForm((current) => ({
        ...current,
        content_sections: normalizeBlogSections(current.content_sections).map((section, sectionIndex) => {
          if (sectionIndex !== index) return section
          return {
            ...section,
            images: [...section.images, ...uploadedUrls],
          }
        }),
      }))
      setMessage(`${uploadedUrls.length} section image${uploadedUrls.length === 1 ? "" : "s"} uploaded. Save the post to keep ${uploadedUrls.length === 1 ? "it" : "them"}.`)
    } catch (uploadError) {
      setError(uploadError.message || "Unable to upload subsection images.")
    } finally {
      setUploadingSectionIndex(null)
      event.target.value = ""
    }
  }

  async function savePost(event) {
    event.preventDefault()

    const finalSlug = slugifyPostTitle(form.slug || form.title)

    if (!form.title.trim()) {
      setError("Post title is required.")
      return
    }

    if (!finalSlug) {
      setError("Post slug is required.")
      return
    }

    if (!`${form.content || ""}`.trim() && !hasPopulatedBlogSections(form.content_sections)) {
      setError("Add intro content or at least one subsection before saving.")
      return
    }

    setSaving(true)
    setError("")
    setMessage("")

    const tagList = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
    const contentSections = getPopulatedBlogSections(form.content_sections).map((section) => ({
      title: section.title,
      body: section.body,
      images: section.images,
    }))
    const normalizedCategory = normalizeBlogCategory(form.category) || "General"

    const shouldSetPublishedAt = form.is_published && !form.published_at
    const payload = {
      id: editingId || form.id || crypto.randomUUID(),
      slug: finalSlug,
      title: form.title.trim(),
      excerpt: form.excerpt.trim() || null,
      content: form.content,
      content_sections: contentSections,
      cover_image_url: form.cover_image_url.trim() || null,
      author_name: form.author_name.trim() || null,
      author_title: form.author_title.trim() || null,
      category: normalizedCategory,
      tags: tagList,
      is_published: !!form.is_published,
      published_at: shouldSetPublishedAt ? new Date().toISOString() : form.published_at,
    }

    const { error: saveError } = await supabase
      .from("blog_posts")
      .upsert(payload, { onConflict: "id" })

    if (saveError) {
      setError(`${saveError.message}. If this is a permissions issue, re-run supabase/blog_posts_setup.sql in Supabase.`)
    } else {
      try {
        await ensureBlogCategoryRecord(normalizedCategory)
      } catch (categoryError) {
        console.error("Failed to sync blog category:", categoryError)
      }

      setMessage(editingId ? "Blog post updated successfully." : "Blog post created successfully.")
      resetForm()
      await loadPosts()
      await loadCategories()
    }

    setSaving(false)
  }

  async function togglePublished(post) {
    setTogglingId(post.id)
    setError("")
    setMessage("")

    const nextPublished = !post.is_published
    const payload = {
      is_published: nextPublished,
      published_at: nextPublished && !post.published_at ? new Date().toISOString() : post.published_at,
    }

    const { error: toggleError } = await supabase
      .from("blog_posts")
      .update(payload)
      .eq("id", post.id)

    if (toggleError) {
      setError(toggleError.message)
    } else {
      setMessage(`Post ${nextPublished ? "published" : "moved to draft"} successfully.`)
      await loadPosts()
    }

    setTogglingId(null)
  }

  async function deletePost(post) {
    if (!window.confirm(`Delete blog post ${post.title || "this record"}?`)) return

    setDeletingId(post.id)
    setError("")
    setMessage("")

    const { error: deleteError } = await supabase
      .from("blog_posts")
      .delete()
      .eq("id", post.id)

    if (deleteError) {
      setError(deleteError.message)
    } else {
      setMessage("Blog post deleted successfully.")
      if (editingId === post.id) resetForm()
      await loadPosts()
    }

    setDeletingId(null)
  }

  return (
    <div className="admin-section">
      <div className="section-header">
        <div>
          <h2>Blog</h2>
          <p style={{ color: "var(--gray-500)", marginTop: "0.4rem" }}>
            Manage editorial posts, publishing status, authors, and article content from one place.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button className="btn-secondary" onClick={loadPosts}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn-primary" onClick={startCreate}>
            <Plus size={16} /> New Post
          </button>
        </div>
      </div>

      {message && (
        <div style={{ marginBottom: "1rem", padding: "0.9rem 1rem", borderRadius: "0.75rem", background: "#dcfce7", color: "#166534", fontWeight: 600 }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: "1rem", padding: "0.9rem 1rem", borderRadius: "0.75rem", background: "#fee2e2", color: "#991b1b", fontWeight: 600 }}>
          {error}
        </div>
      )}

      {showForm && (
        <form className="instructor-form-card" onSubmit={savePost}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: 0 }}>{editingId ? "Edit Blog Post" : "New Blog Post"}</h3>
              <p style={{ margin: "0.35rem 0 0", color: "var(--gray-500)", fontSize: "0.9rem" }}>
                Draft or publish articles for the public blog section.
              </p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setShowPreview((current) => !current)}>
              <Eye size={16} />
              {showPreview ? "Hide Preview" : "Show Preview"}
            </button>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Title</label>
              <input value={form.title} onChange={(event) => updateTitle(event.target.value)} placeholder="How to Prepare for Pharmacy Board Exams" required />
            </div>
            <div className="form-group">
              <label>Slug</label>
              <input value={form.slug} onChange={(event) => updateSlug(event.target.value)} placeholder="how-to-prepare-for-pharmacy-board-exams" required />
            </div>
          </div>

          <div className="form-group">
            <label>Category</label>
            <input
              list="blog-category-suggestions"
              value={form.category}
              onChange={(event) => updateCategory(event.target.value)}
              onBlur={normalizeCategoryField}
              placeholder="Clinical, AI, Business, Finance, Sports..."
            />
            <datalist id="blog-category-suggestions">
              {categorySuggestions.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
            <small>Type any category you want. Existing categories will appear as suggestions.</small>
          </div>

          <div className="form-group">
            <label>Cover Image</label>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleCoverUpload}
            />
            <div className="instructor-photo-editor">
              <div className="admin-image-upload-preview">
                {form.cover_image_url ? (
                  <img
                    src={form.cover_image_url}
                    alt={form.title || "Blog cover preview"}
                    className="admin-image-upload-preview-image"
                  />
                ) : (
                  <div className="admin-image-upload-placeholder">
                    <span>No cover image</span>
                  </div>
                )}
              </div>
              <div className="instructor-photo-editor-copy">
                <p className="admin-image-upload-copy">
                  Upload a blog cover image or paste an external URL below.
                </p>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.85rem" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploadingCover}
                  >
                    {uploadingCover ? "Uploading..." : form.cover_image_url ? "Change Image" : "Upload Image"}
                  </button>
                  {form.cover_image_url ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setForm((current) => ({ ...current, cover_image_url: "" }))}
                    >
                      Remove Image
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Cover Image URL</label>
            <input value={form.cover_image_url} onChange={(event) => setForm((current) => ({ ...current, cover_image_url: event.target.value }))} placeholder="https://..." />
            <small>You can keep using a direct image URL if you prefer.</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Author Name</label>
              <input value={form.author_name} onChange={(event) => setForm((current) => ({ ...current, author_name: event.target.value }))} placeholder="Julius Wanjau" />
            </div>
            <div className="form-group">
              <label>Author Title</label>
              <input value={form.author_title} onChange={(event) => setForm((current) => ({ ...current, author_title: event.target.value }))} placeholder="Pharmacy Educator" />
            </div>
          </div>

          <div className="form-group">
            <label>Excerpt</label>
            <textarea rows={2} value={form.excerpt} onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))} placeholder="Short article summary shown on cards and previews." />
          </div>

          <div className="form-group">
            <label>Content</label>
            <BlogRichTextEditor value={form.content} onChange={(nextValue) => setForm((current) => ({ ...current, content: nextValue }))} />
          </div>

          <div className="blog-sections-builder">
            <div className="blog-sections-header">
              <div>
                <h4>Subsections</h4>
                <p>
                  Add smaller sections under the main article. Each section can have its own heading, body, and image.
                </p>
              </div>
              <button type="button" className="btn-secondary" onClick={addContentSection}>
                <Plus size={16} /> Add Subsection
              </button>
            </div>

            {normalizeBlogSections(form.content_sections).length === 0 ? (
              <div className="blog-section-empty">
                <p>No subsections added yet. Use this when you want image-backed blocks inside the article.</p>
              </div>
            ) : (
              <div className="blog-sections-list">
                {normalizeBlogSections(form.content_sections).map((section, index, sections) => (
                  <div key={`blog-section-${index}`} className="blog-section-card">
                    <div className="blog-section-card-head">
                      <div>
                        <span className="blog-section-kicker">{getBlogSectionLabel(index, sections.length)}</span>
                        <h5>{section.title?.trim() || `Section ${index + 1}`}</h5>
                      </div>
                      <button
                        type="button"
                        className="btn-icon danger"
                        title="Remove subsection"
                        onClick={() => removeContentSection(index)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="form-group">
                      <label>Section Title</label>
                      <input
                        value={section.title}
                        onChange={(event) => updateContentSection(index, "title", event.target.value)}
                        placeholder="Key regulation updates for retail pharmacies"
                      />
                    </div>

                    <div className="form-group">
                      <label>Section Image</label>
                      <input
                        ref={(node) => {
                          if (node) {
                            sectionImageInputRefs.current[index] = node
                          } else {
                            delete sectionImageInputRefs.current[index]
                          }
                        }}
                        type="file"
                        multiple
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(event) => handleSectionImageUpload(index, event)}
                      />
                      <div className="instructor-photo-editor">
                        <div className="blog-section-gallery-preview">
                          {section.images.length > 0 ? (
                            section.images.map((imageUrl, imageIndex) => (
                              <div key={`${index}-${imageIndex}`} className="blog-section-gallery-thumb">
                                <img
                                  src={imageUrl}
                                  alt={section.title || `Blog subsection ${index + 1}`}
                                  className="blog-section-gallery-thumb-image"
                                />
                                <button
                                  type="button"
                                  className="blog-section-gallery-remove"
                                  onClick={() => removeSectionImage(index, imageIndex)}
                                  aria-label={`Remove section image ${imageIndex + 1}`}
                                >
                                  ×
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="admin-image-upload-preview">
                              <div className="admin-image-upload-placeholder">
                                <span>No section images</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="instructor-photo-editor-copy">
                          <p className="admin-image-upload-copy">
                            Upload one or many inline images for this subsection. They will render as a small animated gallery on the live blog post.
                          </p>
                          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.85rem" }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => sectionImageInputRefs.current[index]?.click()}
                              disabled={uploadingSectionIndex === index}
                            >
                              {uploadingSectionIndex === index ? "Uploading..." : section.images.length > 0 ? "Add More Images" : "Upload Images"}
                            </button>
                            {section.images.length > 0 ? (
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => updateContentSection(index, "images", [])}
                              >
                                Clear Images
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Add External Image URL</label>
                      <div className="blog-section-url-row">
                        <input
                          value={section.pending_image_url || ""}
                          onChange={(event) => updateContentSection(index, "pending_image_url", event.target.value)}
                          placeholder="https://..."
                        />
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            addSectionImageUrl(index, section.pending_image_url)
                            updateContentSection(index, "pending_image_url", "")
                          }}
                        >
                          Add Image
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Section Body</label>
                      <textarea
                        rows={6}
                        value={section.body}
                        onChange={(event) => updateContentSection(index, "body", event.target.value)}
                        placeholder="Write the section body here. You can use paragraphs, lists, and simple markdown."
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Tags</label>
            <input value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} placeholder="CPD, Career, Clinical Practice" />
            <small>Separate tags with commas. They will be saved as an array.</small>
          </div>

          <label className="workshop-checkbox" style={{ marginBottom: "1.5rem" }}>
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(event) => setForm((current) => ({ ...current, is_published: event.target.checked }))}
            />
            <span>Publish this post</span>
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", flexWrap: "wrap" }}>
            <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={16} />
              {saving ? "Saving..." : editingId ? "Save Changes" : "Save Post"}
            </button>
          </div>

          {showPreview ? <BlogDraftPreview form={form} /> : null}
        </form>
      )}

      {loading ? (
        <p style={{ color: "var(--gray-500)" }}>Loading blog posts...</p>
      ) : posts.length === 0 ? (
        <div className="empty-state"><p>No blog posts found yet. Create your first article.</p></div>
      ) : (
        <>
          <div className="blog-posts-table-head">
            <span>Title</span>
            <span>Category</span>
            <span>Author</span>
            <span>Published</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          <div className="blog-posts-list">
            {posts.map((post) => (
              <div key={post.id} className="blog-post-row">
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: "block", color: "var(--gray-900)", fontSize: "0.96rem", marginBottom: "0.3rem" }}>
                    {post.title || "Untitled post"}
                  </strong>
                  <p style={{ margin: 0, color: "var(--gray-500)", fontSize: "0.82rem", lineHeight: 1.45 }}>
                    /{post.slug || "no-slug"}
                  </p>
                </div>

                <div className="instructor-cell">
                  {post.category || <span style={{ color: "var(--gray-500)" }}>Not set</span>}
                </div>

                <div className="instructor-cell">
                  {post.author_name || <span style={{ color: "var(--gray-500)" }}>Not set</span>}
                </div>

                <div className="instructor-cell">
                  {formatBlogDate(post.published_at)}
                </div>

                <div>
                  <button
                    type="button"
                    className={`btn-secondary${post.is_published ? "" : ""}`}
                    onClick={() => togglePublished(post)}
                    disabled={togglingId === post.id}
                    style={{
                      minWidth: "110px",
                      justifyContent: "center",
                      background: post.is_published ? "#dcfce7" : "#fff",
                      color: post.is_published ? "#166534" : "var(--primary)",
                      borderColor: post.is_published ? "#bbf7d0" : "var(--gray-300)",
                    }}
                  >
                    {togglingId === post.id ? "Updating..." : post.is_published ? "Published" : "Draft"}
                  </button>
                </div>

                <div className="course-actions">
                  <button className="btn-icon" title="Edit post" onClick={() => startEdit(post)}>
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="btn-icon danger"
                    title="Delete post"
                    onClick={() => deletePost(post)}
                    disabled={deletingId === post.id}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function BlogCategoriesTab() {
  const [categories, setCategories] = useState([])
  const [postCounts, setPostCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ id: "", name: "", is_active: true })
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError("")

    const [categoriesResponse, postsResponse] = await Promise.all([
      supabase.from("blog_categories").select("*").order("name", { ascending: true }),
      supabase.from("blog_posts").select("category"),
    ])

    if (categoriesResponse.error) {
      setError(`${categoriesResponse.error.message}. Run supabase/blog_categories_setup.sql in Supabase to enable managed blog categories.`)
      setCategories([])
    } else {
      setCategories(categoriesResponse.data || [])
    }

    if (!postsResponse.error) {
      const counts = (postsResponse.data || []).reduce((accumulator, post) => {
        const key = normalizeBlogCategory(post.category)
        if (!key) return accumulator
        accumulator[key] = (accumulator[key] || 0) + 1
        return accumulator
      }, {})
      setPostCounts(counts)
    }

    setLoading(false)
  }

  function resetForm() {
    setForm({ id: "", name: "", is_active: true })
    setEditingId(null)
  }

  function startEdit(category) {
    setEditingId(category.id)
    setForm({
      id: category.id,
      name: normalizeBlogCategory(category.name),
      is_active: category.is_active ?? true,
    })
    setError("")
    setMessage("")
  }

  async function saveCategory(event) {
    event.preventDefault()

    const normalizedName = normalizeBlogCategory(form.name)
    if (!normalizedName) {
      setError("Category name is required.")
      return
    }

    setSaving(true)
    setError("")
    setMessage("")

    const existingCategory = categories.find((category) => category.id === editingId)
    const oldName = normalizeBlogCategory(existingCategory?.name)
    const payload = {
      id: editingId || form.id || crypto.randomUUID(),
      name: normalizedName,
      slug: slugifyBlogCategory(normalizedName),
      is_active: !!form.is_active,
    }

    const { error: saveError } = await supabase
      .from("blog_categories")
      .upsert(payload, { onConflict: "id" })

    if (saveError) {
      setError(saveError.message)
      setSaving(false)
      return
    }

    if (editingId && oldName && oldName !== normalizedName) {
      const { error: postsUpdateError } = await supabase
        .from("blog_posts")
        .update({ category: normalizedName })
        .eq("category", oldName)

      if (postsUpdateError) {
        setError(`Category saved, but related post categories could not be renamed automatically: ${postsUpdateError.message}`)
      }
    }

    setMessage(editingId ? "Blog category updated successfully." : "Blog category added successfully.")
    resetForm()
    await loadData()
    setSaving(false)
  }

  async function toggleCategory(category) {
    setError("")
    setMessage("")

    const { error: toggleError } = await supabase
      .from("blog_categories")
      .update({ is_active: !category.is_active })
      .eq("id", category.id)

    if (toggleError) {
      setError(toggleError.message)
    } else {
      setMessage(`Category ${category.is_active ? "hidden from" : "shown on"} public blog filters.`)
      await loadData()
    }
  }

  async function deleteCategory(category) {
    if (!window.confirm(`Delete blog category ${category.name}? This will not delete existing blog posts.`)) return

    setError("")
    setMessage("")

    const { error: deleteError } = await supabase
      .from("blog_categories")
      .delete()
      .eq("id", category.id)

    if (deleteError) {
      setError(deleteError.message)
    } else {
      if (editingId === category.id) resetForm()
      setMessage("Blog category deleted successfully.")
      await loadData()
    }
  }

  async function syncUsedCategories() {
    setSyncing(true)
    setError("")
    setMessage("")

    const usedCategories = Object.keys(postCounts)
    if (usedCategories.length === 0) {
      setMessage("No blog post categories found to sync yet.")
      setSyncing(false)
      return
    }

    const payload = usedCategories.map((name) => ({
      name,
      slug: slugifyBlogCategory(name),
      is_active: true,
    }))

    const { error: syncError } = await supabase
      .from("blog_categories")
      .upsert(payload, { onConflict: "slug" })

    if (syncError) {
      setError(syncError.message)
    } else {
      setMessage("Existing post categories synced into the blog category manager.")
      await loadData()
    }

    setSyncing(false)
  }

  return (
    <div className="admin-section">
      <div className="section-header">
        <div>
          <h2>Blog Categories</h2>
          <p style={{ color: "var(--gray-500)", marginTop: "0.4rem" }}>
            Manage reusable blog categories, normalize naming, and control which ones appear in the public blog filters.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button className="btn-secondary" onClick={syncUsedCategories} disabled={syncing}>
            <RefreshCw size={16} /> {syncing ? "Syncing..." : "Sync Used Categories"}
          </button>
          <button className="btn-secondary" onClick={loadData}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {message && (
        <div style={{ marginBottom: "1rem", padding: "0.9rem 1rem", borderRadius: "0.75rem", background: "#dcfce7", color: "#166534", fontWeight: 600 }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: "1rem", padding: "0.9rem 1rem", borderRadius: "0.75rem", background: "#fee2e2", color: "#991b1b", fontWeight: 600 }}>
          {error}
        </div>
      )}

      <form className="instructor-form-card" onSubmit={saveCategory}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0 }}>{editingId ? "Edit Blog Category" : "Add Blog Category"}</h3>
            <p style={{ margin: "0.35rem 0 0", color: "var(--gray-500)", fontSize: "0.9rem" }}>
              Categories are auto-normalized, so entries like "clinical ai" become "Clinical AI".
            </p>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Category Name</label>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              onBlur={() => setForm((current) => ({ ...current, name: normalizeBlogCategory(current.name) }))}
              placeholder="Clinical AI"
              required
            />
          </div>
          <div className="form-group">
            <label>Slug</label>
            <input value={slugifyBlogCategory(form.name)} readOnly />
          </div>
        </div>

        <label className="workshop-checkbox" style={{ marginBottom: "1.5rem" }}>
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
          />
          <span>Show this category in public blog filters</span>
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", flexWrap: "wrap" }}>
          <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={16} />
            {saving ? "Saving..." : editingId ? "Save Changes" : "Save Category"}
          </button>
        </div>
      </form>

      {loading ? (
        <p style={{ color: "var(--gray-500)" }}>Loading categories...</p>
      ) : categories.length === 0 ? (
        <div className="empty-state"><p>No blog categories found yet. Add one or sync existing post categories.</p></div>
      ) : (
        <>
          <div className="blog-categories-table-head">
            <span>Name</span>
            <span>Slug</span>
            <span>Posts</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          <div className="blog-categories-list">
            {categories.map((category) => {
              const normalizedName = normalizeBlogCategory(category.name)
              return (
                <div key={category.id} className="blog-category-row">
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: "block", color: "var(--gray-900)", fontSize: "0.96rem", marginBottom: "0.25rem" }}>
                      {normalizedName}
                    </strong>
                  </div>

                  <div className="instructor-cell">/{category.slug || slugifyBlogCategory(normalizedName)}</div>
                  <div className="instructor-cell">{postCounts[normalizedName] || 0}</div>
                  <div>
                    <span
                      className="status"
                      style={{
                        background: category.is_active ? "#dcfce7" : "#e5e7eb",
                        color: category.is_active ? "#166534" : "#4b5563",
                      }}
                    >
                      {category.is_active ? "Active" : "Hidden"}
                    </span>
                  </div>

                  <div className="course-actions">
                    <button className="btn-secondary" type="button" onClick={() => toggleCategory(category)}>
                      {category.is_active ? "Hide" : "Show"}
                    </button>
                    <button className="btn-icon" title="Edit category" onClick={() => startEdit(category)}>
                      <Edit2 size={16} />
                    </button>
                    <button className="btn-icon danger" title="Delete category" onClick={() => deleteCategory(category)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

const EMPTY_TESTIMONIAL_FORM = {
  id: "",
  author_name: "",
  author_title: "",
  author_photo_url: "",
  rating: 5,
  review_text: "",
  is_published: false,
}

function sortTestimonials(rows) {
  return [...(rows || [])].sort((a, b) => {
    if (a.is_published !== b.is_published) {
      return a.is_published ? -1 : 1
    }

    const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0
    const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0
    return bCreated - aCreated
  })
}

function truncateTestimonial(text, max = 100) {
  const value = `${text || ""}`.trim()
  if (value.length <= max) return value
  return `${value.slice(0, max).trimEnd()}...`
}

function renderStars(rating) {
  return "★".repeat(Math.max(1, Math.min(5, Number(rating) || 0)))
}

function TestimonialsTab() {
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_TESTIMONIAL_FORM)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const authorPhotoInputRef = useRef(null)

  useEffect(() => {
    loadTestimonials()
  }, [])

  async function loadTestimonials() {
    setLoading(true)
    setError("")

    const { data, error: loadError } = await supabase
      .from("testimonials")
      .select("*")

    if (loadError) {
      setError(loadError.message)
      setTestimonials([])
    } else {
      setTestimonials(sortTestimonials(data || []))
    }

    setLoading(false)
  }

  function resetForm() {
    setForm(EMPTY_TESTIMONIAL_FORM)
    setEditingId(null)
    setShowForm(false)
  }

  function startCreate() {
    setError("")
    setMessage("")
    setEditingId(null)
    setForm(EMPTY_TESTIMONIAL_FORM)
    setShowForm(true)
  }

  function startEdit(testimonial) {
    setError("")
    setMessage("")
    setEditingId(testimonial.id)
    setForm({
      id: testimonial.id || "",
      author_name: testimonial.author_name || "",
      author_title: testimonial.author_title || "",
      author_photo_url: testimonial.author_photo_url || "",
      rating: testimonial.rating || 5,
      review_text: testimonial.review_text || "",
      is_published: !!testimonial.is_published,
    })
    setShowForm(true)
  }

  async function handleAuthorPhotoUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingPhoto(true)
    setError("")
    setMessage("")

    try {
      const publicUrl = await uploadImageToMedia(file, "testimonials")
      setForm((current) => ({ ...current, author_photo_url: publicUrl }))
      setMessage("Author photo uploaded. Save the testimonial to keep it.")
    } catch (uploadError) {
      setError(uploadError.message || "Unable to upload author photo.")
    } finally {
      setUploadingPhoto(false)
      event.target.value = ""
    }
  }

  async function saveTestimonial(event) {
    event.preventDefault()

    if (!form.author_name.trim()) {
      setError("Author name is required.")
      return
    }

    if (!form.review_text.trim()) {
      setError("Review text is required.")
      return
    }

    setSaving(true)
    setError("")
    setMessage("")

    const payload = {
      id: editingId || form.id || crypto.randomUUID(),
      author_name: form.author_name.trim(),
      author_title: form.author_title.trim() || null,
      author_photo_url: form.author_photo_url.trim() || null,
      rating: Number(form.rating) || 5,
      review_text: form.review_text.trim(),
      is_published: !!form.is_published,
    }

    const { error: saveError } = await supabase
      .from("testimonials")
      .upsert(payload, { onConflict: "id" })

    if (saveError) {
      setError(`${saveError.message}. If this is a permissions issue, re-run supabase/testimonials_setup.sql in Supabase.`)
    } else {
      setMessage(editingId ? "Testimonial updated successfully." : "Testimonial added successfully.")
      resetForm()
      await loadTestimonials()
    }

    setSaving(false)
  }

  async function togglePublished(testimonial) {
    setTogglingId(testimonial.id)
    setError("")
    setMessage("")

    const { error: toggleError } = await supabase
      .from("testimonials")
      .update({ is_published: !testimonial.is_published })
      .eq("id", testimonial.id)

    if (toggleError) {
      setError(toggleError.message)
    } else {
      setMessage(`Testimonial ${testimonial.is_published ? "hidden from the site" : "published to the site"}.`)
      await loadTestimonials()
    }

    setTogglingId(null)
  }

  async function deleteTestimonial(testimonial) {
    if (!window.confirm(`Delete testimonial from ${testimonial.author_name || "this author"}?`)) return

    setDeletingId(testimonial.id)
    setError("")
    setMessage("")

    const { error: deleteError } = await supabase
      .from("testimonials")
      .delete()
      .eq("id", testimonial.id)

    if (deleteError) {
      setError(deleteError.message)
    } else {
      setMessage("Testimonial deleted successfully.")
      if (editingId === testimonial.id) resetForm()
      await loadTestimonials()
    }

    setDeletingId(null)
  }

  return (
    <div className="admin-section">
      <div className="section-header">
        <div>
          <h2>Testimonials</h2>
          <p style={{ color: "var(--gray-500)", marginTop: "0.4rem" }}>
            Manage learner reviews shown on the homepage and control which ones are published.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button className="btn-secondary" onClick={loadTestimonials}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn-primary" onClick={startCreate}>
            <Plus size={16} /> Add Testimonial
          </button>
        </div>
      </div>

      {message && (
        <div style={{ marginBottom: "1rem", padding: "0.9rem 1rem", borderRadius: "0.75rem", background: "#dcfce7", color: "#166534", fontWeight: 600 }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: "1rem", padding: "0.9rem 1rem", borderRadius: "0.75rem", background: "#fee2e2", color: "#991b1b", fontWeight: 600 }}>
          {error}
        </div>
      )}

      {showForm && (
        <form className="instructor-form-card" onSubmit={saveTestimonial}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: 0 }}>{editingId ? "Edit Testimonial" : "Add Testimonial"}</h3>
              <p style={{ margin: "0.35rem 0 0", color: "var(--gray-500)", fontSize: "0.9rem" }}>
                Update testimonial content, rating, and publish state for the homepage.
              </p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Author Name</label>
              <input value={form.author_name} onChange={(event) => setForm((current) => ({ ...current, author_name: event.target.value }))} placeholder="Grace Wanjiku" required />
            </div>
            <div className="form-group">
              <label>Author Title</label>
              <input value={form.author_title} onChange={(event) => setForm((current) => ({ ...current, author_title: event.target.value }))} placeholder="Pharmacist in Charge" />
            </div>
          </div>

          <div className="form-group">
            <label>Author Photo</label>
            <input
              ref={authorPhotoInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAuthorPhotoUpload}
            />
            <div className="instructor-photo-editor">
              <div className="instructor-photo-preview">
                {form.author_photo_url ? (
                  <img
                    src={form.author_photo_url}
                    alt={form.author_name || "Author photo preview"}
                    className="instructor-photo-preview-image"
                  />
                ) : (
                  <div className="instructor-avatar instructor-avatar-fallback instructor-photo-preview-fallback">
                    {getInstructorInitials(form.author_name)}
                  </div>
                )}
              </div>
              <div className="instructor-photo-editor-copy">
                <p className="admin-image-upload-copy">
                  Upload an author photo or paste an external URL below.
                </p>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.85rem" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => authorPhotoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? "Uploading..." : form.author_photo_url ? "Change Photo" : "Upload Photo"}
                  </button>
                  {form.author_photo_url ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setForm((current) => ({ ...current, author_photo_url: "" }))}
                    >
                      Remove Photo
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Author Photo URL</label>
              <input value={form.author_photo_url} onChange={(event) => setForm((current) => ({ ...current, author_photo_url: event.target.value }))} placeholder="https://..." />
              <small>You can keep using a direct image URL if you prefer.</small>
            </div>
            <div className="form-group">
              <label>Rating</label>
              <select value={form.rating} onChange={(event) => setForm((current) => ({ ...current, rating: Number(event.target.value) }))}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Review Text</label>
            <textarea rows={4} value={form.review_text} onChange={(event) => setForm((current) => ({ ...current, review_text: event.target.value }))} placeholder="Share the learner's feedback here." required />
          </div>

          <label className="workshop-checkbox" style={{ marginBottom: "1.5rem" }}>
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(event) => setForm((current) => ({ ...current, is_published: event.target.checked }))}
            />
            <span>Publish this testimonial</span>
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", flexWrap: "wrap" }}>
            <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={16} />
              {saving ? "Saving..." : editingId ? "Save Changes" : "Save Testimonial"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={{ color: "var(--gray-500)" }}>Loading testimonials...</p>
      ) : testimonials.length === 0 ? (
        <div className="empty-state"><p>No testimonials found yet. Add your first testimonial.</p></div>
      ) : (
        <div className="testimonials-admin-grid">
          {testimonials.map((testimonial) => (
            <article key={testimonial.id} className="testimonial-admin-card">
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.9rem" }}>
                <div>
                  <div className="testimonial-admin-stars">{renderStars(testimonial.rating)}</div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                    <span
                      className="status"
                      style={{
                        background: testimonial.is_published ? "#dcfce7" : "#e5e7eb",
                        color: testimonial.is_published ? "#166534" : "#4b5563"
                      }}
                    >
                      {testimonial.is_published ? "Published" : "Unpublished"}
                    </span>
                  </div>
                </div>
                <div className="course-actions">
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => togglePublished(testimonial)}
                    disabled={togglingId === testimonial.id}
                    style={{ minWidth: "108px", justifyContent: "center" }}
                  >
                    {togglingId === testimonial.id ? "Updating..." : testimonial.is_published ? "Hide" : "Publish"}
                  </button>
                  <button className="btn-icon" title="Edit testimonial" onClick={() => startEdit(testimonial)}>
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="btn-icon danger"
                    title="Delete testimonial"
                    onClick={() => deleteTestimonial(testimonial)}
                    disabled={deletingId === testimonial.id}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <p className="testimonial-admin-review">
                {truncateTestimonial(testimonial.review_text, 100)}
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginTop: "1rem" }}>
                {testimonial.author_photo_url ? (
                  <img
                    src={testimonial.author_photo_url}
                    alt={testimonial.author_name || "Testimonial author"}
                    className="instructor-avatar"
                  />
                ) : (
                  <div className="instructor-avatar instructor-avatar-fallback">
                    {getInstructorInitials(testimonial.author_name)}
                  </div>
                )}

                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: "block", color: "var(--gray-900)", fontSize: "0.95rem" }}>
                    {testimonial.author_name || "Unnamed author"}
                  </strong>
                  <p style={{ margin: "0.25rem 0 0", color: "var(--gray-500)", fontSize: "0.82rem" }}>
                    {testimonial.author_title || "Title not set"}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function getLeaderboardRankBadge(rank) {
  if (rank === 1) return { label: "★ Gold", bg: "#fff7d6", color: "#b7791f" }
  if (rank === 2) return { label: "✦ Silver", bg: "#f3f4f6", color: "#6b7280" }
  if (rank === 3) return { label: "• Bronze", bg: "#fce7d6", color: "#c05621" }
  return null
}

function LeaderboardTab() {
  const { isSuperAdmin } = useAuth()
  const [entries, setEntries] = useState([])
  const [period, setPeriod] = useState("all_time")
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)
  const [lastResetAt, setLastResetAt] = useState(null)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    loadLeaderboard("all_time")
    loadResetStatus()
  }, [])

  useEffect(() => {
    loadLeaderboard(period)
  }, [period])

  async function loadResetStatus() {
    const { data, error: resetError } = await supabase
      .from("leaderboard_reset_state")
      .select("last_reset_at")
      .eq("id", 1)
      .maybeSingle()

    if (!resetError) {
      setLastResetAt(data?.last_reset_at || null)
    }
  }

  async function loadLeaderboard(scope = period) {
    setLoading(true)
    setError("")

    const { data, error: loadError } = await supabase.rpc("get_leaderboard", { time_scope: scope })

    if (loadError) {
      setError(loadError.message)
      setEntries([])
    } else {
      setEntries(data || [])
    }

    setLoading(false)
  }

  async function resetMonthlyBoard() {
    if (!window.confirm("Reset the monthly leaderboard now? This will start this month's board over from the current time.")) return

    setResetting(true)
    setError("")
    setMessage("")

    const { data, error: resetError } = await supabase.rpc("reset_monthly_leaderboard")

    if (resetError) {
      setError(resetError.message)
    } else {
      setLastResetAt(data || new Date().toISOString())
      setMessage("Monthly leaderboard reset successfully.")
      if (period === "this_month") {
        await loadLeaderboard("this_month")
      }
    }

    setResetting(false)
  }

  return (
    <div className="admin-section">
      <div className="section-header">
        <div>
          <h2>Leaderboard</h2>
          <p style={{ color: "var(--gray-500)", marginTop: "0.4rem" }}>
            Review top learners by completed courses, CPD hours, and certificates across the platform.
          </p>
        </div>
        <div className="leaderboard-admin-controls">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setPeriod("all_time")}
            style={{
              background: period === "all_time" ? "var(--primary-light)" : "#fff",
              borderColor: period === "all_time" ? "var(--primary)" : "var(--gray-300)",
            }}
          >
            All Time
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setPeriod("this_month")}
            style={{
              background: period === "this_month" ? "var(--primary-light)" : "#fff",
              borderColor: period === "this_month" ? "var(--primary)" : "var(--gray-300)",
            }}
          >
            This Month
          </button>
          {isSuperAdmin && (
            <button type="button" className="btn-primary" onClick={resetMonthlyBoard} disabled={resetting}>
              <RefreshCw size={16} />
              {resetting ? "Resetting..." : "Reset Monthly Board"}
            </button>
          )}
        </div>
      </div>

      {lastResetAt && (
        <p style={{ margin: "0 0 1rem", color: "var(--gray-500)", fontSize: "0.9rem" }}>
          Last monthly reset: {new Date(lastResetAt).toLocaleString()}
        </p>
      )}

      {message && (
        <div style={{ marginBottom: "1rem", padding: "0.9rem 1rem", borderRadius: "0.75rem", background: "#dcfce7", color: "#166534", fontWeight: 600 }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: "1rem", padding: "0.9rem 1rem", borderRadius: "0.75rem", background: "#fee2e2", color: "#991b1b", fontWeight: 600 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: "var(--gray-500)" }}>Loading leaderboard...</p>
      ) : entries.length === 0 ? (
        <div className="empty-state"><p>No leaderboard data found for this period.</p></div>
      ) : (
        <>
          <div className="leaderboard-table-head">
            <span>Rank</span>
            <span>Name</span>
            <span>Completed Courses</span>
            <span>CPD Hours</span>
            <span>Certificates</span>
          </div>

          <div className="leaderboard-admin-list">
            {entries.slice(0, 20).map((entry, index) => {
              const rank = index + 1
              const badge = getLeaderboardRankBadge(rank)

              return (
                <div key={`${entry.user_id}-${rank}`} className="leaderboard-admin-row">
                  <div>
                    <strong style={{ display: "block", color: "var(--gray-900)", fontSize: "0.95rem" }}>
                      #{rank}
                    </strong>
                    {badge && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          marginTop: "0.35rem",
                          padding: "0.18rem 0.55rem",
                          borderRadius: "999px",
                          background: badge.bg,
                          color: badge.color,
                          fontSize: "0.74rem",
                          fontWeight: 700,
                        }}
                      >
                        {badge.label}
                      </span>
                    )}
                  </div>

                  <div className="instructor-cell">
                    {entry.display_name || "PharmaCourse Learner"}
                  </div>

                  <div className="instructor-cell">
                    {entry.completed_courses || 0}
                  </div>

                  <div className="instructor-cell">
                    {Number(entry.total_cpd_hours || 0)}
                  </div>

                  <div className="instructor-cell">
                    {entry.certificates_issued || 0}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

const EMPTY_TEAM_ENQUIRY_FORM = {
  name: "",
  organisation: "",
  email: "",
  phone: "",
  seats_needed: "",
  plan_tier: "starter",
  notes: "",
  status: "new",
}

function getTeamPlanTierLabel(tier) {
  if (tier === "starter") return "Starter"
  if (tier === "growth") return "Growth"
  if (tier === "enterprise") return "Enterprise"
  return tier || "Unknown"
}

function getTeamPlanStatusStyle(status) {
  if (status === "converted") return { bg: "#dcfce7", color: "#166534" }
  if (status === "contacted") return { bg: "#dbeafe", color: "#1d4ed8" }
  if (status === "closed") return { bg: "#e5e7eb", color: "#4b5563" }
  return { bg: "#fef3c7", color: "#92400e" }
}

function sortTeamPlanPricing(rows) {
  return [...(rows || [])].sort((a, b) => TEAM_PLAN_TIER_ORDER.indexOf(a.tier) - TEAM_PLAN_TIER_ORDER.indexOf(b.tier))
}

function TeamPlansTab() {
  const [enquiries, setEnquiries] = useState([])
  const [pricingRows, setPricingRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingEnquiry, setSavingEnquiry] = useState(false)
  const [savingPricingTier, setSavingPricingTier] = useState(null)
  const [editingPriceTier, setEditingPriceTier] = useState(null)
  const [priceDraft, setPriceDraft] = useState("")
  const [updatingEnquiryId, setUpdatingEnquiryId] = useState(null)
  const [deletingEnquiryId, setDeletingEnquiryId] = useState(null)
  const [showEnquiryForm, setShowEnquiryForm] = useState(false)
  const [enquiryForm, setEnquiryForm] = useState(EMPTY_TEAM_ENQUIRY_FORM)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    loadTeamPlansData()
  }, [])

  async function loadTeamPlansData() {
    setLoading(true)
    setError("")

    const [
      { data: enquiryData, error: enquiryError },
      { data: pricingData, error: pricingError },
    ] = await Promise.all([
      supabase.from("team_plan_enquiries").select("*").order("created_at", { ascending: false }),
      supabase.from("team_plan_pricing").select("*"),
    ])

    if (enquiryError || pricingError) {
      setError(enquiryError?.message || pricingError?.message || "Failed to load team plans data.")
      setEnquiries([])
      setPricingRows([])
    } else {
      setEnquiries(enquiryData || [])
      setPricingRows(sortTeamPlanPricing(pricingData || []))
    }

    setLoading(false)
  }

  function updatePricingField(tier, field, value) {
    setPricingRows((current) =>
      current.map((row) => row.tier === tier ? { ...row, [field]: value } : row)
    )
  }

  async function savePricingRow(row) {
    setSavingPricingTier(row.tier)
    setError("")
    setMessage("")

    const payload = {
      id: row.id,
      tier: row.tier,
      seats: row.seats === "" || row.seats === null ? null : Number(row.seats),
      price_kes: row.price_kes === "" || row.price_kes === null ? null : Number(row.price_kes),
      description: row.description?.trim() || null,
      features: Array.isArray(row.features)
        ? row.features.map((feature) => `${feature}`.trim()).filter(Boolean)
        : `${row.features || ""}`.split(",").map((feature) => feature.trim()).filter(Boolean),
      is_visible: !!row.is_visible,
    }

    const { error: saveError } = await supabase
      .from("team_plan_pricing")
      .upsert(payload, { onConflict: "tier" })

    if (saveError) {
      setError(saveError.message)
    } else {
      setMessage(`${getTeamPlanTierLabel(row.tier)} pricing updated.`)
      await loadTeamPlansData()
    }

    setSavingPricingTier(null)
  }

  function startPriceEdit(row) {
    setEditingPriceTier(row.tier)
    setPriceDraft(row.price_kes ?? "")
  }

  async function commitPriceEdit(row) {
    if (editingPriceTier !== row.tier) return

    setEditingPriceTier(null)
    const nextValue = priceDraft === "" ? null : Number(priceDraft)
    updatePricingField(row.tier, "price_kes", nextValue)
    await savePricingRow({ ...row, price_kes: nextValue })
  }

  async function updateEnquiryStatus(enquiryId, status) {
    setUpdatingEnquiryId(enquiryId)
    setError("")
    setMessage("")

    const { error: updateError } = await supabase
      .from("team_plan_enquiries")
      .update({ status })
      .eq("id", enquiryId)

    if (updateError) {
      setError(updateError.message)
    } else {
      setMessage("Enquiry status updated.")
      await loadTeamPlansData()
    }

    setUpdatingEnquiryId(null)
  }

  async function saveEnquiry(event) {
    event.preventDefault()

    if (!enquiryForm.name.trim() || !enquiryForm.organisation.trim()) {
      setError("Name and organisation are required.")
      return
    }

    setSavingEnquiry(true)
    setError("")
    setMessage("")

    const payload = {
      name: enquiryForm.name.trim(),
      organisation: enquiryForm.organisation.trim(),
      email: enquiryForm.email.trim() || null,
      phone: enquiryForm.phone.trim() || null,
      seats_needed: enquiryForm.seats_needed === "" ? null : Number(enquiryForm.seats_needed),
      plan_tier: enquiryForm.plan_tier,
      notes: enquiryForm.notes.trim() || null,
      status: enquiryForm.status,
    }

    const { error: saveError } = await supabase
      .from("team_plan_enquiries")
      .insert(payload)

    if (saveError) {
      setError(saveError.message)
    } else {
      setMessage("Enquiry logged successfully.")
      setEnquiryForm(EMPTY_TEAM_ENQUIRY_FORM)
      setShowEnquiryForm(false)
      await loadTeamPlansData()
    }

    setSavingEnquiry(false)
  }

  async function deleteEnquiry(enquiry) {
    if (!window.confirm(`Delete enquiry from ${enquiry.name || "this contact"}?`)) return

    setDeletingEnquiryId(enquiry.id)
    setError("")
    setMessage("")

    const { error: deleteError } = await supabase
      .from("team_plan_enquiries")
      .delete()
      .eq("id", enquiry.id)

    if (deleteError) {
      setError(deleteError.message)
    } else {
      setMessage("Enquiry deleted.")
      await loadTeamPlansData()
    }

    setDeletingEnquiryId(null)
  }

  return (
    <div className="admin-section">
      <div className="section-header">
        <div>
          <h2>Team Plans</h2>
          <p style={{ color: "var(--gray-500)", marginTop: "0.4rem" }}>
            Track inbound team plan leads and update the pricing shown on the public team plans page.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button className="btn-secondary" onClick={loadTeamPlansData}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn-primary" onClick={() => setShowEnquiryForm((current) => !current)}>
            <Plus size={16} /> {showEnquiryForm ? "Close Form" : "Add Enquiry"}
          </button>
        </div>
      </div>

      {message && (
        <div style={{ marginBottom: "1rem", padding: "0.9rem 1rem", borderRadius: "0.75rem", background: "#dcfce7", color: "#166534", fontWeight: 600 }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: "1rem", padding: "0.9rem 1rem", borderRadius: "0.75rem", background: "#fee2e2", color: "#991b1b", fontWeight: 600 }}>
          {error}
        </div>
      )}

      {showEnquiryForm && (
        <form className="instructor-form-card" onSubmit={saveEnquiry}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: 0 }}>Log Team Plan Enquiry</h3>
              <p style={{ margin: "0.35rem 0 0", color: "var(--gray-500)", fontSize: "0.9rem" }}>
                Capture WhatsApp leads and keep follow-up status visible to the admin team.
              </p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Name</label>
              <input value={enquiryForm.name} onChange={(event) => setEnquiryForm((current) => ({ ...current, name: event.target.value }))} placeholder="Jane Mwangi" required />
            </div>
            <div className="form-group">
              <label>Organisation</label>
              <input value={enquiryForm.organisation} onChange={(event) => setEnquiryForm((current) => ({ ...current, organisation: event.target.value }))} placeholder="CityCare Pharmacy" required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input value={enquiryForm.email} onChange={(event) => setEnquiryForm((current) => ({ ...current, email: event.target.value }))} placeholder="jane@citycare.co.ke" />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input value={enquiryForm.phone} onChange={(event) => setEnquiryForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+254..." />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Seats Needed</label>
              <input type="number" min="1" value={enquiryForm.seats_needed} onChange={(event) => setEnquiryForm((current) => ({ ...current, seats_needed: event.target.value }))} placeholder="20" />
            </div>
            <div className="form-group">
              <label>Plan Tier</label>
              <select value={enquiryForm.plan_tier} onChange={(event) => setEnquiryForm((current) => ({ ...current, plan_tier: event.target.value }))}>
                {TEAM_PLAN_TIER_ORDER.map((tier) => (
                  <option key={tier} value={tier}>{getTeamPlanTierLabel(tier)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select value={enquiryForm.status} onChange={(event) => setEnquiryForm((current) => ({ ...current, status: event.target.value }))}>
                {["new", "contacted", "converted", "closed"].map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea rows={3} value={enquiryForm.notes} onChange={(event) => setEnquiryForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Conversation notes, pricing context, or next step." />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", flexWrap: "wrap" }}>
            <button type="button" className="btn-secondary" onClick={() => { setShowEnquiryForm(false); setEnquiryForm(EMPTY_TEAM_ENQUIRY_FORM) }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={savingEnquiry}>
              <Save size={16} />
              {savingEnquiry ? "Saving..." : "Save Enquiry"}
            </button>
          </div>
        </form>
      )}

      <div className="team-plans-admin-grid">
        <section className="team-plans-admin-panel">
          <div className="team-plans-admin-heading">
            <h3>Enquiries</h3>
            <p>Follow up bulk training leads and update their status inline.</p>
          </div>

          {loading ? (
            <p style={{ color: "var(--gray-500)" }}>Loading enquiries...</p>
          ) : enquiries.length === 0 ? (
            <div className="empty-state"><p>No team plan enquiries logged yet.</p></div>
          ) : (
            <div className="team-enquiries-list">
              {enquiries.map((enquiry) => {
                const statusStyle = getTeamPlanStatusStyle(enquiry.status)
                return (
                  <article key={enquiry.id} className="team-enquiry-card">
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      <div>
                        <strong style={{ display: "block", color: "var(--gray-900)", fontSize: "0.98rem" }}>{enquiry.name}</strong>
                        <p style={{ margin: "0.25rem 0 0", color: "var(--gray-500)", fontSize: "0.84rem" }}>{enquiry.organisation}</p>
                      </div>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "0.22rem 0.65rem",
                        borderRadius: "999px",
                        background: statusStyle.bg,
                        color: statusStyle.color,
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        textTransform: "uppercase"
                      }}>
                        {enquiry.status}
                      </span>
                    </div>

                    <div className="team-enquiry-meta">
                      <span>{enquiry.email || "No email"}</span>
                      <span>{enquiry.phone || "No phone"}</span>
                      <span>{enquiry.seats_needed ? `${enquiry.seats_needed} seats` : "Seats not set"}</span>
                      <span>{getTeamPlanTierLabel(enquiry.plan_tier)}</span>
                    </div>

                    {enquiry.notes && (
                      <p className="team-enquiry-notes">{enquiry.notes}</p>
                    )}

                    <div className="team-enquiry-actions">
                      <select
                        value={enquiry.status}
                        onChange={(event) => updateEnquiryStatus(enquiry.id, event.target.value)}
                        disabled={updatingEnquiryId === enquiry.id}
                        className="team-status-select"
                      >
                        {["new", "contacted", "converted", "closed"].map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                      <button
                        className="btn-icon danger"
                        title="Delete enquiry"
                        onClick={() => deleteEnquiry(enquiry)}
                        disabled={deletingEnquiryId === enquiry.id}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="team-plans-admin-panel">
          <div className="team-plans-admin-heading">
            <h3>Pricing Editor</h3>
            <p>Update seat counts, public pricing, descriptions, and feature lists for each tier.</p>
          </div>

          {loading ? (
            <p style={{ color: "var(--gray-500)" }}>Loading pricing...</p>
          ) : (
            <div className="team-pricing-table">
              <div className="team-pricing-table-head">
                <span>Tier</span>
                <span>Seats</span>
                <span>Price (KES)</span>
                <span>Description</span>
                <span>Features</span>
                <span>Visible</span>
                <span>Actions</span>
              </div>

              {pricingRows.map((row) => (
                <div key={row.tier} className="team-pricing-row">
                  <div className="team-pricing-cell">
                    <strong>{getTeamPlanTierLabel(row.tier)}</strong>
                  </div>
                  <div className="team-pricing-cell">
                    <input
                      type="number"
                      min="0"
                      value={row.seats ?? ""}
                      onChange={(event) => updatePricingField(row.tier, "seats", event.target.value)}
                      className="team-pricing-input"
                    />
                  </div>
                  <div className="team-pricing-cell">
                    {editingPriceTier === row.tier ? (
                      <input
                        autoFocus
                        type="number"
                        min="0"
                        step="0.01"
                        value={priceDraft}
                        onChange={(event) => setPriceDraft(event.target.value)}
                        onBlur={() => commitPriceEdit(row)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault()
                            commitPriceEdit(row)
                          }
                          if (event.key === "Escape") {
                            setEditingPriceTier(null)
                          }
                        }}
                        className="team-pricing-input"
                      />
                    ) : (
                      <button type="button" className="team-price-display" onClick={() => startPriceEdit(row)}>
                        {row.price_kes === null || row.price_kes === "" ? "Custom pricing" : `KES ${Number(row.price_kes).toLocaleString()}`}
                      </button>
                    )}
                  </div>
                  <div className="team-pricing-cell">
                    <textarea
                      rows={3}
                      value={row.description || ""}
                      onChange={(event) => updatePricingField(row.tier, "description", event.target.value)}
                      className="team-pricing-textarea"
                    />
                  </div>
                  <div className="team-pricing-cell">
                    <textarea
                      rows={3}
                      value={Array.isArray(row.features) ? row.features.join(", ") : ""}
                      onChange={(event) => updatePricingField(row.tier, "features", event.target.value.split(",").map((feature) => feature.trim()))}
                      className="team-pricing-textarea"
                    />
                  </div>
                  <div className="team-pricing-cell">
                    <label className="team-visible-toggle">
                      <input
                        type="checkbox"
                        checked={!!row.is_visible}
                        onChange={(event) => updatePricingField(row.tier, "is_visible", event.target.checked)}
                      />
                      <span>{row.is_visible ? "Visible" : "Hidden"}</span>
                    </label>
                  </div>
                  <div className="team-pricing-cell">
                    <button
                      className="btn-primary"
                      onClick={() => savePricingRow(row)}
                      disabled={savingPricingTier === row.tier}
                    >
                      {savingPricingTier === row.tier ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function CourseEditorModal({ course, onClose, onSave }) {
  const { user } = useAuth()  // ← FIXED: get current user
  const [formData, setFormData] = useState(
    course.id === "new"
      ? { title: "", slug: "", description: "", short_desc: "", price: 0, is_free: false, is_published: false, category: "", image_url: "" }
      : course
  )
  const [modules, setModules] = useState([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const imageInputRef = useRef(null)

  useEffect(() => {
    if (course.id !== "new") loadModules()
  }, [course])

  async function loadModules() {
    const { data } = await supabase
      .from("course_modules")
      .select("*")
      .eq("course_id", course.id)
      .order("order_index")
    setModules(data || [])
  }

  async function saveCourse() {
    setSaving(true)
    if (!formData.slug && formData.title) {
      formData.slug = formData.title.toLowerCase().replace(/ /g, "-")
    }
    let error
    if (course.id === "new") {
      const result = await supabase.from("courses").insert([{
        ...formData,
        instructor_id: user.id  // ← FIXED: include instructor_id so RLS policy passes
      }]).select()
      error = result.error
    } else {
      const result = await supabase.from("courses").update(formData).eq("id", course.id)
      error = result.error
    }
    setSaving(false)
    if (!error) onSave()
    else alert("Error saving course: " + error.message)
  }

  async function addModule() {
    const { data } = await supabase.from("course_modules").insert([{
      course_id: course.id, title: "New Module", order_index: modules.length
    }]).select()
    if (data) setModules([...modules, data[0]])
  }

  async function updateModule(moduleId, updates) {
    try {
      const { error } = await supabase.from("course_modules").update(updates).eq("id", moduleId)
      if (error) throw error
      await loadModules()
    } catch (err) {
      console.error("Error updating module:", err)
      alert("Error updating module: " + err.message)
    }
  }

  async function deleteModule(moduleId) {
    if (confirm("Delete module?")) {
      try {
        const { error } = await supabase.from("course_modules").delete().eq("id", moduleId)
        if (error) throw error
        await loadModules()
      } catch (err) {
        console.error("Error deleting module:", err)
        alert("Error deleting module: " + err.message)
      }
    }
  }

  async function uploadCourseImage(file) {
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file (jpg, png, etc.)")
      return
    }

    setUploading(true)
    try {
      const safeName = `courses/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, "_")}`
      const { data, error } = await supabase.storage
        .from("media")
        .upload(safeName, file, { cacheControl: "3600", upsert: false })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from("media")
        .getPublicUrl(safeName)

      setFormData({ ...formData, image_url: urlData.publicUrl })
    } catch (err) {
      alert("Error uploading image: " + err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{course.id === "new" ? "Create Course" : "Edit Course"}</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        <div className="modal-body">
          <div className="form-section">
            <h4>Basic Information</h4>
            <div className="form-group">
              <label>Course Title *</label>
              <input value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Antimicrobial Stewardship for Pharmacists" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>URL Slug</label>
                <input value={formData.slug || ""}
                  onChange={e => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="antimicrobial-stewardship" />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={formData.category || ""}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}>
                  <option value="">Select Category</option>
                  <option value="Clinical Pharmacy">Clinical Pharmacy</option>
                  <option value="Pharmacy Management">Pharmacy Management</option>
                  <option value="Regulatory">Regulatory</option>
                  <option value="Hospital Practice">Hospital Practice</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Short Description</label>
              <textarea rows={2} value={formData.short_desc || ""}
                onChange={e => setFormData({ ...formData, short_desc: e.target.value })}
                placeholder="Brief description shown in course cards" />
            </div>
            <div className="form-group">
              <label>Full Description</label>
              <textarea rows={4} value={formData.description || ""}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Price (KES)</label>
                <input type="number" min="0" value={formData.price || 0}
                  onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  disabled={formData.is_free} />
              </div>
              <div className="form-group" style={{ justifyContent: "flex-end", paddingTop: "1.5rem" }}>
                <label>
                  <input type="checkbox" checked={formData.is_free}
                    onChange={e => setFormData({ ...formData, is_free: e.target.checked })} />
                  {" "}Free course
                </label>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>Course Image</h4>
            {!formData.image_url ? (
              <div
                style={{
                  border: "2px dashed var(--border)",
                  borderRadius: "0.5rem",
                  padding: "2rem",
                  textAlign: "center",
                  cursor: uploading ? "not-allowed" : "pointer",
                  opacity: uploading ? 0.6 : 1
                }}
                onClick={() => !uploading && imageInputRef.current?.click()}
              >
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={e => e.target.files?.[0] && uploadCourseImage(e.target.files[0])}
                />
                {uploading ? (
                  <div style={{ color: "var(--gray-500)" }}>
                    <div style={{ marginBottom: "0.5rem" }}>⏳ Uploading...</div>
                  </div>
                ) : (
                  <div style={{ color: "var(--gray-500)" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🖼️</div>
                    <div>Click to upload course thumbnail</div>
                    <small>JPG, PNG · Recommended: 600x400px</small>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <img
                  src={formData.image_url}
                  alt="Course"
                  style={{
                    width: "100%",
                    maxHeight: "200px",
                    borderRadius: "0.5rem",
                    objectFit: "cover"
                  }}
                />
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.85rem" }}>
                  <span style={{ color: "var(--green)", fontWeight: 600 }}>✓ Image uploaded</span>
                  <button
                    className="btn-icon danger"
                    title="Remove image"
                    onClick={() => setFormData({ ...formData, image_url: "" })}
                    style={{ marginLeft: "auto" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {course.id !== "new" && (
            <div className="form-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h4>Curriculum Modules</h4>
                <button className="btn-secondary" onClick={addModule}><Plus size={14} /> Add Module</button>
              </div>
              {modules.length === 0 ? (
                <p style={{ color: "var(--text-500)" }}>No modules yet. Add your first module to get started!</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {modules.map((mod, idx) => (
                    <ModuleEditor key={mod.id} module={mod} index={idx} onUpdate={updateModule} onDelete={deleteModule} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={saveCourse} disabled={saving} className="btn-primary">
            {saving ? "Saving..." : "Save Course"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── HOMEPAGE TAB ─────────────────────────────────────────────────────────────

function CertificateSettingsTab() {
  const [form, setForm] = useState(DEFAULT_CERTIFICATE_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const signatureInputRef = useRef(null)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    setError("")
    setMessage("")

    const { data, error } = await supabase
      .from("certificate_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle()

    if (error) {
      setError(`${error.message}. Re-run supabase/rls_reset.sql to create certificate settings.`)
      setForm(DEFAULT_CERTIFICATE_SETTINGS)
    } else {
      setForm(normalizeCertificateSettings(data))
    }

    setLoading(false)
  }

  async function uploadSignature(file) {
    setUploading(true)
    setError("")
    setMessage("")

    try {
      const extension = (file.name.split(".").pop() || "png").toLowerCase()
      const safeName = `certificates/signatures/${Date.now()}-signature.${extension}`
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(safeName, file, { cacheControl: "3600", upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from("media")
        .getPublicUrl(safeName)

      setForm((current) => ({ ...current, signature_image_url: urlData.publicUrl }))
      setMessage("Signature uploaded. Save settings to apply it to certificates.")
    } catch (uploadError) {
      setError(uploadError.message || "Unable to upload signature image.")
    } finally {
      setUploading(false)
    }
  }

  async function handleSignatureUpload(event) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file for the signature.")
      return
    }

    await uploadSignature(file)
  }

  async function saveSettings() {
    setSaving(true)
    setError("")
    setMessage("")

    const payload = {
      ...normalizeCertificateSettings(form),
      id: 1,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from("certificate_settings")
      .upsert(payload, { onConflict: "id" })

    if (error) {
      setError(error.message)
    } else {
      setMessage("Certificate settings saved successfully.")
    }

    setSaving(false)
  }

  const inputStyle = {
    width: "100%",
    padding: "0.8rem 0.95rem",
    borderRadius: "0.8rem",
    border: "1px solid var(--gray-300)",
    fontSize: "0.95rem",
    fontFamily: "inherit",
    background: "#fff",
  }

  if (loading) {
    return (
      <div className="admin-section">
        <div className="section-header">
          <h2>Certificate Design</h2>
        </div>
        <p style={{ color: "var(--gray-500)" }}>Loading certificate settings...</p>
      </div>
    )
  }

  return (
    <div className="admin-section">
      <div className="section-header">
        <div>
          <h2>Certificate Design</h2>
          <p style={{ color: "var(--gray-500)", marginTop: "0.35rem" }}>
            Manage one official signature and edit the certificate header, footer, and supporting text.
          </p>
        </div>
        <button className="btn-secondary" onClick={loadSettings}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {message && (
        <div style={{ marginBottom: "1rem", padding: "0.9rem 1rem", borderRadius: "0.75rem", background: "#dcfce7", color: "#166534", fontWeight: 600 }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: "1rem", padding: "0.9rem 1rem", borderRadius: "0.75rem", background: "#fee2e2", color: "#991b1b", fontWeight: 600 }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(320px, 0.9fr)", gap: "1.5rem", alignItems: "start" }}>
        <div style={{ display: "grid", gap: "1.25rem" }}>
          <section style={{ background: "#fff", border: "1px solid #e6ece8", borderRadius: "1rem", padding: "1.35rem" }}>
            <h3 style={{ margin: "0 0 1rem" }}>Top branding</h3>
            <div style={{ display: "grid", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.45rem", fontWeight: 600 }}>Organisation name</label>
                <input
                  style={inputStyle}
                  value={form.organization_name || ""}
                  onChange={(event) => setForm({ ...form, organization_name: event.target.value })}
                  placeholder="PHARMACOURSE"
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.45rem", fontWeight: 600 }}>Organisation subtitle</label>
                <input
                  style={inputStyle}
                  value={form.organization_subtitle || ""}
                  onChange={(event) => setForm({ ...form, organization_subtitle: event.target.value })}
                  placeholder="Professional Pharmacy CPD Platform - Kenya"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Certificate label</label>
                  <input
                    style={inputStyle}
                    value={form.certificate_label || ""}
                    onChange={(event) => setForm({ ...form, certificate_label: event.target.value })}
                    placeholder="Certificate of Completion"
                  />
                </div>
                <div className="form-group">
                  <label>Certificate title</label>
                  <input
                    style={inputStyle}
                    value={form.certificate_title || ""}
                    onChange={(event) => setForm({ ...form, certificate_title: event.target.value })}
                    placeholder="Academic Achievement"
                  />
                </div>
              </div>
            </div>
          </section>

          <section style={{ background: "#fff", border: "1px solid #e6ece8", borderRadius: "1rem", padding: "1.35rem" }}>
            <h3 style={{ margin: "0 0 1rem" }}>Certificate copy</h3>
            <div style={{ display: "grid", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.45rem", fontWeight: 600 }}>Text above learner name</label>
                <input
                  style={inputStyle}
                  value={form.certifies_text || ""}
                  onChange={(event) => setForm({ ...form, certifies_text: event.target.value })}
                  placeholder="This is to certify that"
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.45rem", fontWeight: 600 }}>Text above course title</label>
                <input
                  style={inputStyle}
                  value={form.completion_text || ""}
                  onChange={(event) => setForm({ ...form, completion_text: event.target.value })}
                  placeholder="has successfully completed the course"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Left badge title</label>
                  <input
                    style={inputStyle}
                    value={form.left_badge_title || ""}
                    onChange={(event) => setForm({ ...form, left_badge_title: event.target.value })}
                    placeholder="CPD"
                  />
                </div>
                <div className="form-group">
                  <label>Left badge subtitle</label>
                  <input
                    style={inputStyle}
                    value={form.left_badge_subtitle || ""}
                    onChange={(event) => setForm({ ...form, left_badge_subtitle: event.target.value })}
                    placeholder="Certified"
                  />
                </div>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.45rem", fontWeight: 600 }}>Left rail text</label>
                <input
                  style={inputStyle}
                  value={form.left_vertical_text || ""}
                  onChange={(event) => setForm({ ...form, left_vertical_text: event.target.value })}
                  placeholder="PharmaCourse Kenya"
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.45rem", fontWeight: 600 }}>Footer text</label>
                <input
                  style={inputStyle}
                  value={form.footer_text || ""}
                  onChange={(event) => setForm({ ...form, footer_text: event.target.value })}
                  placeholder="Footer line shown at the bottom of every certificate"
                />
              </div>
            </div>
          </section>

          <section style={{ background: "#fff", border: "1px solid #e6ece8", borderRadius: "1rem", padding: "1.35rem" }}>
            <h3 style={{ margin: "0 0 1rem" }}>Official signature</h3>
            <div style={{ display: "grid", gap: "1rem" }}>
              <div className="form-row">
                <div className="form-group">
                  <label>Signer name</label>
                  <input
                    style={inputStyle}
                    value={form.signature_name || ""}
                    onChange={(event) => setForm({ ...form, signature_name: event.target.value })}
                    placeholder="Julius Wanjau"
                  />
                </div>
                <div className="form-group">
                  <label>Signer role</label>
                  <input
                    style={inputStyle}
                    value={form.signature_role || ""}
                    onChange={(event) => setForm({ ...form, signature_role: event.target.value })}
                    placeholder="Director, PharmaCourse"
                  />
                </div>
              </div>

              <input
                ref={signatureInputRef}
                type="file"
                accept="image/*"
                onChange={handleSignatureUpload}
                style={{ display: "none" }}
              />

              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => !uploading && signatureInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : "Upload Signature"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setForm({ ...form, signature_image_url: "" })}
                  disabled={!form.signature_image_url}
                >
                  Remove Signature
                </button>
                <span style={{ color: "var(--gray-500)", fontSize: "0.88rem" }}>
                  Best result: transparent PNG with a dark ink signature on a light background.
                </span>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.45rem", fontWeight: 600 }}>Signature image URL</label>
                <input
                  style={inputStyle}
                  value={form.signature_image_url || ""}
                  onChange={(event) => setForm({ ...form, signature_image_url: event.target.value })}
                  placeholder="Public image URL"
                />
              </div>
            </div>
          </section>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn-primary" onClick={saveSettings} disabled={saving}>
              <Save size={16} /> {saving ? "Saving..." : "Save Certificate Settings"}
            </button>
          </div>
        </div>

        <aside style={{ background: "#fff", border: "1px solid #e6ece8", borderRadius: "1rem", padding: "1.35rem", position: "sticky", top: "1rem" }}>
          <h3 style={{ margin: "0 0 0.85rem" }}>Quick preview notes</h3>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <div style={{ padding: "0.95rem", borderRadius: "0.85rem", background: "#f7faf8", border: "1px solid #e6ece8" }}>
              <strong style={{ display: "block", marginBottom: "0.3rem" }}>What changes live</strong>
              <span style={{ color: "var(--gray-600)", fontSize: "0.9rem" }}>
                The live certificate page and PDF export will both use these saved settings.
              </span>
            </div>
            <div style={{ padding: "0.95rem", borderRadius: "0.85rem", background: "#f7faf8", border: "1px solid #e6ece8" }}>
              <strong style={{ display: "block", marginBottom: "0.3rem" }}>Recommended signature</strong>
              <span style={{ color: "var(--gray-600)", fontSize: "0.9rem" }}>
                Use one clean transparent signature image so every learner gets the same official sign-off.
              </span>
            </div>
            <div style={{ padding: "0.95rem", borderRadius: "0.85rem", background: "#f7faf8", border: "1px solid #e6ece8" }}>
              <strong style={{ display: "block", marginBottom: "0.3rem" }}>Suggested polish</strong>
              <span style={{ color: "var(--gray-600)", fontSize: "0.9rem" }}>
                Keep the organisation name short, use a simple subtitle, and avoid long footer text so the certificate stays premium.
              </span>
            </div>
            {form.signature_image_url ? (
              <div style={{ padding: "1rem", borderRadius: "0.85rem", background: "#fbfdfc", border: "1px dashed #c8ddd3" }}>
                <div style={{ fontSize: "0.84rem", color: "var(--gray-500)", marginBottom: "0.5rem" }}>Current signature preview</div>
                <img
                  src={form.signature_image_url}
                  alt="Certificate signature preview"
                  style={{ maxWidth: "100%", maxHeight: "100px", objectFit: "contain", display: "block", filter: "contrast(1.1)" }}
                />
              </div>
            ) : (
              <div style={{ padding: "1rem", borderRadius: "0.85rem", background: "#fbfdfc", border: "1px dashed #c8ddd3", color: "var(--gray-500)" }}>
                No signature image uploaded yet. The certificate will fall back to the signer name as text until you add one.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

function HomepageTab() {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingSection, setEditingSection] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => { loadSections() }, [])

  async function loadSections() {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { data, error } = await supabase
        .from("homepage_content")
        .select("*")
        .order("order_index")

      if (error) throw error
      setSections(data || [])
    } catch (err) {
      console.error("Error loading sections:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function toggleSection(id, current) {
    const { error } = await supabase
      .from("homepage_content")
      .update({ enabled: !current })
      .eq("id", id)
    if (!error) {
      setSections(sections.map(s => s.id === id ? { ...s, enabled: !current } : s))
      showToast(!current ? "Section enabled" : "Section hidden")
    } else {
      showToast("Error: " + error.message, "error")
    }
  }

  async function saveSection(updated) {
    setSaving(true)
    const { error } = await supabase
      .from("homepage_content")
      .update({
        heading: updated.heading,
        subheading: updated.subheading,
        body: updated.body,
        badge_text: updated.badge_text,
        primary_btn_text: updated.primary_btn_text,
        primary_btn_url: updated.primary_btn_url,
        secondary_btn_text: updated.secondary_btn_text,
        secondary_btn_url: updated.secondary_btn_url,
        video_url: updated.video_url,
        image_url: updated.image_url,
        enabled: updated.enabled,
        updated_at: new Date().toISOString()
      })
      .eq("id", updated.id)
    setSaving(false)
    if (!error) {
      setSections(sections.map(s => s.id === updated.id ? updated : s))
      setEditingSection(null)
      showToast("Section saved successfully! ✓")
    } else {
      showToast("Error saving: " + error.message, "error")
    }
  }

  if (loading) {
    return (
      <div className="admin-section">
        <div className="section-header"><h2>Homepage Content</h2></div>
        <div className="loading-state">
          <RefreshCw size={20} className="spin" />
          <p>Loading homepage sections...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="admin-section">
        <div className="section-header"><h2>Homepage Content</h2></div>
        <div className="error-state">
          <AlertCircle size={24} />
          <div>
            <p className="error-title">Failed to load sections</p>
            <p className="error-message">{error}</p>
            <p className="error-hint">Run this SQL in Supabase → SQL Editor to fix:</p>
            <pre className="error-sql">{`GRANT SELECT ON homepage_content TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON homepage_content TO authenticated;`}
            </pre>
          </div>
          <button className="btn-primary" onClick={loadSections}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </div>
    )
  }

  if (sections.length === 0) {
    return (
      <div className="admin-section">
        <div className="section-header"><h2>Homepage Content</h2></div>
        <div className="error-state">
          <AlertCircle size={24} />
          <div>
            <p className="error-title">No sections found</p>
            <p className="error-hint">Run this in Supabase → SQL Editor to seed the 10 sections:</p>
            <pre className="error-sql">{`INSERT INTO homepage_content
  (section_key, section_name, order_index, enabled, heading, badge_text,
   primary_btn_text, primary_btn_url, secondary_btn_text, secondary_btn_url, video_url)
VALUES
  ('hero','Hero Section',1,true,'Transform Pharmacy Operations & Education',
   'Complete Pharmacy Ecosystem','Book Platform Demo',
   'https://wa.me/254790059584','Start Learning','/courses',NULL),
  ('ecosystem','Ecosystem Section',2,true,
   'One company. Three platforms. Built for Africa.',
   'The RemedaCare Ecosystem',NULL,NULL,NULL,NULL,NULL),
  ('pharmacyOS','PharmacyOS Section',3,true,'Everything your pharmacy needs.',
   'PharmacyOS','Book a Demo','https://wa.me/254790059584',NULL,NULL,NULL),
  ('remedacareOS','RemedacareOS Section',4,true,'From clinic to dispensary.',
   'RemedacareOS','Join Waitlist','https://wa.me/254790059584',NULL,NULL,NULL),
  ('features','Features Section',5,true,
   'Accelerate your career with practical skills','Key Features',NULL,NULL,NULL,NULL,NULL),
  ('courses','Featured Courses',6,true,'Courses built for real-world practice',
   'Our Curriculum','View all courses','/courses',NULL,NULL,NULL),
  ('testimonials','Testimonials Section',7,true,'Learners who finished the course',
   'Reviews',NULL,NULL,NULL,NULL,NULL),
  ('stats','Stats Section',8,true,'Trusted by pharmacy professionals',
   'Statistics',NULL,NULL,NULL,NULL,NULL),
  ('faq','FAQ Section',9,true,'Need help getting started?',
   'Frequently Asked Questions',NULL,NULL,NULL,NULL,NULL),
  ('cta','CTA Section',10,true,'Ready to transform your pharmacy practice?',
   NULL,'Start Learning Free','/register','Book a Demo',
   'https://wa.me/254790059584',NULL)
ON CONFLICT (section_key) DO NOTHING;`}
            </pre>
          </div>
          <button className="btn-primary" onClick={loadSections}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-section">
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}

      <div className="section-header">
        <div>
          <h2>Homepage Content</h2>
          <p style={{ color: "var(--gray-500)", marginTop: "0.25rem", fontSize: "0.875rem" }}>
            {sections.length} sections · Edit text, videos, buttons and toggle visibility
          </p>
        </div>
        <button className="btn-secondary" onClick={loadSections}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="homepage-sections-list">
        {sections.map((section) => (
          <div key={section.id} className={`homepage-section-card ${!section.enabled ? "disabled" : ""}`}>
            <div className="hsc-left">
              <GripVertical size={16} className="drag-handle" />
              <div className="hsc-info">
                <span className="hsc-name">{section.section_name}</span>
                <span className="hsc-key">/{section.section_key}</span>
                {section.heading && (
                  <span className="hsc-preview">
                    {section.heading.length > 60 ? section.heading.substring(0, 60) + "…" : section.heading}
                  </span>
                )}
              </div>
            </div>
            <div className="hsc-actions">
              <span className={`hsc-status ${section.enabled ? "on" : "off"}`}>
                {section.enabled ? "Visible" : "Hidden"}
              </span>
              <button
                className="btn-icon"
                title={section.enabled ? "Hide section" : "Show section"}
                onClick={() => toggleSection(section.id, section.enabled)}
              >
                {section.enabled ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button
                className="btn-icon"
                title="Edit content"
                onClick={() => setEditingSection(section)}
              >
                <Edit2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingSection && (
        <SectionEditorModal
          section={editingSection}
          saving={saving}
          onClose={() => setEditingSection(null)}
          onSave={saveSection}
        />
      )}
    </div>
  )
}

// ─── SIMULATIONS TAB ─────────────────────────────────────────────────────────

function SimulationsTab() {
  const { user } = useAuth()
  const [tab, setTab] = useState("simulations")
  const [simulations, setSimulations] = useState([])
  const [pearls, setPearls] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(false)

  // New simulation form
  const [newSim, setNewSim] = useState({ title: "", patient_context: "", difficulty: "intermediate", course_id: "" })
  const [questions, setQuestions] = useState([{ text: "", model_answer: "" }])

  // New pearl form
  const [newPearl, setNewPearl] = useState({ title: "", content: "", category: "" })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [simRes, pearlRes, courseRes] = await Promise.all([
      supabase.from("case_simulations").select("*, courses(title)").order("created_at", { ascending: false }),
      supabase.from("clinical_pearls").select("*").order("created_at", { ascending: false }),
      supabase.from("courses").select("id, title").order("title")
    ])
    setSimulations(simRes.data || [])
    setPearls(pearlRes.data || [])
    setCourses(courseRes.data || [])
  }

  function addQuestion() {
    setQuestions([...questions, { text: "", model_answer: "" }])
  }

  function removeQuestion(i) {
    setQuestions(questions.filter((_, idx) => idx !== i))
  }

  function updateQuestion(i, field, value) {
    const updated = [...questions]
    updated[i] = { ...updated[i], [field]: value }
    setQuestions(updated)
  }

  async function createSimulation() {
    if (!newSim.title || !newSim.patient_context) { alert("Fill in title and patient context."); return }
    if (!newSim.course_id) { alert("Please select a course for this simulation."); return }
    if (questions.some(q => !q.text.trim())) { alert("All questions need text — remove empty ones or fill them in."); return }
    setLoading(true)
    const { error } = await supabase.from("case_simulations").insert({
      title: newSim.title,
      patient_scenario: newSim.patient_context,
      difficulty_level: newSim.difficulty,
      course_id: newSim.course_id || null,
      questions: questions.filter(q => q.text.trim()),
      creator_id: user.id,
      is_published: true,
    })
    if (error) alert("Error: " + error.message)
    else {
      setNewSim({ title: "", patient_context: "", difficulty: "intermediate", course_id: "" })
      setQuestions([{ text: "", model_answer: "" }])
      loadData()
    }
    setLoading(false)
  }

  async function deleteSimulation(id) {
    if (!window.confirm("Delete this simulation?")) return
    await supabase.from("case_simulations").delete().eq("id", id)
    loadData()
  }

  async function createPearl() {
    if (!newPearl.title || !newPearl.content || !newPearl.category) { alert("Fill in all pearl fields."); return }
    setLoading(true)
    const { error } = await supabase.from("clinical_pearls").insert({
      title: newPearl.title,
      content: newPearl.content,
      category: newPearl.category,
    })
    if (error) alert("Error: " + error.message)
    else { setNewPearl({ title: "", content: "", category: "" }); loadData() }
    setLoading(false)
  }

  async function deletePearl(id) {
    if (!window.confirm("Delete this pearl?")) return
    await supabase.from("clinical_pearls").delete().eq("id", id)
    loadData()
  }

  const inp = { width: "100%", padding: "0.7rem 0.9rem", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: "0.9rem", fontFamily: "inherit", boxSizing: "border-box", marginBottom: "1rem" }
  const diffColor = { beginner: "#0F6E56", intermediate: "#E09B00", advanced: "#E24B4A" }

  return (
    <div className="admin-section">
      <div className="section-header">
        <h2>Simulations &amp; Clinical Pearls</h2>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem", borderBottom: "2px solid #eee", paddingBottom: "0" }}>
        {[["simulations", "Case Simulations", simulations.length], ["pearls", "Clinical Pearls", pearls.length]].map(([key, label, count]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "0.5rem 1rem 0.75rem", fontWeight: tab === key ? 700 : 500,
            color: tab === key ? "#0F6E56" : "#888",
            borderBottom: tab === key ? "3px solid #0F6E56" : "3px solid transparent",
            marginBottom: "-2px", fontSize: "0.95rem"
          }}>
            {label} <span style={{ background: "#f0f0f0", borderRadius: 99, padding: "1px 8px", fontSize: "0.78rem", marginLeft: 4 }}>{count}</span>
          </button>
        ))}
      </div>

      {tab === "simulations" && (
        <div>
          {/* Create form */}
          <div style={{ background: "#fff", border: "1px solid #e8ede9", borderRadius: 14, padding: "1.75rem", marginBottom: "2rem" }}>
            <h3 style={{ margin: "0 0 1.25rem", fontSize: "1rem", fontWeight: 700 }}>Create New Simulation</h3>

            <label style={{ display: "block", fontWeight: 600, fontSize: "0.8rem", color: "#555", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: 0.4 }}>Case Title</label>
            <input style={inp} value={newSim.title} onChange={e => setNewSim({ ...newSim, title: e.target.value })} placeholder="e.g. Diabetic patient with suspected UTI" />

            <label style={{ display: "block", fontWeight: 600, fontSize: "0.8rem", color: "#555", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: 0.4 }}>Patient Context</label>
            <textarea style={{ ...inp, minHeight: 120, resize: "vertical" }} value={newSim.patient_context} onChange={e => setNewSim({ ...newSim, patient_context: e.target.value })} placeholder="Describe the patient: age, presenting complaint, vitals, history, current meds, lab results..." />

            <label style={{ display: "block", fontWeight: 600, fontSize: "0.8rem", color: "#555", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: 0.4 }}>Linked Course</label>
            <select style={inp} value={newSim.course_id} onChange={e => setNewSim({ ...newSim, course_id: e.target.value })}>
              <option value="">— Select a course —</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>

            <label style={{ display: "block", fontWeight: 600, fontSize: "0.8rem", color: "#555", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: 0.4 }}>Difficulty</label>
            <select style={inp} value={newSim.difficulty} onChange={e => setNewSim({ ...newSim, difficulty: e.target.value })}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>

            {/* Questions */}
            <div style={{ marginTop: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <label style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0a2e1f" }}>Questions ({questions.length})</label>
                <button onClick={addQuestion} style={{ background: "#e8f5f0", color: "#0F6E56", border: "none", borderRadius: 8, padding: "0.4rem 0.9rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>+ Add Question</button>
              </div>
              {questions.map((q, i) => (
                <div key={i} style={{ background: "#f8faf9", border: "1.5px solid #e0ede8", borderRadius: 10, padding: "1rem", marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0F6E56" }}>Q{i + 1}</span>
                    {questions.length > 1 && (
                      <button onClick={() => removeQuestion(i)} style={{ background: "none", border: "none", color: "#E24B4A", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>✕ Remove</button>
                    )}
                  </div>
                  <input
                    style={{ ...inp, marginBottom: "0.5rem" }}
                    value={q.text}
                    onChange={e => updateQuestion(i, "text", e.target.value)}
                    placeholder="e.g. What is your drug of choice and why?"
                  />
                  <textarea
                    style={{ ...inp, minHeight: 80, marginBottom: 0, resize: "vertical" }}
                    value={q.model_answer}
                    onChange={e => updateQuestion(i, "model_answer", e.target.value)}
                    placeholder="Model answer (used by AI to score the learner's response)"
                  />
                </div>
              ))}
            </div>

            <button onClick={createSimulation} disabled={loading} style={{ marginTop: "1rem", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 9, padding: "0.75rem 1.75rem", fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Creating…" : "Create Simulation"}
            </button>
          </div>

          {/* Existing simulations */}
          <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>Existing Simulations ({simulations.length})</h3>
          {simulations.length === 0 && <p style={{ color: "#aaa", fontStyle: "italic" }}>No simulations yet. Create one above.</p>}
          {simulations.map(sim => (
            <div key={sim.id} style={{ background: "#fff", border: "1px solid #e8ede9", borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0a2e1f" }}>{sim.title}</span>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, background: (diffColor[sim.difficulty_level] || "#888") + "22", color: diffColor[sim.difficulty_level] || "#888", padding: "2px 9px", borderRadius: 99, textTransform: "capitalize" }}>{sim.difficulty_level}</span>
                  <span style={{ fontSize: "0.72rem", color: "#888" }}>{Array.isArray(sim.questions) ? sim.questions.length : 0} questions</span>
                  {sim.courses?.title && <span style={{ fontSize: "0.72rem", background: "#f0f0f0", color: "#555", padding: "2px 9px", borderRadius: 99 }}>📚 {sim.courses.title}</span>}
                </div>
                <p style={{ color: "#666", fontSize: "0.85rem", margin: "0 0 0.75rem", lineHeight: 1.5 }}>{sim.patient_scenario?.slice(0, 120)}…</p>
              </div>
              <button onClick={() => deleteSimulation(sim.id)} style={{ background: "#fdf2f2", color: "#E24B4A", border: "1px solid #f5c6c6", borderRadius: 8, padding: "0.4rem 0.9rem", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", flexShrink: 0 }}>Delete</button>
            </div>
          ))}
        </div>
      )}

      {tab === "pearls" && (
        <div>
          {/* Create pearl form */}
          <div style={{ background: "#fff", border: "1px solid #e8ede9", borderRadius: 14, padding: "1.75rem", marginBottom: "2rem" }}>
            <h3 style={{ margin: "0 0 1.25rem", fontSize: "1rem", fontWeight: 700 }}>Create New Clinical Pearl</h3>
            <label style={{ display: "block", fontWeight: 600, fontSize: "0.8rem", color: "#555", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: 0.4 }}>Title</label>
            <input style={inp} value={newPearl.title} onChange={e => setNewPearl({ ...newPearl, title: e.target.value })} placeholder="e.g. AMR Stewardship in Kenya" />
            <label style={{ display: "block", fontWeight: 600, fontSize: "0.8rem", color: "#555", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: 0.4 }}>Category</label>
            <input style={inp} value={newPearl.category} onChange={e => setNewPearl({ ...newPearl, category: e.target.value })} placeholder="e.g. Antimicrobials, Pharmacovigilance, Therapeutics" />
            <label style={{ display: "block", fontWeight: 600, fontSize: "0.8rem", color: "#555", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: 0.4 }}>Content</label>
            <textarea style={{ ...inp, minHeight: 120, resize: "vertical" }} value={newPearl.content} onChange={e => setNewPearl({ ...newPearl, content: e.target.value })} placeholder="The clinical pearl content (kept to 3–5 minutes of reading)" />
            <button onClick={createPearl} disabled={loading} style={{ background: "#0F6E56", color: "#fff", border: "none", borderRadius: 9, padding: "0.75rem 1.75rem", fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Creating…" : "Create Pearl"}
            </button>
          </div>

          {/* Existing pearls */}
          <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>Existing Pearls ({pearls.length})</h3>
          {pearls.length === 0 && <p style={{ color: "#aaa", fontStyle: "italic" }}>No pearls yet. Create one above.</p>}
          {pearls.map(pearl => (
            <div key={pearl.id} style={{ background: "#fff", border: "1px solid #e8ede9", borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0a2e1f" }}>{pearl.title}</span>
                  <span style={{ fontSize: "0.72rem", background: "#e8f5f0", color: "#0F6E56", padding: "2px 9px", borderRadius: 99, fontWeight: 600 }}>{pearl.category}</span>
                </div>
                <p style={{ color: "#666", fontSize: "0.85rem", margin: 0, lineHeight: 1.5 }}>{pearl.content?.slice(0, 150)}…</p>
              </div>
              <button onClick={() => deletePearl(pearl.id)} style={{ background: "#fdf2f2", color: "#E24B4A", border: "1px solid #f5c6c6", borderRadius: 8, padding: "0.4rem 0.9rem", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", flexShrink: 0 }}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ScalableSimulationsTab() {
  const { user } = useAuth()
  const [tab, setTab] = useState("simulations")
  const [simulations, setSimulations] = useState([])
  const [pearls, setPearls] = useState([])
  const [simulationCount, setSimulationCount] = useState(0)
  const [pearlCount, setPearlCount] = useState(0)
  const [simulationPage, setSimulationPage] = useState(1)
  const [pearlPage, setPearlPage] = useState(1)
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [newSim, setNewSim] = useState({ title: "", patient_context: "", difficulty: "intermediate", course_id: "" })
  const [questions, setQuestions] = useState([{ text: "", model_answer: "" }])
  const [newPearl, setNewPearl] = useState({ title: "", content: "", category: "" })

  useEffect(() => {
    loadData(simulationPage, pearlPage)
  }, [simulationPage, pearlPage])

  async function loadData(targetSimulationPage = simulationPage, targetPearlPage = pearlPage) {
    setListLoading(true)

    const simulationFrom = (targetSimulationPage - 1) * ADMIN_SIMULATIONS_PAGE_SIZE
    const simulationTo = simulationFrom + ADMIN_SIMULATIONS_PAGE_SIZE - 1
    const pearlFrom = (targetPearlPage - 1) * ADMIN_PEARLS_PAGE_SIZE
    const pearlTo = pearlFrom + ADMIN_PEARLS_PAGE_SIZE - 1

    const [simRes, pearlRes, courseRes] = await Promise.all([
      supabase
        .from("case_simulations")
        .select("*, courses(title)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(simulationFrom, simulationTo),
      supabase
        .from("clinical_pearls")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(pearlFrom, pearlTo),
      supabase.from("courses").select("id, title").order("title")
    ])

    setSimulations(simRes.data || [])
    setPearls(pearlRes.data || [])
    setSimulationCount(simRes.count || 0)
    setPearlCount(pearlRes.count || 0)
    setCourses(courseRes.data || [])
    setListLoading(false)
  }

  function addQuestion() {
    setQuestions([...questions, { text: "", model_answer: "" }])
  }

  function removeQuestion(index) {
    setQuestions(questions.filter((_, currentIndex) => currentIndex !== index))
  }

  function updateQuestion(index, field, value) {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  async function createSimulation() {
    if (!newSim.title || !newSim.patient_context) {
      alert("Fill in title and patient context.")
      return
    }

    if (!newSim.course_id) {
      alert("Please select a course for this simulation.")
      return
    }

    if (questions.some((question) => !question.text.trim())) {
      alert("All questions need text. Remove empty ones or fill them in.")
      return
    }

    setLoading(true)

    const { error } = await supabase.from("case_simulations").insert({
      title: newSim.title,
      patient_scenario: newSim.patient_context,
      difficulty_level: newSim.difficulty,
      course_id: newSim.course_id || null,
      questions: questions.filter((question) => question.text.trim()),
      creator_id: user.id,
      is_published: true,
    })

    if (error) {
      alert("Error: " + error.message)
    } else {
      setNewSim({ title: "", patient_context: "", difficulty: "intermediate", course_id: "" })
      setQuestions([{ text: "", model_answer: "" }])

      if (simulationPage !== 1) setSimulationPage(1)
      else await loadData(1, pearlPage)
    }

    setLoading(false)
  }

  async function deleteSimulation(id) {
    if (!window.confirm("Delete this simulation?")) return

    await supabase.from("case_simulations").delete().eq("id", id)

    const nextTotal = Math.max(simulationCount - 1, 0)
    const nextTotalPages = Math.max(1, Math.ceil(nextTotal / ADMIN_SIMULATIONS_PAGE_SIZE))
    const nextPage = Math.min(simulationPage, nextTotalPages)

    if (nextPage !== simulationPage) setSimulationPage(nextPage)
    else await loadData(simulationPage, pearlPage)
  }

  async function createPearl() {
    if (!newPearl.title || !newPearl.content || !newPearl.category) {
      alert("Fill in all pearl fields.")
      return
    }

    setLoading(true)

    const { error } = await supabase.from("clinical_pearls").insert({
      title: newPearl.title,
      content: newPearl.content,
      category: newPearl.category,
    })

    if (error) {
      alert("Error: " + error.message)
    } else {
      setNewPearl({ title: "", content: "", category: "" })

      if (pearlPage !== 1) setPearlPage(1)
      else await loadData(simulationPage, 1)
    }

    setLoading(false)
  }

  async function deletePearl(id) {
    if (!window.confirm("Delete this pearl?")) return

    await supabase.from("clinical_pearls").delete().eq("id", id)

    const nextTotal = Math.max(pearlCount - 1, 0)
    const nextTotalPages = Math.max(1, Math.ceil(nextTotal / ADMIN_PEARLS_PAGE_SIZE))
    const nextPage = Math.min(pearlPage, nextTotalPages)

    if (nextPage !== pearlPage) setPearlPage(nextPage)
    else await loadData(simulationPage, pearlPage)
  }

  const inputStyle = {
    width: "100%",
    padding: "0.7rem 0.9rem",
    border: "1.5px solid #e0e0e0",
    borderRadius: 8,
    fontSize: "0.9rem",
    fontFamily: "inherit",
    boxSizing: "border-box",
    marginBottom: "1rem"
  }
  const difficultyColor = { beginner: "#0F6E56", intermediate: "#E09B00", advanced: "#E24B4A" }
  const simulationTotalPages = Math.max(1, Math.ceil(simulationCount / ADMIN_SIMULATIONS_PAGE_SIZE))
  const pearlTotalPages = Math.max(1, Math.ceil(pearlCount / ADMIN_PEARLS_PAGE_SIZE))

  return (
    <div className="admin-section">
      <div className="section-header">
        <h2>Simulations &amp; Clinical Pearls</h2>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem", borderBottom: "2px solid #eee", paddingBottom: 0 }}>
        {[["simulations", "Case Simulations", simulationCount], ["pearls", "Clinical Pearls", pearlCount]].map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.5rem 1rem 0.75rem",
              fontWeight: tab === key ? 700 : 500,
              color: tab === key ? "#0F6E56" : "#888",
              borderBottom: tab === key ? "3px solid #0F6E56" : "3px solid transparent",
              marginBottom: "-2px",
              fontSize: "0.95rem"
            }}
          >
            {label} <span style={{ background: "#f0f0f0", borderRadius: 99, padding: "1px 8px", fontSize: "0.78rem", marginLeft: 4 }}>{count}</span>
          </button>
        ))}
      </div>

      {tab === "simulations" && (
        <div>
          <div style={{ background: "#fff", border: "1px solid #e8ede9", borderRadius: 14, padding: "1.75rem", marginBottom: "2rem" }}>
            <h3 style={{ margin: "0 0 1.25rem", fontSize: "1rem", fontWeight: 700 }}>Create New Simulation</h3>

            <label style={{ display: "block", fontWeight: 600, fontSize: "0.8rem", color: "#555", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: 0.4 }}>Case Title</label>
            <input style={inputStyle} value={newSim.title} onChange={(event) => setNewSim({ ...newSim, title: event.target.value })} placeholder="e.g. Diabetic patient with suspected UTI" />

            <label style={{ display: "block", fontWeight: 600, fontSize: "0.8rem", color: "#555", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: 0.4 }}>Patient Context</label>
            <textarea style={{ ...inputStyle, minHeight: 120, resize: "vertical" }} value={newSim.patient_context} onChange={(event) => setNewSim({ ...newSim, patient_context: event.target.value })} placeholder="Describe the patient: age, complaint, vitals, history, meds, lab results..." />

            <label style={{ display: "block", fontWeight: 600, fontSize: "0.8rem", color: "#555", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: 0.4 }}>Linked Course</label>
            <select style={inputStyle} value={newSim.course_id} onChange={(event) => setNewSim({ ...newSim, course_id: event.target.value })}>
              <option value="">-- Select a course --</option>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
            </select>

            <label style={{ display: "block", fontWeight: 600, fontSize: "0.8rem", color: "#555", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: 0.4 }}>Difficulty</label>
            <select style={inputStyle} value={newSim.difficulty} onChange={(event) => setNewSim({ ...newSim, difficulty: event.target.value })}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>

            <div style={{ marginTop: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <label style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0a2e1f" }}>Questions ({questions.length})</label>
                <button onClick={addQuestion} style={{ background: "#e8f5f0", color: "#0F6E56", border: "none", borderRadius: 8, padding: "0.4rem 0.9rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>+ Add Question</button>
              </div>

              {questions.map((question, index) => (
                <div key={index} style={{ background: "#f8faf9", border: "1.5px solid #e0ede8", borderRadius: 10, padding: "1rem", marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0F6E56" }}>Q{index + 1}</span>
                    {questions.length > 1 && (
                      <button onClick={() => removeQuestion(index)} style={{ background: "none", border: "none", color: "#E24B4A", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>Remove</button>
                    )}
                  </div>
                  <input
                    style={{ ...inputStyle, marginBottom: "0.5rem" }}
                    value={question.text}
                    onChange={(event) => updateQuestion(index, "text", event.target.value)}
                    placeholder="e.g. What is your drug of choice and why?"
                  />
                  <textarea
                    style={{ ...inputStyle, minHeight: 80, marginBottom: 0, resize: "vertical" }}
                    value={question.model_answer}
                    onChange={(event) => updateQuestion(index, "model_answer", event.target.value)}
                    placeholder="Model answer used by AI to score the learner response"
                  />
                </div>
              ))}
            </div>

            <button onClick={createSimulation} disabled={loading} style={{ marginTop: "1rem", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 9, padding: "0.75rem 1.75rem", fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Creating..." : "Create Simulation"}
            </button>
          </div>

          <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>Existing Simulations ({simulationCount})</h3>
          {listLoading ? (
            <p style={{ color: "#888" }}>Loading simulations...</p>
          ) : simulations.length === 0 ? (
            <p style={{ color: "#aaa", fontStyle: "italic" }}>No simulations yet. Create one above.</p>
          ) : (
            <>
              {simulations.map((simulation) => (
                <div key={simulation.id} style={{ background: "#fff", border: "1px solid #e8ede9", borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0a2e1f" }}>{simulation.title}</span>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, background: `${difficultyColor[simulation.difficulty_level] || "#888"}22`, color: difficultyColor[simulation.difficulty_level] || "#888", padding: "2px 9px", borderRadius: 99, textTransform: "capitalize" }}>{simulation.difficulty_level}</span>
                      <span style={{ fontSize: "0.72rem", color: "#888" }}>{Array.isArray(simulation.questions) ? simulation.questions.length : 0} questions</span>
                      {simulation.courses?.title && <span style={{ fontSize: "0.72rem", background: "#f0f0f0", color: "#555", padding: "2px 9px", borderRadius: 99 }}>Course: {simulation.courses.title}</span>}
                    </div>
                    <p style={{ color: "#666", fontSize: "0.85rem", margin: "0 0 0.75rem", lineHeight: 1.5 }}>{simulation.patient_scenario?.slice(0, 120)}...</p>
                  </div>
                  <button onClick={() => deleteSimulation(simulation.id)} style={{ background: "#fdf2f2", color: "#E24B4A", border: "1px solid #f5c6c6", borderRadius: 8, padding: "0.4rem 0.9rem", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", flexShrink: 0 }}>Delete</button>
                </div>
              ))}
              <Pagination
                currentPage={simulationPage}
                totalPages={simulationTotalPages}
                totalItems={simulationCount}
                pageSize={ADMIN_SIMULATIONS_PAGE_SIZE}
                onPageChange={setSimulationPage}
                label="simulations"
              />
            </>
          )}
        </div>
      )}

      {tab === "pearls" && (
        <div>
          <div style={{ background: "#fff", border: "1px solid #e8ede9", borderRadius: 14, padding: "1.75rem", marginBottom: "2rem" }}>
            <h3 style={{ margin: "0 0 1.25rem", fontSize: "1rem", fontWeight: 700 }}>Create New Clinical Pearl</h3>
            <label style={{ display: "block", fontWeight: 600, fontSize: "0.8rem", color: "#555", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: 0.4 }}>Title</label>
            <input style={inputStyle} value={newPearl.title} onChange={(event) => setNewPearl({ ...newPearl, title: event.target.value })} placeholder="e.g. AMR Stewardship in Kenya" />
            <label style={{ display: "block", fontWeight: 600, fontSize: "0.8rem", color: "#555", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: 0.4 }}>Category</label>
            <input style={inputStyle} value={newPearl.category} onChange={(event) => setNewPearl({ ...newPearl, category: event.target.value })} placeholder="e.g. Antimicrobials, Pharmacovigilance, Therapeutics" />
            <label style={{ display: "block", fontWeight: 600, fontSize: "0.8rem", color: "#555", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: 0.4 }}>Content</label>
            <textarea style={{ ...inputStyle, minHeight: 120, resize: "vertical" }} value={newPearl.content} onChange={(event) => setNewPearl({ ...newPearl, content: event.target.value })} placeholder="The clinical pearl content kept to 3-5 minutes of reading" />
            <button onClick={createPearl} disabled={loading} style={{ background: "#0F6E56", color: "#fff", border: "none", borderRadius: 9, padding: "0.75rem 1.75rem", fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Creating..." : "Create Pearl"}
            </button>
          </div>

          <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>Existing Pearls ({pearlCount})</h3>
          {listLoading ? (
            <p style={{ color: "#888" }}>Loading pearls...</p>
          ) : pearls.length === 0 ? (
            <p style={{ color: "#aaa", fontStyle: "italic" }}>No pearls yet. Create one above.</p>
          ) : (
            <>
              {pearls.map((pearl) => (
                <div key={pearl.id} style={{ background: "#fff", border: "1px solid #e8ede9", borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0a2e1f" }}>{pearl.title}</span>
                      <span style={{ fontSize: "0.72rem", background: "#e8f5f0", color: "#0F6E56", padding: "2px 9px", borderRadius: 99, fontWeight: 600 }}>{pearl.category}</span>
                    </div>
                    <p style={{ color: "#666", fontSize: "0.85rem", margin: 0, lineHeight: 1.5 }}>{pearl.content?.slice(0, 150)}...</p>
                  </div>
                  <button onClick={() => deletePearl(pearl.id)} style={{ background: "#fdf2f2", color: "#E24B4A", border: "1px solid #f5c6c6", borderRadius: 8, padding: "0.4rem 0.9rem", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", flexShrink: 0 }}>Delete</button>
                </div>
              ))}
              <Pagination
                currentPage={pearlPage}
                totalPages={pearlTotalPages}
                totalItems={pearlCount}
                pageSize={ADMIN_PEARLS_PAGE_SIZE}
                onPageChange={setPearlPage}
                label="pearls"
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function QuizManagementTab() {
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [modules, setModules] = useState([])
  const [selectedModule, setSelectedModule] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => { loadCourses() }, [])

  async function loadCourses() {
    setLoading(true)
    const { data } = await supabase.from("courses").select("id,title").order("title")
    setCourses(data || [])
    setLoading(false)
  }

  async function selectCourse(course) {
    setSelectedCourse(course)
    setSelectedModule(null)
    setQuiz(null)
    setQuestions([])
    const { data } = await supabase
      .from("course_modules")
      .select("id,title,order_index")
      .eq("course_id", course.id)
      .order("order_index")
    setModules(data || [])
  }

  async function selectModule(mod) {
    setSelectedModule(mod)
    setQuiz(null)
    setQuestions([])
    const { data } = await supabase
      .from("lesson_quizzes")
      .select("id,title,passing_score,quiz_questions(*)")
      .eq("lesson_id", mod.id)
      .maybeSingle()
    if (data) {
      setQuiz(data)
      setQuestions(data.quiz_questions || [])
    } else {
      setQuiz(null)
      setQuestions([])
    }
  }

  async function createQuiz() {
    if (!selectedModule || !selectedCourse) return
    setSaving(true)
    const { data, error } = await supabase
      .from("lesson_quizzes")
      .insert({ lesson_id: selectedModule.id, course_id: selectedCourse.id, title: selectedModule.title + " Quiz", passing_score: 70 })
      .select()
      .single()
    setSaving(false)
    if (error) { alert("Error: " + error.message); return }
    setQuiz(data)
    setQuestions([])
    showMessage("Quiz created!")
  }

  async function addQuestion() {
    if (!quiz) return
    const newQ = {
      quiz_id: quiz.id,
      question_text: "New question",
      options: [
        { text: "Option A", is_correct: true },
        { text: "Option B", is_correct: false },
        { text: "Option C", is_correct: false },
        { text: "Option D", is_correct: false }
      ],
      correct_answer: "Option A",
      explanation: "",
      order_index: questions.length
    }
    setSaving(true)
    const { data, error } = await supabase.from("quiz_questions").insert(newQ).select().single()
    setSaving(false)
    if (error) { alert("Error: " + error.message); return }
    setQuestions([...questions, data])
    showMessage("Question added!")
  }

  async function updateQuestion(qId, updates) {
    setQuestions(questions.map(q => q.id === qId ? { ...q, ...updates } : q))
  }

  async function saveQuestion(q) {
    setSaving(true)
    const payload = {
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation
    }
    const { error } = await supabase.from("quiz_questions").update(payload).eq("id", q.id)
    setSaving(false)
    if (error) { alert("Save error: " + error.message); return }
    setQuestions(qs => qs.map(x => x.id === q.id ? { ...x, _saved: true } : x))
    setTimeout(() => setQuestions(qs => qs.map(x => x.id === q.id ? { ...x, _saved: false } : x)), 2000)
  }

  async function deleteQuestion(qId) {
    if (!confirm("Delete this question?")) return
    const { error } = await supabase.from("quiz_questions").delete().eq("id", qId)
    if (error) { alert("Error: " + error.message); return }
    setQuestions(questions.filter(q => q.id !== qId))
    showMessage("Question deleted.")
  }

  function showMessage(msg) {
    setMessage(null)
    setTimeout(() => {
      setMessage(msg)
      setTimeout(() => setMessage(null), 3000)
    }, 10)
  }

  function updateOption(q, optIndex, field, value) {
    const newOptions = q.options.map((opt, i) => {
      if (field === "is_correct") return { ...opt, is_correct: i === optIndex }
      if (i === optIndex) return { ...opt, [field]: value }
      return opt
    })
    const correctOpt = newOptions.find(o => o.is_correct)
    updateQuestion(q.id, { options: newOptions, correct_answer: correctOpt?.text || "" })
  }

  return (
    <div className="admin-section">
      <div className="section-header">
        <div>
          <h2>Quiz Management</h2>
          <p style={{ color: "var(--gray-500)", marginTop: "0.25rem", fontSize: "0.9rem" }}>
            Select a course → module → manage its quiz
          </p>
        </div>
      </div>

      {message && (
        <div style={{ padding: "0.75rem 1rem", background: "#dcfce7", color: "#166534", borderRadius: "8px", marginBottom: "1rem", fontWeight: 600 }}>
          ✅ {message}
        </div>
      )}

      {/* Step 1: Pick course */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        <div>
          <h4 style={{ marginBottom: "0.5rem" }}>1. Select Course</h4>
          {loading ? <p>Loading...</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {courses.map(c => (
                <button key={c.id} onClick={() => selectCourse(c)}
                  style={{
                    padding: "0.6rem 1rem", borderRadius: "8px", border: "1px solid var(--border)",
                    background: selectedCourse?.id === c.id ? "#0F6E56" : "var(--bg-secondary)",
                    color: selectedCourse?.id === c.id ? "#fff" : "inherit",
                    textAlign: "left", cursor: "pointer", fontWeight: 500
                  }}>
                  {c.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 2: Pick module */}
        <div>
          <h4 style={{ marginBottom: "0.5rem" }}>2. Select Module</h4>
          {!selectedCourse ? (
            <p style={{ color: "var(--gray-500)" }}>← Pick a course first</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "400px", overflowY: "auto" }}>
              {modules.map(mod => (
                <button key={mod.id} onClick={() => selectModule(mod)}
                  style={{
                    padding: "0.6rem 1rem", borderRadius: "8px", border: "1px solid var(--border)",
                    background: selectedModule?.id === mod.id ? "#0F6E56" : "var(--bg-secondary)",
                    color: selectedModule?.id === mod.id ? "#fff" : "inherit",
                    textAlign: "left", cursor: "pointer", fontSize: "0.9rem"
                  }}>
                  {mod.order_index + 1}. {mod.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Step 3: Quiz editor */}
      {selectedModule && (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0 }}>
              {quiz ? `Quiz: ${quiz.title}` : `No quiz yet for "${selectedModule.title}"`}
            </h3>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {!quiz && (
                <button className="btn-primary" onClick={createQuiz} disabled={saving}>
                  <Plus size={14} /> Create Quiz
                </button>
              )}
              {quiz && (
                <button className="btn-primary" onClick={addQuestion} disabled={saving}>
                  <Plus size={14} /> Add Question
                </button>
              )}
            </div>
          </div>

          {quiz && questions.length === 0 && (
            <div className="empty-state">
              <p>No questions yet. Click "Add Question" to get started.</p>
            </div>
          )}

          {questions.map((q, idx) => (
            <div key={q.id} style={{ border: "1px solid var(--border)", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem", background: "var(--bg-secondary)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "1rem" }}>
                <span style={{ fontWeight: 700, color: "var(--gray-500)" }}>Q{idx + 1}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {q._saved && <span style={{ color: "#0F6E56", fontWeight: 700, fontSize: "0.85rem" }}>✅ Saved!</span>}
                  <button className="btn-primary" style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
                    onClick={() => saveQuestion(q)} disabled={saving}>
                    <Save size={12} /> {saving ? "Saving..." : "Save"}
                  </button>
                  <button className="btn-icon danger" onClick={() => deleteQuestion(q.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Question</label>
                <input
                  value={q.question_text}
                  onChange={e => updateQuestion(q.id, { question_text: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--border)" }}
                />
              </div>

              <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Options (tick the correct one)</label>
                {(q.options || []).map((opt, oi) => (
                  <div key={oi} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input type="radio" name={`correct-${q.id}`} checked={opt.is_correct}
                      onChange={() => updateOption(q, oi, "is_correct", true)}
                      title="Mark as correct answer" />
                    <input
                      value={opt.text}
                      onChange={e => updateOption(q, oi, "text", e.target.value)}
                      style={{ flex: 1, padding: "0.4rem 0.6rem", borderRadius: "6px", border: `1px solid ${opt.is_correct ? "#0F6E56" : "var(--border)"}`, background: opt.is_correct ? "#f0fdf4" : "white" }}
                      placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                    />
                    {opt.is_correct && <span style={{ color: "#0F6E56", fontSize: "0.8rem", fontWeight: 700 }}>✓ correct</span>}
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Explanation (shown after answer)</label>
                <input
                  value={q.explanation || ""}
                  onChange={e => updateQuestion(q.id, { explanation: e.target.value })}
                  placeholder="Why is this the correct answer?"
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--border)" }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MODULE EDITOR ────────────────────────────────────────────────────────────

function ModuleEditor({ module, index, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [uploading, setUploading] = useState(false)
  const videoInputRef = useRef(null)

  async function uploadVideo(file) {
    if (!file.type.startsWith("video/")) {
      alert("Please select a video file (mp4, mov, etc.)")
      return
    }
    
    setUploading(true)
    try {
      const safeName = `modules/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, "_")}`
      const { data, error } = await supabase.storage
        .from("media")
        .upload(safeName, file, { cacheControl: "3600", upsert: false })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from("media")
        .getPublicUrl(safeName)

      onUpdate(module.id, { video_url: urlData.publicUrl })
    } catch (err) {
      console.error("Error uploading video:", err)
      alert("Error uploading video: " + err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{
      border: "1px solid var(--border)",
      borderRadius: "0.5rem",
      padding: "1rem",
      backgroundColor: "var(--bg-secondary)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--gray-500)" }}>Module {index + 1}</span>
            <input
              type="text"
              value={module.title || ""}
              onChange={e => onUpdate(module.id, { title: e.target.value })}
              placeholder="Module title"
              onClick={e => e.stopPropagation()}
              style={{
                flex: 1,
                border: "1px solid var(--border)",
                borderRadius: "0.25rem",
                padding: "0.5rem",
                fontSize: "0.95rem"
              }}
            />
          </div>
        </div>
        <button className="btn-icon danger" title="Delete module" onClick={e => { e.stopPropagation(); onDelete(module.id) }}>
          <Trash2 size={16} />
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }} onClick={e => e.stopPropagation()}>
          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label>Description</label>
            <textarea
              rows={2}
              value={module.description || ""}
              onChange={e => onUpdate(module.id, { description: e.target.value })}
              placeholder="What will students learn in this module?"
              style={{
                width: "100%",
                border: "1px solid var(--border)",
                borderRadius: "0.25rem",
                padding: "0.5rem",
                fontFamily: "inherit",
                fontSize: "0.9rem"
              }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label>Duration (minutes)</label>
            <input
              type="number"
              min="0"
              value={module.duration || 0}
              onChange={e => onUpdate(module.id, { duration: parseInt(e.target.value) || 0 })}
              placeholder="e.g., 30"
              style={{
                width: "100%",
                border: "1px solid var(--border)",
                borderRadius: "0.25rem",
                padding: "0.5rem",
                fontSize: "0.9rem"
              }}
            />
          </div>

          <div className="form-group">
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Module Video</label>
            {!module.video_url ? (
              <div
                style={{
                  border: "2px dashed var(--border)",
                  borderRadius: "0.5rem",
                  padding: "1.5rem",
                  textAlign: "center",
                  cursor: uploading ? "not-allowed" : "pointer",
                  opacity: uploading ? 0.6 : 1
                }}
                onClick={e => { e.stopPropagation(); !uploading && videoInputRef.current?.click() }}
              >
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  style={{ display: "none" }}
                  onChange={e => e.target.files?.[0] && uploadVideo(e.target.files[0])}
                />
                {uploading ? (
                  <div style={{ color: "var(--gray-500)" }}>
                    <div style={{ marginBottom: "0.5rem" }}>⏳ Uploading...</div>
                    <small>Large videos may take a minute</small>
                  </div>
                ) : (
                  <div style={{ color: "var(--gray-500)" }}>
                    <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🎥</div>
                    <div>Click to upload video or paste URL below</div>
                    <small>MP4, MOV, WebM · Max 500MB</small>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <video
                  controls
                  style={{
                    width: "100%",
                    borderRadius: "0.5rem",
                    maxHeight: "150px",
                    objectFit: "cover",
                    backgroundColor: "#000"
                  }}
                >
                  <source src={module.video_url} type="video/mp4" />
                </video>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.85rem" }}>
                  <span style={{ color: "var(--green)", fontWeight: 600 }}>✓ Video uploaded</span>
                  <button
                    className="btn-icon danger"
                    title="Remove video"
                    onClick={e => { e.stopPropagation(); onUpdate(module.id, { video_url: "" }) }}
                    style={{ marginLeft: "auto" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginTop: "1rem" }}>
            <label>Video URL (or paste manually)</label>
            <input
              type="text"
              value={module.video_url || ""}
              onChange={e => onUpdate(module.id, { video_url: e.target.value })}
              placeholder="https://... or /videos/..."
              style={{
                width: "100%",
                border: "1px solid var(--border)",
                borderRadius: "0.25rem",
                padding: "0.5rem",
                fontSize: "0.9rem"
              }}
            />
            <small style={{ color: "var(--gray-500)", marginTop: "0.25rem", display: "block" }}>
              Auto-filled after upload, or enter a video URL manually
            </small>
          </div>
        </div>
      )}

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        marginTop: "0.5rem",
        color: "var(--gray-500)",
        fontSize: "0.85rem"
      }}>
        <span>{module.duration ? `${module.duration} min` : "No duration"}</span>
        <span>·</span>
        <span>{module.video_url ? "📹 Has video" : "No video"}</span>
        <button
          style={{
            marginLeft: "auto",
            background: "none",
            border: "none",
            color: "var(--blue)",
            cursor: "pointer",
            fontSize: "0.85rem",
            padding: "0.25rem 0.5rem"
          }}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "▼ Collapse" : "▶ Expand"}
        </button>
      </div>
    </div>
  )
}

// ─── SECTION EDITOR MODAL ─────────────────────────────────────────────────────

function SectionEditorModal({ section, saving, onClose, onSave }) {
  const [form, setForm] = useState({ ...section })
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const videoInputRef = useRef(null)
  const imageInputRef = useRef(null)

  const hasVideo = ["hero", "pharmacyOS", "remedacareOS"].includes(section.section_key)
  const hasButtons = ["hero", "pharmacyOS", "remedacareOS", "courses", "cta"].includes(section.section_key)
  const hasSecondaryBtn = ["hero", "cta"].includes(section.section_key)
  const hasBody = section.section_key === "cta"

  async function uploadFile(file, folder = "videos") {
    setUploading(true)
    setUploadError(null)
    try {
      const safeName = `${folder}/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, "_")}`
      const { data, error } = await supabase.storage
        .from("media")
        .upload(safeName, file, { cacheControl: "3600", upsert: false })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from("media")
        .getPublicUrl(safeName)

      return urlData.publicUrl
    } catch (err) {
      setUploadError(err.message)
      return null
    } finally {
      setUploading(false)
    }
  }

  async function handleVideoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("video/")) {
      setUploadError("Please select a video file (mp4, mov, etc.)")
      return
    }
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > 200) {
      if (!window.confirm(`This video is ${sizeMB.toFixed(0)}MB. Large files may take a while. Continue?`)) return
    }
    const url = await uploadFile(file, "videos")
    if (url) setForm({ ...form, video_url: url })
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file (jpg, png, etc.)")
      return
    }
    const url = await uploadFile(file, "images")
    if (url) setForm({ ...form, image_url: url })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit: {section.section_name}</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="modal-body">

          {/* Visibility toggle */}
          <div className="form-section">
            <div className="form-row" style={{ alignItems: "center" }}>
              <label style={{ fontWeight: 600 }}>Section Visibility</label>
              <button
                className={`toggle-btn ${form.enabled ? "on" : "off"}`}
                onClick={() => setForm({ ...form, enabled: !form.enabled })}
              >
                {form.enabled ? "✓ VISIBLE" : "✗ HIDDEN"}
              </button>
            </div>
          </div>

          {/* Text content */}
          <div className="form-section">
            <h4>Text Content</h4>

            <div className="form-group">
              <label>Badge / Label text</label>
              <input
                value={form.badge_text || ""}
                onChange={e => setForm({ ...form, badge_text: e.target.value })}
                placeholder="e.g., Complete Pharmacy Ecosystem"
              />
              <small>Small label above heading</small>
            </div>

            <div className="form-group">
              <label>Heading</label>
              <input
                value={form.heading || ""}
                onChange={e => setForm({ ...form, heading: e.target.value })}
                placeholder="Main heading text"
              />
            </div>

            <div className="form-group">
              <label>Subheading</label>
              <textarea
                rows={2}
                value={form.subheading || ""}
                onChange={e => setForm({ ...form, subheading: e.target.value })}
                placeholder="Supporting text below heading"
              />
            </div>

            {hasBody && (
              <div className="form-group">
                <label>Body text</label>
                <textarea
                  rows={3}
                  value={form.body || ""}
                  onChange={e => setForm({ ...form, body: e.target.value })}
                  placeholder="Additional body paragraph"
                />
              </div>
            )}
          </div>

          {/* Buttons */}
          {hasButtons && (
            <div className="form-section">
              <h4>Buttons</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Primary button text</label>
                  <input
                    value={form.primary_btn_text || ""}
                    onChange={e => setForm({ ...form, primary_btn_text: e.target.value })}
                    placeholder="e.g., Book a Demo"
                  />
                </div>
                <div className="form-group">
                  <label>Primary button URL</label>
                  <input
                    value={form.primary_btn_url || ""}
                    onChange={e => setForm({ ...form, primary_btn_url: e.target.value })}
                    placeholder="e.g., https://wa.me/254... or /courses"
                  />
                </div>
              </div>
              {hasSecondaryBtn && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Secondary button text</label>
                    <input
                      value={form.secondary_btn_text || ""}
                      onChange={e => setForm({ ...form, secondary_btn_text: e.target.value })}
                      placeholder="e.g., Start Learning"
                    />
                  </div>
                  <div className="form-group">
                    <label>Secondary button URL</label>
                    <input
                      value={form.secondary_btn_url || ""}
                      onChange={e => setForm({ ...form, secondary_btn_url: e.target.value })}
                      placeholder="e.g., /courses"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Video Upload */}
          {hasVideo && (
            <div className="form-section">
              <h4>Demo Video</h4>

              {uploadError && (
                <div className="upload-error">
                  <AlertCircle size={16} />
                  <span>{uploadError}</span>
                  <button onClick={() => setUploadError(null)}>&times;</button>
                </div>
              )}

              <div className="upload-zone" onClick={() => !uploading && videoInputRef.current?.click()}>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  style={{ display: "none" }}
                  onChange={handleVideoUpload}
                />
                {uploading ? (
                  <div className="upload-progress">
                    <div className="upload-spinner" />
                    <span>Uploading video to Supabase Storage...</span>
                    <small>Large videos may take a minute. Don't close this window.</small>
                  </div>
                ) : (
                  <div className="upload-prompt">
                    <div className="upload-icon">🎬</div>
                    <span className="upload-title">Upload video from your device</span>
                    <small>MP4, MOV, WebM · Max 200MB recommended</small>
                    <button className="btn-upload" type="button">Choose Video File</button>
                  </div>
                )}
              </div>

              <div className="upload-divider"><span>or paste a URL manually</span></div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Video URL</label>
                <input
                  value={form.video_url || ""}
                  onChange={e => setForm({ ...form, video_url: e.target.value })}
                  placeholder="https://... or /images/demo.mp4"
                />
                <small>Auto-filled after upload, or enter manually.</small>
              </div>

              {form.video_url && (
                <div className="video-preview" style={{ marginTop: "1rem" }}>
                  <video
                    key={form.video_url}
                    controls
                    style={{ width: "100%", borderRadius: "0.5rem", maxHeight: "200px", objectFit: "cover" }}
                  >
                    <source src={form.video_url} type="video/mp4" />
                  </video>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                    <p style={{ fontSize: "0.75rem", color: "var(--gray-500)", margin: 0 }}>
                      ✓ {form.video_url.length > 60 ? "..." + form.video_url.slice(-50) : form.video_url}
                    </p>
                    <button
                      className="btn-icon danger"
                      title="Remove video"
                      onClick={() => setForm({ ...form, video_url: "" })}
                      style={{ width: "28px", height: "28px" }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Image Upload */}
          <div className="form-section">
            <h4>Section Image <span style={{ fontWeight: 400, color: "var(--gray-500)", fontSize: "0.85rem" }}>(optional)</span></h4>

            <div className="upload-zone image-zone" onClick={() => !uploading && imageInputRef.current?.click()}>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImageUpload}
              />
              {uploading ? (
                <div className="upload-progress">
                  <div className="upload-spinner" />
                  <span>Uploading image...</span>
                </div>
              ) : form.image_url ? (
                <div className="image-preview-zone">
                  <img
                    src={form.image_url}
                    alt="Section"
                    style={{ maxHeight: "120px", borderRadius: "0.375rem", objectFit: "cover" }}
                  />
                  <button
                    className="btn-icon danger"
                    title="Remove image"
                    onClick={e => { e.stopPropagation(); setForm({ ...form, image_url: "" }) }}
                    style={{ position: "absolute", top: "0.5rem", right: "0.5rem" }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ) : (
                <div className="upload-prompt">
                  <div className="upload-icon">🖼️</div>
                  <span className="upload-title">Upload section image</span>
                  <small>JPG, PNG, WebP</small>
                  <button className="btn-upload" type="button">Choose Image</button>
                </div>
              )}
            </div>

            <div className="upload-divider"><span>or paste URL</span></div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <input
                value={form.image_url || ""}
                onChange={e => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://... image URL"
              />
            </div>
          </div>

        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving || uploading} className="btn-primary">
            <Save size={16} />
            {saving ? "Saving..." : uploading ? "Uploading..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  )
}
