import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  ArrowDown, ArrowLeft, ArrowUp, BookOpen, CheckCircle2, ClipboardList, Eye, GraduationCap, ListChecks, Lock, MessageCircle,
  Plus, Send, Trash2, Undo2, Users, X,
} from "lucide-react"
import { supabase } from "../../lib/supabaseClient"
import { useAuth } from "../../context/AuthContext"
import { friendlyError } from "../../lib/friendlyError"
import { confirmDialog } from "../../lib/dialog"
import { parseLessonVideo } from "../../lib/videoEmbed"
import SEO from "../../components/SEO"
import { useTutorProfile } from "../../lib/useTutorProfile"
import "../admin/admin-learning.css"
import "./tutor-studio.css"

const STATUS = {
  draft: { label: "Draft", tone: "revoked", help: "Only you can see this course." },
  in_review: { label: "In review", tone: "awaiting", help: "An administrator is reviewing it. You can still edit." },
  changes_requested: { label: "Changes requested", tone: "expired", help: "See the note, make the changes, then submit again." },
  approved: { label: "Live", tone: "active", help: "Learners can find and enrol in this course." },
}
const LEVELS = ["Beginner", "Intermediate", "Advanced"]
const kes = (v) => `KES ${Number(v || 0).toLocaleString("en-KE")}`

export default function TutorStudio() {
  const { courseId } = useParams()
  const { user, profile } = useAuth()
  const tutor = useTutorProfile()

  if (tutor.loading) return <main className="ts-page"><div className="ts-shell"><div className="ts-skel" /></div></main>
  if (!user) {
    return <main className="ts-page"><div className="ts-shell"><Gate title="Sign in to open the Tutor studio" text="The Tutor studio is where Pharmacourse tutors build and manage their courses." action={<Link to="/login" className="al-btn primary">Sign in</Link>} /></div></main>
  }
  if (!tutor.instructorId) {
    return (
      <main className="ts-page"><div className="ts-shell">
        <Gate title={tutor.setupMissing ? "The Tutor studio is being set up" : "This account is not a tutor account yet"}
          text={tutor.setupMissing ? "An administrator needs to finish a database step. Please check back soon." : "Ask a Pharmacourse administrator to link your account to your tutor profile. You will then see your courses here."}
          action={<Link to="/dashboard" className="al-btn">Go to My Learning</Link>} />
      </div></main>
    )
  }
  return (
    <main className="ts-page">
      <SEO title="Tutor studio" description="Build and manage your Pharmacourse courses." path="/tutor" noindex />
      <div className="ts-shell">
        {courseId ? <CourseEditor courseId={courseId} /> : <StudioHome name={profile?.full_name?.split(" ")[0]} />}
      </div>
    </main>
  )
}

function Gate({ title, text, action }) {
  return (
    <div className="ts-gate">
      <span className="ts-gate-icon"><GraduationCap size={28} aria-hidden="true" /></span>
      <h1>{title}</h1>
      <p>{text}</p>
      {action}
    </div>
  )
}

function StudioHome({ name }) {
  const navigate = useNavigate()
  const [courses, setCourses] = useState(null)
  const [error, setError] = useState("")
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState("")

  useEffect(() => {
    supabase.rpc("tutor_my_courses").then(({ data, error: e }) => {
      if (e) { setError(friendlyError(e, "We could not load your courses.")); setCourses([]); return }
      setCourses(data || [])
    })
  }, [])

  async function create(event) {
    event.preventDefault()
    if (!newTitle.trim()) return
    setError("")
    const { data: insId } = await supabase.rpc("my_instructor_id")
    const slugBase = newTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)
    const { data, error: e } = await supabase.from("courses").insert({
      title: newTitle.trim(), instructor_id: insId, slug: `${slugBase}-${Math.random().toString(36).slice(2, 6)}`, is_free: false, price: 0, is_published: false,
    }).select("id").single()
    if (e) { setError(friendlyError(e, "We could not create the course.")); return }
    navigate(`/tutor/courses/${data.id}`)
  }

  const totals = (courses || []).reduce((t, c) => ({ students: t.students + Number(c.enrolments), done: t.done + Number(c.completions), live: t.live + (c.is_published ? 1 : 0) }), { students: 0, done: 0, live: 0 })

  return (
    <>
      <header className="ts-hero">
        <div>
          <p className="ts-eyebrow">Tutor studio</p>
          <h1>Welcome{name ? `, ${name}` : ""}</h1>
          <p>Build your courses, add lessons and quizzes, and follow your students. An administrator reviews each course before it goes live.</p>
        </div>
        <div className="ts-hero-actions">
          <button type="button" className="al-btn primary" onClick={() => setCreating(true)}><Plus size={16} aria-hidden="true" /> New course</button>
          <Link to="/tutor/whatsapp" className="al-btn ts-light"><MessageCircle size={16} aria-hidden="true" /> WhatsApp & tips</Link>
        </div>
      </header>

      <section className="al-kpis ts-kpis">
        {[["Courses", (courses || []).length], ["Live", totals.live], ["Students", totals.students], ["Completions", totals.done]].map(([l, v]) => (
          <div key={l} className="al-card al-kpi"><span>{l}</span><strong>{courses ? v : "—"}</strong></div>
        ))}
      </section>

      {creating ? (
        <form className="al-card al-block ts-new" onSubmit={create}>
          <div className="al-block-head"><h3>New course</h3><button type="button" className="al-icon-btn" onClick={() => setCreating(false)} aria-label="Cancel"><X size={16} /></button></div>
          <label className="al-field"><span>Course title</span><input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Managing hypertension at the counter" maxLength={140} autoFocus required /></label>
          <p className="al-muted">You can add the description, price and lessons next. It stays a draft until you submit it.</p>
          <div><button type="submit" className="al-btn primary">Create draft</button></div>
        </form>
      ) : null}

      {error ? <p role="alert" className="al-alert">{error}</p> : null}

      <section className="al-card al-block">
        <div className="al-block-head"><div><h3>My courses</h3><p className="al-muted">Only your own courses appear here.</p></div></div>
        {courses === null ? <p className="al-empty-cell">Loading…</p> : courses.length === 0 ? (
          <div className="ts-empty"><BookOpen size={28} aria-hidden="true" /><p>You have no courses yet.</p><button type="button" className="al-btn primary" onClick={() => setCreating(true)}><Plus size={16} aria-hidden="true" /> Create your first course</button></div>
        ) : (
          <ul className="ts-courses">
            {courses.map((c) => {
              const st = STATUS[c.review_status] || STATUS.draft
              return (
                <li key={c.id}>
                  <Link to={`/tutor/courses/${c.id}`} className="ts-course">
                    <span className="ts-course-icon"><BookOpen size={20} aria-hidden="true" /></span>
                    <span className="ts-course-main">
                      <strong>{c.title}</strong>
                      <span className="al-sub">{c.lessons} lessons · {c.enrolments} students · {c.completions} completed · {c.is_free || !Number(c.price) ? "Free" : kes(c.price)}</span>
                      {c.review_status === "changes_requested" && c.review_note ? <span className="ts-note">Admin note: {c.review_note}</span> : null}
                    </span>
                    <span className={`al-badge ${st.tone}`}>{st.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}

function CourseEditor({ courseId }) {
  const [course, setCourse] = useState(null)
  const [tab, setTab] = useState("details")
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from("courses").select("*").eq("id", courseId).maybeSingle()
    if (e || !data) { setError(e ? friendlyError(e, "We could not load this course.") : "This course was not found, or it belongs to another tutor."); return }
    setCourse(data)
  }, [courseId])
  useEffect(() => { void load() }, [load])

  if (error) return <><BackLink /><p role="alert" className="al-alert">{error}</p></>
  if (!course) return <div className="ts-skel" />
  const st = STATUS[course.review_status || (course.is_published ? "approved" : "draft")] || STATUS.draft
  const live = Boolean(course.is_published)

  return (
    <>
      <BackLink />
      <header className="ts-editor-head">
        <div>
          <h1>{course.title}</h1>
          <p className="al-muted"><span className={`al-badge ${st.tone}`}>{st.label}</span> {st.help}</p>
          {course.review_status === "changes_requested" && course.review_note ? <p className="ts-note big">Admin note: {course.review_note}</p> : null}
        </div>
        {live && course.slug ? <a className="al-btn" href={`/courses/${course.slug}`} target="_blank" rel="noreferrer"><Eye size={16} aria-hidden="true" /> View live page</a> : null}
      </header>
      <div className="al-pills" role="tablist">
        {[{ k: "details", l: "Details", icon: ClipboardList }, { k: "lessons", l: "Lessons & quizzes", icon: ListChecks }, { k: "students", l: "Students", icon: Users }, { k: "review", l: "Review & publish", icon: Send }].map((t) => (
          <button key={t.k} type="button" role="tab" aria-selected={tab === t.k} className={`al-pill${tab === t.k ? " active" : ""}`} onClick={() => setTab(t.k)}>
            <t.icon size={15} aria-hidden="true" /> {t.l}
          </button>
        ))}
      </div>
      {tab === "details" ? <DetailsTab course={course} onSaved={load} /> : null}
      {tab === "lessons" ? <LessonsTab course={course} /> : null}
      {tab === "students" ? <StudentsTab courseId={course.id} /> : null}
      {tab === "review" ? <ReviewTab course={course} onChanged={load} /> : null}
    </>
  )
}

function BackLink() {
  return <Link to="/tutor" className="al-back"><ArrowLeft size={16} aria-hidden="true" /> My courses</Link>
}

function DetailsTab({ course, onSaved }) {
  const [f, setF] = useState({
    title: course.title || "", short_desc: course.short_desc || "", description: course.description || "", category: course.category || "",
    level: course.level || "", cpd_hours: course.cpd_hours ?? "", learning_outcomes: course.learning_outcomes || "", prerequisites: course.prerequisites || "",
    image_url: course.image_url || "", is_free: Boolean(course.is_free), price: course.price ?? 0,
  })
  const [categories, setCategories] = useState([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")
  const [error, setError] = useState("")
  const live = Boolean(course.is_published)
  useEffect(() => { supabase.from("course_categories").select("name").order("name").then(({ data }) => setCategories((data || []).map((c) => c.name))) }, [])

  async function save(event) {
    event.preventDefault()
    setBusy(true); setMsg(""); setError("")
    if (f.image_url && !/^https:\/\//i.test(f.image_url)) { setError("The cover image link must start with https://"); setBusy(false); return }
    const payload = {
      title: f.title.trim(), short_desc: f.short_desc.trim() || null, description: f.description.trim() || null, category: f.category || null,
      level: f.level || null, cpd_hours: f.cpd_hours === "" ? null : Number(f.cpd_hours), learning_outcomes: f.learning_outcomes.trim() || null,
      prerequisites: f.prerequisites.trim() || null, image_url: f.image_url.trim() || null,
      ...(live ? {} : { is_free: f.is_free, price: f.is_free ? 0 : Number(f.price) || 0 }),
    }
    const { error: e } = await supabase.from("courses").update(payload).eq("id", course.id)
    setBusy(false)
    if (e) { setError(friendlyError(e, "We could not save the course.")); return }
    setMsg("Saved."); onSaved()
  }

  return (
    <form className="al-card al-block" onSubmit={save}>
      <div className="ts-grid">
        <label className="al-field ts-span2"><span>Course title</span><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={140} required /></label>
        <label className="al-field ts-span2"><span>One-line summary</span><input value={f.short_desc} onChange={(e) => setF({ ...f, short_desc: e.target.value })} maxLength={200} placeholder="Shown on course cards" /></label>
        <label className="al-field ts-span2"><span>Description</span><textarea rows={5} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Who is it for and what will they be able to do?" /></label>
        <label className="al-field"><span>Category</span>
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            <option value="">Choose…</option>{categories.map((c) => <option key={c}>{c}</option>)}{f.category && !categories.includes(f.category) ? <option>{f.category}</option> : null}
          </select>
        </label>
        <label className="al-field"><span>Level</span>
          <select value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })}><option value="">Choose…</option>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select>
        </label>
        <label className="al-field"><span>CPD hours</span><input type="number" min="0" step="0.5" value={f.cpd_hours} onChange={(e) => setF({ ...f, cpd_hours: e.target.value })} /></label>
        <label className="al-field"><span>Cover image link (optional)</span><input type="url" value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} placeholder="https://…" /></label>
        <label className="al-field ts-span2"><span>What learners will learn (one per line)</span><textarea rows={4} value={f.learning_outcomes} onChange={(e) => setF({ ...f, learning_outcomes: e.target.value })} placeholder={"Explain resistance to patients\nPick first-line treatment"} /></label>
        <label className="al-field ts-span2"><span>Before you start (optional, one per line)</span><textarea rows={2} value={f.prerequisites} onChange={(e) => setF({ ...f, prerequisites: e.target.value })} /></label>
        <div className="al-field ts-span2"><span>Price</span>
          {live ? <p className="ts-locked"><Lock size={14} aria-hidden="true" /> {course.is_free || !Number(course.price) ? "Free" : kes(course.price)} · the price of a live course is changed by an administrator.</p> : (
            <div className="ts-price">
              <div className="al-seg"><button type="button" className={f.is_free ? "active" : ""} onClick={() => setF({ ...f, is_free: true })}>Free</button><button type="button" className={!f.is_free ? "active" : ""} onClick={() => setF({ ...f, is_free: false })}>Paid</button></div>
              {!f.is_free ? <input type="number" min="0" step="50" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} aria-label="Price in KES" /> : null}
              {!f.is_free ? <span className="al-muted">KES · proposed price, confirmed at review</span> : null}
            </div>
          )}
        </div>
      </div>
      {error ? <p role="alert" className="al-alert">{error}</p> : null}
      {msg ? <p role="status" className="al-alert ok">{msg}</p> : null}
      <div><button type="submit" className="al-btn primary" disabled={busy}>{busy ? "Saving…" : "Save details"}</button></div>
    </form>
  )
}

function LessonsTab({ course }) {
  const [lessons, setLessons] = useState([])
  const [quizzes, setQuizzes] = useState({})
  const [openQuiz, setOpenQuiz] = useState(null)
  const [error, setError] = useState("")
  const live = Boolean(course.is_published)

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from("course_modules").select("id, course_id, title, description, video_url, duration_minutes, order_index").eq("course_id", course.id).order("order_index")
    if (e) { setError(friendlyError(e, "We could not load lessons.")); return }
    setLessons(data || [])
    const ids = (data || []).map((l) => l.id)
    if (ids.length) {
      const { data: qz } = await supabase.from("lesson_quizzes").select("id, lesson_id").in("lesson_id", ids)
      setQuizzes(Object.fromEntries((qz || []).map((q) => [q.lesson_id, q.id])))
    }
  }, [course.id])
  useEffect(() => { void load() }, [load])

  async function add() {
    setError("")
    const { error: e } = await supabase.from("course_modules").insert({ course_id: course.id, title: `Lesson ${lessons.length + 1}`, order_index: lessons.length + 1 })
    if (e) setError(friendlyError(e, "We could not add a lesson.")); else void load()
  }
  async function move(i, dir) {
    const a = lessons[i], b = lessons[i + dir]
    if (!a || !b) return
    await Promise.all([
      supabase.from("course_modules").update({ order_index: b.order_index }).eq("id", a.id),
      supabase.from("course_modules").update({ order_index: a.order_index }).eq("id", b.id),
    ])
    void load()
  }
  async function remove(l) {
    if (!(await confirmDialog({ title: "Delete this lesson?", message: `"${l.title}" and its quiz will be removed.`, confirmLabel: "Delete", danger: true }))) return
    const { error: e } = await supabase.from("course_modules").delete().eq("id", l.id)
    if (e) setError(friendlyError(e, "We could not delete the lesson.")); else void load()
  }

  return (
    <section className="al-card al-block">
      <div className="al-block-head">
        <div><h3>Lessons</h3><p className="al-muted">Each lesson is a video with notes and an optional quiz. Learners take them in this order.</p></div>
        <button type="button" className="al-btn primary" onClick={() => void add()}><Plus size={16} aria-hidden="true" /> Add lesson</button>
      </div>
      {error ? <p role="alert" className="al-alert">{error}</p> : null}
      {live ? <p className="ts-locked"><Lock size={14} aria-hidden="true" /> This course is live: you can edit and add lessons, but deleting lessons needs an administrator.</p> : null}
      {lessons.length === 0 ? <p className="al-empty-cell">No lessons yet. Add the first one.</p> : (
        <ol className="ts-lessons">
          {lessons.map((l, i) => (
            <LessonRow key={l.id} lesson={l} index={i} count={lessons.length} live={live} hasQuiz={Boolean(quizzes[l.id])}
              onMove={(dir) => void move(i, dir)} onDelete={() => void remove(l)} onQuiz={() => setOpenQuiz(l)} onSaved={load} />
          ))}
        </ol>
      )}
      {openQuiz ? <QuizEditor lesson={openQuiz} onClose={() => { setOpenQuiz(null); void load() }} /> : null}
    </section>
  )
}

// Plain-language check of a lesson video link (YouTube, Vimeo and Drive are checked; other links must be a video file).
function videoHint(video, raw) {
  if (video.kind === "unsupported") return { tone: "ts-bad", text: "This link cannot be played. Use a YouTube, Vimeo or Google Drive video link." }
  if (video.kind === "file") {
    return /\.(mp4|webm|m4v|mov|m3u8)($|\?)/i.test(String(raw)) ? { tone: "ts-ok", text: "Direct video file." } : { tone: "ts-bad", text: "This does not look like a video. Use a YouTube, Vimeo or Google Drive link, or a link ending in .mp4." }
  }
  return { tone: "ts-ok", text: { youtube: "YouTube video found.", vimeo: "Vimeo video found.", drive: "Google Drive video found." }[video.kind] || "Video link looks good." }
}

function LessonRow({ lesson, index, count, live, hasQuiz, onMove, onDelete, onQuiz, onSaved }) {
  const [f, setF] = useState({ title: lesson.title || "", description: lesson.description || "", video_url: lesson.video_url || "", duration_minutes: lesson.duration_minutes ?? "" })
  const [state, setState] = useState("")
  const video = f.video_url ? parseLessonVideo(f.video_url) : null
  const dirty = f.title !== (lesson.title || "") || f.description !== (lesson.description || "") || f.video_url !== (lesson.video_url || "") || String(f.duration_minutes) !== String(lesson.duration_minutes ?? "")

  async function save() {
    setState("saving")
    const { error } = await supabase.from("course_modules").update({
      title: f.title.trim() || `Lesson ${index + 1}`, description: f.description.trim() || null, video_url: f.video_url.trim() || null,
      duration_minutes: f.duration_minutes === "" ? null : Number(f.duration_minutes),
    }).eq("id", lesson.id)
    setState(error ? "error" : "saved")
    if (!error) onSaved()
  }

  return (
    <li className="ts-lesson">
      <div className="ts-lesson-num">{index + 1}</div>
      <div className="ts-lesson-body">
        <div className="ts-grid">
          <label className="al-field ts-span2"><span>Lesson title</span><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={140} /></label>
          <label className="al-field"><span>Video link</span><input type="url" value={f.video_url} onChange={(e) => setF({ ...f, video_url: e.target.value })} placeholder="YouTube, Vimeo or Google Drive link" />
            {video ? <small className={videoHint(video, f.video_url).tone}>{videoHint(video, f.video_url).text}</small> : null}
          </label>
          <label className="al-field"><span>Length (minutes)</span><input type="number" min="0" value={f.duration_minutes} onChange={(e) => setF({ ...f, duration_minutes: e.target.value })} />
            <small>Learners must watch about 80% before completing.</small>
          </label>
          <label className="al-field ts-span2"><span>Notes for learners (optional)</span><textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
        </div>
        <div className="ts-lesson-actions">
          <button type="button" className="al-btn primary" onClick={() => void save()} disabled={!dirty || state === "saving"}>{state === "saving" ? "Saving…" : "Save lesson"}</button>
          {state === "saved" && !dirty ? <span className="ts-ok"><CheckCircle2 size={14} aria-hidden="true" /> Saved</span> : null}
          {state === "error" ? <span className="ts-bad">Could not save. Try again.</span> : null}
          <button type="button" className="al-btn" onClick={onQuiz}><ListChecks size={15} aria-hidden="true" /> {hasQuiz ? "Edit quiz" : "Add quiz"}</button>
          <span className="ts-spacer" />
          <button type="button" className="al-icon-btn" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move up"><ArrowUp size={15} /></button>
          <button type="button" className="al-icon-btn" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move down"><ArrowDown size={15} /></button>
          <button type="button" className="al-icon-btn ts-del" onClick={onDelete} disabled={live} title={live ? "Deleting lessons of a live course needs an administrator" : "Delete lesson"} aria-label="Delete lesson"><Trash2 size={15} /></button>
        </div>
      </div>
    </li>
  )
}

function QuizEditor({ lesson, onClose }) {
  const [quiz, setQuiz] = useState(null)
  const [pass, setPass] = useState(70)
  const [questions, setQuestions] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data: q } = await supabase.from("lesson_quizzes").select("id, passing_score").eq("lesson_id", lesson.id).maybeSingle()
      if (!active) return
      if (q) {
        setQuiz(q); setPass(q.passing_score ?? 70)
        const { data: qs } = await supabase.from("quiz_questions").select("id, question_text, options, correct_answer, explanation, order_index").eq("quiz_id", q.id).order("order_index")
        if (active) setQuestions((qs || []).map((x) => ({ ...x, options: (x.options || []).map((o) => String(o.text ?? o.label ?? o.value ?? o)) })))
      } else {
        setQuestions([{ question_text: "", options: ["", ""], correct_answer: "", explanation: "" }])
      }
    })()
    return () => { active = false }
  }, [lesson.id])

  const setQ = (i, patch) => setQuestions((list) => list.map((q, j) => (j === i ? { ...q, ...patch } : q)))

  async function save() {
    setError("")
    const clean = questions.map((q) => ({ ...q, question_text: q.question_text.trim(), options: q.options.map((o) => o.trim()).filter(Boolean) }))
    const bad = clean.findIndex((q) => !q.question_text || q.options.length < 2 || !q.options.includes(q.correct_answer))
    if (bad >= 0) { setError(`Question ${bad + 1}: add the question, at least two answers, and pick the correct one.`); return }
    setBusy(true)
    try {
      let quizId = quiz?.id
      if (!quizId) {
        const { data, error: e } = await supabase.from("lesson_quizzes").insert({ lesson_id: lesson.id, course_id: lesson.course_id, title: lesson.title, passing_score: Number(pass) || 70 }).select("id").single()
        if (e) throw e
        quizId = data.id
      } else {
        const { error: e } = await supabase.from("lesson_quizzes").update({ passing_score: Number(pass) || 70 }).eq("id", quizId)
        if (e) throw e
      }
      const { error: delErr } = await supabase.from("quiz_questions").delete().eq("quiz_id", quizId)
      if (delErr) throw delErr
      const rows = clean.map((q, i) => ({ quiz_id: quizId, question_text: q.question_text, question_type: "multiple_choice", options: q.options.map((text) => ({ text })), correct_answer: q.correct_answer, explanation: q.explanation?.trim() || null, order_index: i + 1 }))
      const { error: insErr } = await supabase.from("quiz_questions").insert(rows)
      if (insErr) throw insErr
      onClose()
    } catch (e) {
      setError(friendlyError(e, "We could not save the quiz."))
    } finally { setBusy(false) }
  }

  async function removeQuiz() {
    if (!quiz || !(await confirmDialog({ title: "Remove this quiz?", message: "Learners will no longer need to pass it to complete the lesson.", confirmLabel: "Remove", danger: true }))) return
    await supabase.from("quiz_questions").delete().eq("quiz_id", quiz.id)
    await supabase.from("lesson_quizzes").delete().eq("id", quiz.id)
    onClose()
  }

  return (
    <div className="al-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="al-modal ts-quiz" role="dialog" aria-modal="true" aria-labelledby="quiz-title">
        <div className="al-modal-head"><h3 id="quiz-title">Quiz · {lesson.title}</h3><button type="button" className="al-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        <label className="al-field ts-pass"><span>Pass mark (%)</span><input type="number" min="1" max="100" value={pass} onChange={(e) => setPass(e.target.value)} /></label>
        {questions.map((q, i) => (
          <fieldset key={i} className="ts-q">
            <legend>Question {i + 1}</legend>
            <input value={q.question_text} onChange={(e) => setQ(i, { question_text: e.target.value })} placeholder="Type the question" aria-label={`Question ${i + 1}`} />
            {q.options.map((o, k) => (
              <div key={k} className="ts-opt">
                <input type="radio" name={`correct-${i}`} checked={o !== "" && q.correct_answer === o} onChange={() => setQ(i, { correct_answer: o })} aria-label={`Mark answer ${k + 1} correct`} />
                <input value={o} onChange={(e) => {
                  const next = [...q.options]; const was = next[k]; next[k] = e.target.value
                  setQ(i, { options: next, correct_answer: q.correct_answer === was ? e.target.value : q.correct_answer })
                }} placeholder={`Answer ${k + 1}`} aria-label={`Answer ${k + 1}`} />
                {q.options.length > 2 ? <button type="button" className="al-icon-btn" onClick={() => setQ(i, { options: q.options.filter((_, x) => x !== k), correct_answer: q.correct_answer === o ? "" : q.correct_answer })} aria-label="Remove answer"><X size={14} /></button> : null}
              </div>
            ))}
            <div className="ts-q-actions">
              {q.options.length < 6 ? <button type="button" className="al-btn" onClick={() => setQ(i, { options: [...q.options, ""] })}><Plus size={14} aria-hidden="true" /> Answer</button> : null}
              <input className="ts-expl" value={q.explanation || ""} onChange={(e) => setQ(i, { explanation: e.target.value })} placeholder="Why this is correct (optional, shown after the quiz)" />
              {questions.length > 1 ? <button type="button" className="al-icon-btn ts-del" onClick={() => setQuestions((list) => list.filter((_, j) => j !== i))} aria-label="Remove question"><Trash2 size={14} /></button> : null}
            </div>
            <small className="al-muted">Select the circle next to the correct answer.</small>
          </fieldset>
        ))}
        <button type="button" className="al-btn" onClick={() => setQuestions((list) => [...list, { question_text: "", options: ["", ""], correct_answer: "", explanation: "" }])}><Plus size={15} aria-hidden="true" /> Add question</button>
        {error ? <p role="alert" className="al-alert">{error}</p> : null}
        <div className="al-modal-foot">
          {quiz ? <button type="button" className="al-btn danger" onClick={() => void removeQuiz()}>Remove quiz</button> : null}
          <span className="ts-spacer" />
          <button type="button" className="al-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="al-btn primary" onClick={() => void save()} disabled={busy}>{busy ? "Saving…" : "Save quiz"}</button>
        </div>
      </div>
    </div>
  )
}

function StudentsTab({ courseId }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState("")
  useEffect(() => {
    supabase.rpc("tutor_course_students", { p_course: courseId }).then(({ data, error: e }) => {
      if (e) { setError(friendlyError(e, "We could not load students.")); setRows([]); return }
      setRows(data || [])
    })
  }, [courseId])
  return (
    <section className="al-card al-block">
      <div className="al-block-head"><div><h3>Students</h3><p className="al-muted">Names and progress only. Contact details stay private; use WhatsApp tips to reach opted-in learners.</p></div></div>
      {error ? <p role="alert" className="al-alert">{error}</p> : null}
      <div className="al-table-wrap">
        <table className="al-table">
          <thead><tr><th>Learner</th><th>Enrolled</th><th>Status</th><th>Progress</th><th>Last active</th></tr></thead>
          <tbody>
            {rows === null ? <tr><td colSpan={5} className="al-empty-cell">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={5} className="al-empty-cell">No students yet.</td></tr> : rows.map((r, i) => (
              <tr key={i} style={{ cursor: "default" }}>
                <td><strong>{r.learner}</strong></td>
                <td>{new Date(r.enrolled_at).toLocaleDateString("en-KE")}</td>
                <td><span className={`al-badge ${r.status === "completed" ? "active" : "awaiting"}`}>{r.status === "completed" ? "Completed" : "Learning"}</span></td>
                <td><div className="al-progress"><span style={{ width: `${r.progress_pct}%` }} /></div><span className="al-progress-num">{r.progress_pct}%</span></td>
                <td>{r.last_active ? new Date(r.last_active).toLocaleDateString("en-KE") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ReviewTab({ course, onChanged }) {
  const [lessonCount, setLessonCount] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => {
    supabase.from("course_modules").select("id, video_url").eq("course_id", course.id).then(({ data }) => setLessonCount({ total: (data || []).length, withVideo: (data || []).filter((l) => l.video_url).length }))
  }, [course.id])

  const checks = [
    { ok: Boolean(course.title && course.short_desc), label: "Title and one-line summary" },
    { ok: Boolean(course.description && course.description.length > 80), label: "A description of at least a few sentences" },
    { ok: Boolean(course.category), label: "A category" },
    { ok: Number(lessonCount?.total) > 0, label: "At least one lesson" },
    { ok: lessonCount && lessonCount.total > 0 && lessonCount.withVideo === lessonCount.total, label: "Every lesson has a video" },
  ]
  const ready = checks.every((c) => c.ok)
  const status = course.review_status || (course.is_published ? "approved" : "draft")

  async function setStatus(next) {
    setBusy(true); setError("")
    const { error: e } = await supabase.from("courses").update({ review_status: next }).eq("id", course.id)
    setBusy(false)
    if (e) setError(friendlyError(e, "That could not be saved.")); else onChanged()
  }

  return (
    <section className="al-card al-block">
      <div className="al-block-head"><div><h3>Review & publish</h3><p className="al-muted">An administrator checks every course before learners can see it.</p></div></div>
      <ul className="ts-checks">
        {checks.map((c) => <li key={c.label} className={c.ok ? "ok" : ""}>{c.ok ? <CheckCircle2 size={16} aria-hidden="true" /> : <span className="ts-dot" />} {c.label}</li>)}
      </ul>
      {error ? <p role="alert" className="al-alert">{error}</p> : null}
      {status === "approved" ? <p className="al-alert ok">This course is live. Edits you save appear for learners straight away.</p> : null}
      {status === "in_review" ? (
        <div className="ts-review-row"><span className="al-muted">Submitted {course.submitted_at ? new Date(course.submitted_at).toLocaleString("en-KE") : ""}. You'll see the result here.</span>
          <button type="button" className="al-btn" onClick={() => void setStatus("draft")} disabled={busy}><Undo2 size={15} aria-hidden="true" /> Withdraw</button></div>
      ) : null}
      {status === "draft" || status === "changes_requested" ? (
        <div className="ts-review-row">
          <span className="al-muted">{ready ? "Everything looks ready." : "Complete the checklist before submitting."}</span>
          <button type="button" className="al-btn primary" onClick={() => void setStatus("in_review")} disabled={busy || !ready}><Send size={15} aria-hidden="true" /> Submit for review</button>
        </div>
      ) : null}
    </section>
  )
}
