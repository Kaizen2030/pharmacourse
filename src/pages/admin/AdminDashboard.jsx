import { useState, useEffect, useRef } from "react"
import { supabase } from "../../lib/supabaseClient"
import { useAuth } from "../../context/AuthContext"
import {
  BookOpen, Home, LogOut, Plus, Edit2, Trash2, Eye, EyeOff,
  Save, GripVertical, AlertCircle, RefreshCw, FlaskConical, Users
} from "lucide-react"
import "./AdminDashboard.css"

export default function AdminDashboard() {
  const { user, profile } = useAuth()
  const [activeTab, setActiveTab] = useState("courses")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.role !== "admin") {
      window.location.href = "/dashboard"
      return
    }
    setLoading(false)
  }, [profile])

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
          <button
            className={`menu-item ${activeTab === "admins" ? "active" : ""}`}
            onClick={() => setActiveTab("admins")}
          >
            <Users size={20} />
            <span>Admins</span>
          </button>
        </nav>

        <button className="logout-btn" onClick={logout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>

      <div className="admin-content">
        {activeTab === "courses" && <CoursesTab />}
        {activeTab === "homepage" && <HomepageTab />}
        {activeTab === "quizzes" && <QuizManagementTab />}
        {activeTab === "simulations" && <SimulationsTab />}
        {activeTab === "admins" && <AdminUsersTab />}
      </div>
    </div>
  )
}

// ─── COURSES TAB ─────────────────────────────────────────────────────────────

function AdminUsersTab() {
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
            View current admins and promote signed-up users to admin.
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
          placeholder="Search by name, email, professional ID, or role"
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
              <h3 style={{ margin: 0 }}>Current Admins</h3>
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
