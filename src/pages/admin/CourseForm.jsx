import { useEffect, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabaseClient"
import { useAuth } from "../../context/AuthContext"
import { getCourseCategoryLabel, normalizeCourseCategory, slugifyCourseCategory } from "../../lib/courseCategoryHelpers"

/* ─── tiny rich-text toolbar (no external deps) ─────────────────────────── */
function RichTextEditor({ value, onChange }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || ""
    }
  }, []) // only on mount

  function exec(cmd, val = null) {
    ref.current?.focus()
    document.execCommand(cmd, false, val)
    onChange(ref.current?.innerHTML || "")
  }

  return (
    <div style={styles.rte}>
      <div style={styles.rteBar}>
        {[["bold","B",true],["italic","I",true],["underline","U",true]].map(([cmd,label,close]) => (
          <button key={cmd} type="button" onMouseDown={e => { e.preventDefault(); exec(cmd) }}
            style={styles.rteBtn}>{close ? <span style={cmd==="bold"?{fontWeight:700}:cmd==="italic"?{fontStyle:"italic"}:{textDecoration:"underline"}}>{label}</span> : label}</button>
        ))}
        <div style={styles.rteSep} />
        <button type="button" onMouseDown={e => { e.preventDefault(); exec("formatBlock","h3") }} style={styles.rteBtn}>H3</button>
        <button type="button" onMouseDown={e => { e.preventDefault(); exec("formatBlock","p") }} style={styles.rteBtn}>¶</button>
        <div style={styles.rteSep} />
        <button type="button" onMouseDown={e => { e.preventDefault(); exec("insertUnorderedList") }} style={styles.rteBtn}>• List</button>
        <button type="button" onMouseDown={e => { e.preventDefault(); exec("insertOrderedList") }} style={styles.rteBtn}>1. List</button>
        <div style={styles.rteSep} />
        <button type="button" onMouseDown={e => { e.preventDefault(); exec("removeFormat") }} style={{...styles.rteBtn, color:"var(--error)"}}>Clear</button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(ref.current?.innerHTML || "")}
        style={styles.rteArea}
        data-placeholder="Write a detailed course description…"
      />
    </div>
  )
}

/* ─── tag input ──────────────────────────────────────────────────────────── */
function TagInput({ tags, onChange }) {
  const [input, setInput] = useState("")

  function add() {
    const t = input.trim()
    if (t && !tags.includes(t)) onChange([...tags, t])
    setInput("")
  }

  function remove(t) { onChange(tags.filter(x => x !== t)) }

  return (
    <div>
      <div style={styles.tagRow}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add() } if (e.key === "Backspace" && !input && tags.length) remove(tags[tags.length-1]) }}
          placeholder="Type a tag and press Enter…"
          style={{ ...styles.tagInput }}
        />
        <button type="button" onClick={add} className="btn btn-outline" style={{ fontSize:".8rem", padding:".4rem .9rem", whiteSpace:"nowrap" }}>+ Add</button>
      </div>
      {tags.length > 0 && (
        <div style={styles.tagList}>
          {tags.map(t => (
            <span key={t} style={styles.tag}>
              {t}
              <button type="button" onClick={() => remove(t)} style={styles.tagX} aria-label={`Remove ${t}`}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── cover image upload ─────────────────────────────────────────────────── */
function CoverUpload({ coverUrl, onUpload, uploading }) {
  const fileRef = useRef(null)

  return (
    <div style={styles.coverWrap}>
      {coverUrl ? (
        <div style={styles.coverPreview}>
          <img src={coverUrl} alt="Course cover" style={styles.coverImg} />
          <div style={styles.coverOverlay}>
            <button type="button" onClick={() => fileRef.current?.click()} style={styles.coverChangeBtn}>
              {uploading ? "Uploading…" : "Change image"}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => fileRef.current?.click()} style={styles.coverEmpty} disabled={uploading}>
          <span style={styles.coverIcon}>↑</span>
          <span style={{ fontSize:".9rem", fontWeight:500, color:"var(--green)" }}>{uploading ? "Uploading…" : "Upload cover image"}</span>
          <span style={{ fontSize:".8rem", color:"var(--text-500)" }}>JPG or PNG · recommended 1200 × 628 px</span>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display:"none" }} onChange={onUpload} />
    </div>
  )
}

/* ─── draggable lesson row ───────────────────────────────────────────────── */
function LessonRow({ lesson, modIdx, lesIdx, onUpdate, onRemove, onVideo, isDragging, dragHandleProps }) {
  return (
    <div style={{ ...styles.lessonRow, opacity: isDragging ? 0.5 : 1 }}>
      <span style={styles.dragHandle} {...dragHandleProps} title="Drag to reorder">⠿</span>
      <input
        value={lesson.title}
        onChange={e => onUpdate(modIdx, lesIdx, "title", e.target.value)}
        onBlur={e => onUpdate(modIdx, lesIdx, "title", e.target.value, true)}
        placeholder="Lesson title…"
        style={styles.lessonTitleInput}
      />
      <input
        value={lesson.duration_min || ""}
        onChange={e => onUpdate(modIdx, lesIdx, "duration_min", e.target.value)}
        onBlur={e => onUpdate(modIdx, lesIdx, "duration_min", e.target.value, true)}
        placeholder="min"
        style={styles.durationInput}
        title="Duration in minutes"
      />
      <button type="button" onClick={() => onVideo(lesson.id, modIdx, lesIdx)}
        className="btn btn-outline"
        style={{ fontSize:".75rem", padding:".3rem .7rem", color: lesson.video_url ? "var(--success)" : undefined }}>
        {lesson.video_url ? "✅ Video" : "+ Video"}
      </button>
      <button type="button" onClick={() => onRemove(modIdx, lesIdx)} style={styles.removeBtn} title="Remove lesson">×</button>
    </div>
  )
}

/* ─── draggable module card ──────────────────────────────────────────────── */
function ModuleCard({ mod, modIdx, onRenameModule, onRemoveModule, onAddLesson, onUpdateLesson, onRemoveLesson, onLessonVideo, onDragLesson }) {
  const [renaming, setRenaming] = useState(false)
  const [title, setTitle] = useState(mod.title)
  const dragOver = useRef(null)

  function handleLessonDragStart(e, li) {
    e.dataTransfer.setData("lessonIdx", li)
    e.dataTransfer.setData("modIdx", modIdx)
  }
  function handleLessonDragOver(e, li) { e.preventDefault(); dragOver.current = li }
  function handleLessonDrop(e) {
    e.preventDefault()
    const fromMod = parseInt(e.dataTransfer.getData("modIdx"))
    const fromLes = parseInt(e.dataTransfer.getData("lessonIdx"))
    if (fromMod === modIdx && fromLes !== dragOver.current) {
      onDragLesson(modIdx, fromLes, dragOver.current)
    }
    dragOver.current = null
  }

  return (
    <div className="card" style={{ marginBottom:"1rem", overflow:"hidden" }}>
      <div style={styles.modHeader}>
        <span style={styles.modIndex}>{modIdx + 1}</span>
        {renaming ? (
          <input
            value={title}
            autoFocus
            onChange={e => setTitle(e.target.value)}
            onBlur={() => { onRenameModule(modIdx, title); setRenaming(false) }}
            onKeyDown={e => { if (e.key === "Enter") { onRenameModule(modIdx, title); setRenaming(false) } }}
            style={{ ...styles.modTitleInput }}
          />
        ) : (
          <h3 style={styles.modTitle} onDoubleClick={() => setRenaming(true)} title="Double-click to rename">{mod.title}</h3>
        )}
        <div style={{ display:"flex", gap:".5rem", alignItems:"center" }}>
          <button type="button" onClick={() => setRenaming(true)} style={styles.modAction}>Rename</button>
          <button type="button" onClick={() => onAddLesson(modIdx)} className="btn btn-outline" style={{ fontSize:".78rem", padding:".28rem .7rem" }}>+ Lesson</button>
          <button type="button" onClick={() => onRemoveModule(modIdx)} style={styles.removeBtn} title="Remove module">×</button>
        </div>
      </div>
      {(mod.lessons || []).length === 0 ? (
        <p style={{ padding:"1rem 1.25rem", fontSize:".85rem", color:"var(--text-500)" }}>No lessons yet — click "+ Lesson" to add one.</p>
      ) : (
        <div onDragOver={e => e.preventDefault()} onDrop={handleLessonDrop}>
          {[...(mod.lessons || [])].sort((a,b) => (a.order_index||0) - (b.order_index||0)).map((les, li) => (
            <div key={les.id || li} draggable
              onDragStart={e => handleLessonDragStart(e, li)}
              onDragOver={e => handleLessonDragOver(e, li)}>
              <LessonRow
                lesson={les} modIdx={modIdx} lesIdx={li}
                onUpdate={onUpdateLesson} onRemove={onRemoveLesson} onVideo={onLessonVideo}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── main form ──────────────────────────────────────────────────────────── */
const DEFAULT_CATEGORIES = ["Microbiology", "Clinical", "Stewardship", "Pharmacovigilance", "General"]

function buildCategoryOptions(managedRows = [], usedRows = [], extraValues = []) {
  const categories = Array.from(
    new Set(
      [
        ...DEFAULT_CATEGORIES,
        ...managedRows.map((row) => row?.name),
        ...usedRows.map((row) => row?.category),
        ...extraValues,
      ]
        .map((value) => getCourseCategoryLabel(value))
        .filter(Boolean)
    )
  )

  return categories.sort((a, b) => a.localeCompare(b))
}

async function ensureCourseCategoryRecord(categoryName) {
  const normalizedName = normalizeCourseCategory(categoryName)
  if (!normalizedName) return

  const payload = {
    name: normalizedName,
    slug: slugifyCourseCategory(normalizedName),
    is_active: true,
  }

  const { error } = await supabase
    .from("course_categories")
    .upsert(payload, { onConflict: "slug" })

  if (error) {
    throw error
  }
}

export default function CourseForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { user } = useAuth()

  const [form, setForm] = useState({
    title:"", slug:"", short_desc:"", description:"", category:"Microbiology",
    is_free:true, price:"0", is_published:false, cover_url:"", tags:[]
  })
  const [modules, setModules] = useState([])
  const [saving, setSaving] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const [error, setError] = useState("")
  const [courseId, setCourseId] = useState(id || null)
  const [saved, setSaved] = useState(false)
  const [categoryOptions, setCategoryOptions] = useState(DEFAULT_CATEGORIES)
  const modDragOver = useRef(null)

  /* load existing course */
  useEffect(() => {
    if (!isEdit) return
    async function load() {
      const { data: c } = await supabase.from("courses").select("*").eq("id", id).single()
      if (c) setForm({
        title: c.title, slug: c.slug, short_desc: c.short_desc||"",
        description: c.description||"", category: c.category||"Microbiology",
        is_free: c.is_free, price: c.price||"0", is_published: c.is_published,
        cover_url: c.cover_url||"", tags: c.tags||[]
      })
      const { data: mods } = await supabase.from("modules").select("*, lessons(*)").eq("course_id", id).order("order_index")
      setModules(mods || [])
    }
    load()
  }, [id, isEdit])

  useEffect(() => {
    async function loadCategoryOptions() {
      const [managedResponse, usedResponse] = await Promise.all([
        supabase.from("course_categories").select("name").order("name", { ascending: true }),
        supabase.from("courses").select("category"),
      ])

      if (managedResponse.error && usedResponse.error) {
        console.error("Failed to load course category options:", managedResponse.error, usedResponse.error)
        return
      }

      setCategoryOptions(buildCategoryOptions(
        managedResponse.data || [],
        usedResponse.data || [],
        [form.category]
      ))
    }

    loadCategoryOptions()
  }, [])

  function setF(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }
  function autoSlug(t) { return t.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") }

  /* cover image upload */
  async function handleCoverUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverUploading(true)
    const ext = file.name.split(".").pop()
    const path = `covers/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from("course-covers").upload(path, file, { upsert:true })
    if (upErr) { alert("Upload failed: " + upErr.message); setCoverUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from("course-covers").getPublicUrl(path)
    setForm(f => ({ ...f, cover_url: publicUrl }))
    setCoverUploading(false)
  }

  /* save course */
  async function saveCourse(e) {
    e.preventDefault()
    setError(""); setSaving(true)
    const payload = {
      ...form,
      category: normalizeCourseCategory(form.category),
      price: parseFloat(form.price)||0,
    }
    if (!payload.slug) payload.slug = autoSlug(payload.title)

    if (isEdit) {
      const { error: err } = await supabase.from("courses").update(payload).eq("id", id)
      if (err) { setError(err.message); setSaving(false); return }

      try {
        await ensureCourseCategoryRecord(payload.category)
      } catch (categoryError) {
        console.error("Failed to sync course category:", categoryError)
      }
    } else {
      payload.created_by = user.id
      const { data, error: err } = await supabase.from("courses").insert(payload).select().single()
      if (err) { setError(err.message); setSaving(false); return }

      try {
        await ensureCourseCategoryRecord(payload.category)
      } catch (categoryError) {
        console.error("Failed to sync course category:", categoryError)
      }

      setCourseId(data.id)
      navigate(`/admin/courses/${data.id}/edit`, { replace:true })
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  /* modules */
  async function addModule() {
    if (!courseId) { alert("Save the course first."); return }
    const title = prompt("Module title:")
    if (!title) return
    const { data } = await supabase.from("modules").insert({ course_id:courseId, title, order_index:modules.length }).select().single()
    setModules(prev => [...prev, { ...data, lessons:[] }])
  }

  async function renameModule(mi, title) {
    const mod = modules[mi]
    if (mod.id) await supabase.from("modules").update({ title }).eq("id", mod.id)
    setModules(prev => prev.map((m,i) => i===mi ? { ...m, title } : m))
  }

  async function removeModule(mi) {
    if (!window.confirm("Remove this module and all its lessons?")) return
    const mod = modules[mi]
    if (mod.id) await supabase.from("modules").delete().eq("id", mod.id)
    setModules(prev => prev.filter((_,i) => i!==mi))
  }

  /* lessons */
  async function addLesson(mi) {
    const mod = modules[mi]
    if (!mod?.id) { alert("Save the module first."); return }
    const { data } = await supabase.from("lessons").insert({ module_id:mod.id, title:"New lesson", order_index:(mod.lessons||[]).length }).select().single()
    setModules(prev => prev.map((m,i) => i===mi ? { ...m, lessons:[...(m.lessons||[]), data] } : m))
  }

  async function updateLesson(mi, li, field, value, persist=false) {
    setModules(prev => prev.map((m,i) => i!==mi ? m : {
      ...m, lessons: m.lessons.map((l,j) => j!==li ? l : { ...l, [field]: value })
    }))
    if (persist) {
      const lesson = modules[mi].lessons[li]
      if (lesson?.id) await supabase.from("lessons").update({ [field]: value }).eq("id", lesson.id)
    }
  }

  async function removeLesson(mi, li) {
    const les = modules[mi].lessons[li]
    if (les?.id) await supabase.from("lessons").delete().eq("id", les.id)
    setModules(prev => prev.map((m,i) => i!==mi ? m : { ...m, lessons: m.lessons.filter((_,j) => j!==li) }))
  }

  async function updateLessonVideo(lessonId, mi, li) {
    const url = prompt("Paste video URL (YouTube, Vimeo, or direct .mp4):")
    if (!url) return
    await supabase.from("lessons").update({ video_url: url }).eq("id", lessonId)
    setModules(prev => prev.map((m,i) => i!==mi ? m : {
      ...m, lessons: m.lessons.map((l,j) => j!==li ? l : { ...l, video_url: url })
    }))
  }

  /* drag-reorder lessons */
  function reorderLesson(mi, fromLi, toLi) {
    if (toLi === null || toLi === undefined || fromLi === toLi) return
    setModules(prev => prev.map((m,i) => {
      if (i !== mi) return m
      const lessons = [...m.lessons]
      const [moved] = lessons.splice(fromLi, 1)
      lessons.splice(toLi, 0, moved)
      const updated = lessons.map((l,idx) => ({ ...l, order_index:idx }))
      updated.forEach(l => { if (l.id) supabase.from("lessons").update({ order_index:l.order_index }).eq("id",l.id) })
      return { ...m, lessons:updated }
    }))
  }

  /* drag-reorder modules */
  function handleModDragStart(e, mi) { e.dataTransfer.setData("modIdx", mi) }
  function handleModDragOver(e, mi) { e.preventDefault(); modDragOver.current = mi }
  function handleModDrop(e) {
    e.preventDefault()
    const from = parseInt(e.dataTransfer.getData("modIdx"))
    const to = modDragOver.current
    if (from === to || to === null) return
    setModules(prev => {
      const arr = [...prev]
      const [moved] = arr.splice(from, 1)
      arr.splice(to, 0, moved)
      const updated = arr.map((m,idx) => ({ ...m, order_index:idx }))
      updated.forEach(m => { if (m.id) supabase.from("modules").update({ order_index:m.order_index }).eq("id",m.id) })
      return updated
    })
    modDragOver.current = null
  }

  return (
    <div className="page" style={{ maxWidth:860 }}>

      {/* Page header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>{isEdit ? "Edit Course" : "New Course"}</h1>
          <p style={styles.pageSubtitle}>{isEdit ? "Update content, modules, and settings." : "Fill in the details below, then add modules and lessons."}</p>
        </div>
        <div style={{ display:"flex", gap:".75rem", alignItems:"center" }}>
          {saved && <span style={styles.savedBadge}>✓ Saved</span>}
          <button type="button" onClick={saveCourse} disabled={saving} className="btn btn-primary">
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create course"}
          </button>
        </div>
      </div>

      {/* ── Cover image ── */}
      <section style={styles.section}>
        <SectionHeading icon="🖼️" label="Cover image" />
        <CoverUpload coverUrl={form.cover_url} onUpload={handleCoverUpload} uploading={coverUploading} />
      </section>

      {/* ── Course details ── */}
      <section style={styles.section}>
        <SectionHeading icon="📋" label="Course details" />
        <div className="card" style={{ padding:"2rem" }}>
          {/* Basic Information */}
          <div style={{ marginBottom:"2rem" }}>
            <h3 style={{ fontSize:"1rem", fontWeight:600, color:"var(--text-900)", marginBottom:"1.25rem", display:"flex", alignItems:"center", gap:".5rem" }}>
              <span style={{ fontSize:"1.1rem" }}>📝</span>
              Basic Information
            </h3>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.5rem", marginBottom:"1.5rem" }}>
              <Field label="Course title" required>
                <input
                  value={form.title}
                  onChange={e => { setF("title")(e); if (!isEdit) setForm(f => ({ ...f, slug: autoSlug(e.target.value) })) }}
                  placeholder="Pharmacovigilance"
                  required
                  style={{ fontSize:"1rem", padding:"0.75rem 1rem", border:"1px solid var(--border)", borderRadius:"8px", width:"100%" }}
                />
              </Field>
              <Field label="URL slug">
                <input
                  value={form.slug}
                  onChange={setF("slug")}
                  placeholder="pharmacovigilance"
                  required
                  style={{ fontSize:"1rem", padding:"0.75rem 1rem", border:"1px solid var(--border)", borderRadius:"8px", width:"100%" }}
                />
              </Field>
            </div>
          </div>

          {/* Descriptions */}
          <div style={{ marginBottom:"2rem" }}>
            <h3 style={{ fontSize:"1rem", fontWeight:600, color:"var(--text-900)", marginBottom:"1.25rem", display:"flex", alignItems:"center", gap:".5rem" }}>
              <span style={{ fontSize:"1.1rem" }}>📖</span>
              Course Descriptions
            </h3>

            <Field label="Short description (shown on course cards)" style={{ marginBottom:"1.5rem" }}>
              <input
                value={form.short_desc}
                onChange={setF("short_desc")}
                placeholder="One-line summary for course cards"
                style={{ fontSize:"1rem", padding:"0.75rem 1rem", border:"1px solid var(--border)", borderRadius:"8px", width:"100%" }}
              />
            </Field>

            <Field label="Full description">
              <div style={{ border:"1px solid var(--border)", borderRadius:"12px", overflow:"hidden", background:"white" }}>
                <RichTextEditor value={form.description} onChange={val => setForm(f => ({ ...f, description:val }))} />
              </div>
            </Field>
          </div>
        </div>
      </section>

      {/* ── Tags ── */}
      <section style={styles.section}>
        <SectionHeading icon="🏷️" label="Tags" />
        <div className="card" style={{ padding:"1.5rem" }}>
          <p style={styles.fieldHint}>Tags help students discover your course via search and filters.</p>
          <TagInput tags={form.tags} onChange={tags => setForm(f => ({ ...f, tags }))} />
        </div>
      </section>

      {/* ── Settings ── */}
      <section style={styles.section}>
        <SectionHeading icon="⚙️" label="Settings" />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.5rem", marginBottom:"1.5rem" }}>
          {/* Category Setting */}
          <div className="card" style={{ padding:"1.5rem", borderLeft:"4px solid var(--green)" }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:"1rem" }}>
              <span style={{ fontSize:"1.5rem", marginTop:".15rem" }}>📁</span>
              <div style={{ flex:1 }}>
                <label className="label" style={{ fontSize:".85rem", fontWeight:600, marginBottom:".6rem", display:"block", color:"var(--text-900)" }}>
                  Course Category
                </label>
                <input
                  list="course-category-options"
                  value={form.category}
                  onChange={setF("category")}
                  placeholder="Type or choose a category"
                  style={{ width:"100%", fontSize:".95rem" }}
                />
                <datalist id="course-category-options">
                  {categoryOptions.map((category) => <option key={category} value={category} />)}
                </datalist>
                <p style={{ fontSize:".75rem", color:"var(--text-500)", marginTop:".4rem" }}>Choose an existing category or type a new one. Managed course categories are available in Admin Dashboard.</p>
              </div>
            </div>
          </div>

          {/* Pricing Setting */}
          <div className="card" style={{ padding:"1.5rem", borderLeft:"4px solid var(--green)" }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:"1rem" }}>
              <span style={{ fontSize:"1.5rem", marginTop:".15rem" }}>💰</span>
              <div style={{ flex:1 }}>
                <label className="label" style={{ fontSize:".85rem", fontWeight:600, marginBottom:".6rem", display:"block", color:"var(--text-900)" }}>
                  Access Type
                </label>
                <select value={form.is_free ? "free":"paid"} onChange={e => setForm(f => ({ ...f, is_free: e.target.value==="free" }))} style={{ width:"100%", fontSize:".95rem" }}>
                  <option value="free">Free — Available to all users</option>
                  <option value="paid">Paid — Requires payment</option>
                </select>
                <p style={{ fontSize:".75rem", color:"var(--text-500)", marginTop:".4rem" }}>Set whether this course is free or paid</p>
              </div>
            </div>
          </div>

          {/* Price Setting */}
          <div className="card" style={{ padding:"1.5rem", borderLeft:"4px solid var(--green)", opacity: form.is_free ? 0.6 : 1 }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:"1rem" }}>
              <span style={{ fontSize:"1.5rem", marginTop:".15rem" }}>🏷️</span>
              <div style={{ flex:1 }}>
                <label className="label" style={{ fontSize:".85rem", fontWeight:600, marginBottom:".6rem", display:"block", color:"var(--text-900)" }}>
                  Course Price
                </label>
                <div style={{ display:"flex", alignItems:"center", gap:".5rem" }}>
                  <span style={{ fontSize:".95rem", fontWeight:500, color:"var(--text-500)" }}>KES</span>
                  <input 
                    type="number" 
                    value={form.price} 
                    onChange={setF("price")} 
                    min="0" 
                    step="1" 
                    disabled={form.is_free}
                    placeholder="0"
                    style={{ flex:1, fontSize:".95rem" }}
                  />
                </div>
                <p style={{ fontSize:".75rem", color:"var(--text-500)", marginTop:".4rem" }}>
                  {form.is_free ? "Price is disabled for free courses" : "Enter the course price in Kenyan Shillings"}
                </p>
              </div>
            </div>
          </div>

          {/* Publication Status */}
          <div className="card" style={{ padding:"1.5rem", borderLeft:"4px solid var(--green)" }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:"1rem" }}>
              <span style={{ fontSize:"1.5rem", marginTop:".15rem" }}>🔔</span>
              <div style={{ flex:1 }}>
                <label className="label" style={{ fontSize:".85rem", fontWeight:600, marginBottom:".8rem", display:"block", color:"var(--text-900)" }}>
                  Publication Status
                </label>
                <div style={{ display:"flex", alignItems:"center", gap:".6rem", padding:".7rem 1rem", background:"var(--bg)", borderRadius:8, border:"1px solid var(--border)" }}>
                  <input 
                    type="checkbox" 
                    checked={form.is_published} 
                    onChange={e => setForm(f => ({ ...f, is_published:e.target.checked }))} 
                    style={{ width:"auto", accentColor:"var(--green)", cursor:"pointer" }}
                  />
                  <span style={{ fontSize:".9rem", fontWeight:500, color:"var(--text-900)", cursor:"pointer", flex:1 }}>
                    {form.is_published ? "Published" : "Draft"}
                  </span>
                  <span style={{ fontSize:".75rem", fontWeight:600, color: form.is_published ? "var(--green)" : "var(--text-500)", textTransform:"uppercase", letterSpacing:"0.3px" }}>
                    {form.is_published ? "✓ Live" : "Draft"}
                  </span>
                </div>
                <p style={{ fontSize:".75rem", color:"var(--text-500)", marginTop:".4rem" }}>
                  {form.is_published ? "This course is visible to enrolled students" : "Save as draft before publishing"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && <p style={styles.errorMsg}>{error}</p>}

      {/* ── Modules & Lessons ── */}
      {courseId && (
        <section style={styles.section}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
            <SectionHeading icon="📚" label="Modules & Lessons" noMargin />
            <button type="button" onClick={addModule} className="btn btn-outline" style={{ fontSize:".85rem" }}>+ Add module</button>
          </div>

          {modules.length === 0 ? (
            <div className="card" style={{ padding:"2.5rem", textAlign:"center" }}>
              <p style={{ fontSize:"2rem", marginBottom:".75rem" }}>📦</p>
              <p style={{ color:"var(--text-500)", fontSize:".95rem" }}>No modules yet. Click "+ Add module" to start building the curriculum.</p>
            </div>
          ) : (
            <div onDragOver={e => e.preventDefault()} onDrop={handleModDrop}>
              {modules.map((mod, mi) => (
                <div key={mod.id || mi} draggable
                  onDragStart={e => handleModDragStart(e, mi)}
                  onDragOver={e => handleModDragOver(e, mi)}>
                  <ModuleCard
                    mod={mod} modIdx={mi}
                    onRenameModule={renameModule}
                    onRemoveModule={removeModule}
                    onAddLesson={addLesson}
                    onUpdateLesson={updateLesson}
                    onRemoveLesson={removeLesson}
                    onLessonVideo={updateLessonVideo}
                    onDragLesson={reorderLesson}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* bottom save */}
      <div style={{ display:"flex", justifyContent:"flex-end", gap:"1rem", paddingBottom:"3rem" }}>
        {saved && <span style={styles.savedBadge}>✓ Saved</span>}
        <button type="button" onClick={saveCourse} disabled={saving} className="btn btn-primary" style={{ minWidth:160 }}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create course"}
        </button>
      </div>
    </div>
  )
}

/* ─── small helpers ──────────────────────────────────────────────────────── */
function SectionHeading({ icon, label, noMargin }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:".5rem", marginBottom: noMargin ? 0 : "1rem" }}>
      <span style={{ fontSize:"1rem" }}>{icon}</span>
      <h2 style={{ fontSize:"1.05rem", fontWeight:600, color:"var(--text-900)" }}>{label}</h2>
    </div>
  )
}

function Field({ label, required, children, style }) {
  return (
    <div style={style}>
      <label className="label" style={{ fontSize:".85rem", fontWeight:500, marginBottom:".35rem", display:"block" }}>
        {label}{required && <span style={{ color:"var(--error)" }}> *</span>}
      </label>
      {children}
    </div>
  )
}

/* ─── styles object ──────────────────────────────────────────────────────── */
const styles = {
  pageHeader: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"2rem", flexWrap:"wrap", gap:"1rem" },
  pageTitle:  { fontSize:"2rem", marginBottom:".25rem" },
  pageSubtitle: { fontSize:".9rem", color:"var(--text-500)" },
  section:    { marginBottom:"2rem" },
  fieldHint:  { fontSize:".83rem", color:"var(--text-500)", marginBottom:".75rem" },
  checkRow:   { display:"flex", alignItems:"center", gap:".6rem", fontSize:".9rem", cursor:"pointer" },
  errorMsg:   { color:"var(--error)", fontSize:".9rem", marginBottom:"1rem" },
  savedBadge: { display:"inline-flex", alignItems:"center", gap:".35rem", background:"var(--green-light)", color:"var(--green)", fontSize:".85rem", fontWeight:500, padding:".4rem .9rem", borderRadius:"999px" },

  /* cover */
  coverWrap:    { borderRadius:10, overflow:"hidden" },
  coverPreview: { position:"relative", width:"100%", height:200, borderRadius:10, overflow:"hidden", border:"1px solid var(--border)" },
  coverImg:     { width:"100%", height:"100%", objectFit:"cover" },
  coverOverlay: { position:"absolute", inset:0, background:"rgba(0,0,0,.35)", display:"flex", alignItems:"center", justifyContent:"center", opacity:0, transition:"opacity .2s" },
  coverChangeBtn: { background:"white", border:"none", padding:".5rem 1.2rem", borderRadius:8, fontWeight:600, cursor:"pointer", fontSize:".9rem" },
  coverEmpty:   { width:"100%", height:160, border:"2px dashed var(--green-mid)", borderRadius:10, background:"var(--green-light)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:".5rem", cursor:"pointer", transition:"background .15s" },
  coverIcon:    { fontSize:"1.6rem", color:"var(--green)" },

  /* rich text */
  rte:          { border:"1px solid var(--border)", borderRadius:8, overflow:"hidden" },
  rteBar:       { display:"flex", alignItems:"center", gap:4, padding:"6px 10px", background:"var(--bg)", borderBottom:"1px solid var(--border)", flexWrap:"wrap" },
  rteBtn:       { padding:"3px 8px", border:"1px solid var(--border)", borderRadius:5, fontSize:".8rem", background:"white", cursor:"pointer", color:"var(--text-900)" },
  rteSep:       { width:1, height:16, background:"var(--border)", margin:"0 2px" },
  rteArea:      { minHeight:120, padding:"12px 14px", fontSize:".92rem", lineHeight:1.7, outline:"none", color:"var(--text-900)" },

  /* tags */
  tagRow:       { display:"flex", gap:".5rem", alignItems:"center" },
  tagInput:     { flex:1, fontSize:".9rem" },
  tagList:      { display:"flex", flexWrap:"wrap", gap:".4rem", marginTop:".75rem" },
  tag:          { display:"inline-flex", alignItems:"center", gap:".35rem", background:"var(--green-light)", color:"var(--green-dark)", fontSize:".82rem", fontWeight:500, padding:".3rem .7rem", borderRadius:"999px" },
  tagX:         { background:"none", border:"none", cursor:"pointer", color:"var(--green)", fontSize:"1rem", lineHeight:1, padding:0, fontWeight:700 },

  /* modules */
  modHeader:    { display:"flex", alignItems:"center", gap:".75rem", padding:".85rem 1.25rem", borderBottom:"1px solid var(--border)", background:"var(--bg)" },
  modIndex:     { width:24, height:24, borderRadius:"50%", background:"var(--green)", color:"white", fontSize:".75rem", fontWeight:700, display:"inline-flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  modTitle:     { fontSize:".95rem", fontWeight:600, flex:1, cursor:"pointer" },
  modTitleInput:{ flex:1, fontSize:".95rem", fontWeight:600, border:"1px solid var(--green)", borderRadius:5, padding:".2rem .5rem" },
  modAction:    { background:"none", border:"none", fontSize:".78rem", color:"var(--text-500)", cursor:"pointer", padding:"0 .35rem" },

  /* lessons */
  lessonRow:    { display:"flex", alignItems:"center", gap:".6rem", padding:".65rem 1.1rem", borderBottom:"1px solid var(--border)" },
  dragHandle:   { fontSize:"1.1rem", color:"var(--text-300)", cursor:"grab", userSelect:"none", flexShrink:0 },
  lessonTitleInput: { flex:1, border:"1px solid transparent", borderRadius:5, padding:".25rem .5rem", fontSize:".88rem", background:"transparent", color:"var(--text-900)", transition:"border .15s", outline:"none" },
  durationInput:{ width:58, border:"1px solid var(--border)", borderRadius:5, padding:".25rem .4rem", fontSize:".82rem", textAlign:"center" },
  removeBtn:    { background:"none", border:"none", color:"var(--text-300)", fontSize:"1.2rem", cursor:"pointer", padding:"0 .25rem", lineHeight:1, flexShrink:0 },
}
