import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, Download, RefreshCw } from "lucide-react"
import { supabase } from "../../lib/supabaseClient"
import { friendlyError } from "../../lib/friendlyError"
import "./admin-learning.css"

const PERIODS = [7, 30, 90]
const kes = (v) => `KES ${Math.round(Number(v || 0)).toLocaleString("en-KE")}`
const num = (v) => Number(v || 0).toLocaleString("en-KE")
function change(now, prev, unit = "%") {
  const a = Number(now || 0), b = Number(prev || 0)
  if (!b) return a ? "New this period" : "No change"
  const pct = Math.round(((a - b) / b) * 100)
  return `${pct >= 0 ? "+" : ""}${pct}${unit} vs previous period`
}
const csvEscape = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

export default function AdminLearningAnalytics() {
  const [days, setDays] = useState(30)
  const [course, setCourse] = useState("")
  const [courses, setCourses] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [setupNeeded, setSetupNeeded] = useState(false)

  useEffect(() => {
    supabase.from("courses").select("id, title").order("title").then(({ data }) => setCourses(data || []))
  }, [])

  const load = useCallback(async () => {
    setLoading(true); setError("")
    const { data, error: rpcError } = await supabase.rpc("admin_learning_stats", { p_days: days, p_course: course || null })
    setLoading(false)
    if (rpcError) {
      if (/admin_learning_stats|does not exist|schema cache/i.test(rpcError.message || "")) setSetupNeeded(true)
      else setError(friendlyError(rpcError, "We could not load learning analytics."))
      return
    }
    setSetupNeeded(false); setStats(data)
  }, [days, course])

  useEffect(() => { void load() }, [load])

  function exportCsv() {
    const header = ["Course", "Enrolments", "Completion %", "Quiz pass %", "Revenue KES"]
    const lines = (stats?.courses || []).map((c) => [c.title, c.enrolments, c.completion, c.quiz_pass ?? "", c.revenue].map(csvEscape).join(","))
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" })
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `course-performance-${days}d.csv`; a.click()
    URL.revokeObjectURL(a.href)
  }

  const k = stats?.kpis || {}
  const weekly = stats?.weekly || []
  const weekMax = Math.max(1, ...weekly.map((w) => Number(w.paid) + Number(w.free)))
  const f = stats?.funnel || {}
  const funnel = [
    ["Course page visits", f.course_page_visits, "Counted for visitors who accept analytics"],
    ["Enrolled (paid or free)", f.enrolled],
    ["Opened a lesson", f.opened_lesson],
    ["Completed the course", f.completed],
  ]
  const funnelMax = Math.max(1, ...funnel.map((x) => Number(x[1] || 0)))
  const att = stats?.attention || {}
  const attention = [
    ["Payments awaiting confirmation for over 24 hours", att.awaiting_over_24h, "warn"],
    ["Learners with no progress for 14 days", att.stuck_14_days, "warn"],
    ["Access ending in the next 7 days", att.expiring_7_days, "info"],
    ["Reviews waiting for approval", att.reviews_pending, "info"],
  ]

  return (
    <div className="al-page">
      <header className="al-head">
        <div>
          <h2>Learning</h2>
          <p>How learners find, pay for, finish and do on your courses.</p>
        </div>
        <div className="al-head-actions">
          <div className="al-seg" role="radiogroup" aria-label="Period">
            {PERIODS.map((p) => <button key={p} type="button" role="radio" aria-checked={days === p} className={days === p ? "active" : ""} onClick={() => setDays(p)}>{p} days</button>)}
          </div>
          <select value={course} onChange={(e) => setCourse(e.target.value)} aria-label="Course">
            <option value="">All courses</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <button type="button" className="al-btn" onClick={exportCsv} disabled={!stats?.courses?.length}><Download size={16} aria-hidden="true" /> Export CSV</button>
          <button type="button" className="al-icon-btn" onClick={() => void load()} aria-label="Refresh"><RefreshCw size={16} /></button>
        </div>
      </header>

      {setupNeeded ? (
        <div className="al-setup"><strong>One database step is needed.</strong> Run <code>supabase/security/2026-11-28_phase9_enrolments.sql</code> in the Supabase SQL editor, then refresh.</div>
      ) : null}
      {error ? <p role="alert" className="al-alert">{error}</p> : null}

      <section className="al-kpis" aria-busy={loading}>
        {[
          ["Revenue recorded", kes(k.revenue), change(k.revenue, k.revenue_prev)],
          ["New enrolments", num(k.enrolments), change(k.enrolments, k.enrolments_prev)],
          ["Active learners", num(k.active_learners), `Studied in the last ${days} days`],
          ["Completion rate", `${num(k.completion_rate)}%`, "Of learners with access"],
          ["Certificates issued", num(k.certificates), "This period"],
          ["Awaiting payment", num(k.awaiting_payment), "Confirm in Enrolments"],
        ].map(([label, value, sub]) => (
          <div key={label} className="al-card al-kpi">
            <span>{label}</span>
            <strong>{stats ? value : "—"}</strong>
            <small>{stats ? sub : ""}</small>
          </div>
        ))}
      </section>

      <div className="al-row-2">
        <section className="al-card al-block">
          <div className="al-block-head"><h3>New enrolments per week</h3><span className="al-legend"><i className="paid" /> Paid <i className="free" /> Free</span></div>
          <div className="al-bars" role="img" aria-label="New enrolments per week, paid and free">
            {weekly.map((w) => {
              const paid = Number(w.paid), free = Number(w.free)
              return (
                <div key={w.week} className="al-bar" title={`Week of ${new Date(w.week).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}: ${paid} paid, ${free} free`}>
                  <div className="al-bar-stack" style={{ height: `${((paid + free) / weekMax) * 100}%` }}>
                    <span className="free" style={{ flexGrow: free }} />
                    <span className="paid" style={{ flexGrow: paid }} />
                  </div>
                  <small>{new Date(w.week).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</small>
                </div>
              )
            })}
          </div>
        </section>

        <section className="al-card al-block">
          <div className="al-block-head"><h3>From visit to certificate</h3><span className="al-muted">This period</span></div>
          <div className="al-funnel">
            {funnel.map(([label, value, hint]) => (
              <div key={label} className="al-funnel-row" title={hint || undefined}>
                <div className="al-funnel-top"><span>{label}</span><strong>{num(value)}</strong></div>
                <div className="al-meter"><span style={{ width: `${(Number(value || 0) / funnelMax) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="al-card al-block">
        <div className="al-block-head"><h3>Course performance</h3><span className="al-muted">Enrolments and revenue this period; completion and quiz pass all time</span></div>
        <div className="al-table-wrap">
          <table className="al-table">
            <thead><tr><th>Course</th><th>Enrolments</th><th>Completion</th><th>Quiz pass</th><th>Revenue</th></tr></thead>
            <tbody>
              {(stats?.courses || []).length === 0 ? (
                <tr><td colSpan={5} className="al-empty-cell">{loading ? "Loading…" : "No enrolments yet."}</td></tr>
              ) : stats.courses.map((c) => (
                <tr key={c.id}><td><strong>{c.title}</strong></td><td>{num(c.enrolments)}</td><td>{num(c.completion)}%</td><td>{c.quiz_pass == null ? "—" : `${c.quiz_pass}%`}</td><td>{kes(c.revenue)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="al-row-2 even">
        <section className="al-card al-block">
          <div className="al-block-head">
            <div><h3>Where learners drop off</h3><p className="al-muted">{stats?.dropoff?.course_title ? `${stats.dropoff.course_title}: share of learners who reached each lesson.` : "Share of learners who reached each lesson."}</p></div>
          </div>
          {(stats?.dropoff?.lessons || []).length === 0 ? <p className="al-empty-cell">No lesson activity yet.</p> : (
            <div className="al-drop">
              {stats.dropoff.lessons.map((l, i, all) => {
                const prev = i > 0 ? Number(all[i - 1].pct) : Number(l.pct)
                const sharp = i > 0 && prev - Number(l.pct) >= 15
                return (
                  <div key={i} className="al-drop-row" title={l.title}>
                    <span className="al-drop-label">Lesson {i + 1}</span>
                    <div className="al-meter"><span className={sharp || Number(l.pct) < 60 ? "low" : ""} style={{ width: `${l.pct}%` }} /></div>
                    <strong>{l.pct}%</strong>
                  </div>
                )
              })}
              <p className="al-muted small">Red bars mark lessons where many learners stop. Pick a course above to see its lessons.</p>
            </div>
          )}
        </section>

        <section className="al-card al-block">
          <div className="al-block-head"><div><h3>Hardest quizzes</h3><p className="al-muted">Lowest pass rate on the first attempt (at least 3 learners).</p></div></div>
          {(stats?.hardest_quizzes || []).length === 0 ? <p className="al-empty-cell">Not enough quiz attempts yet.</p> : (
            <ul className="al-quiz-list">
              {stats.hardest_quizzes.map((q, i) => (
                <li key={i}>
                  <div><strong>{q.quiz}</strong><span className="al-sub">{[q.course, q.lesson].filter(Boolean).join(" · ")} · {q.attempts} learners</span></div>
                  <strong className={Number(q.first_pass) < 50 ? "al-bad" : ""}>{q.first_pass}%</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="al-card al-block">
        <div className="al-block-head"><h3>Needs attention</h3></div>
        <ul className="al-attention">
          {attention.map(([label, value, tone]) => (
            <li key={label} className={Number(value) > 0 ? "on" : ""}>
              {Number(value) > 0 && tone === "warn" ? <AlertTriangle size={16} aria-hidden="true" /> : <span className="al-dot" aria-hidden="true" />}
              <span>{label}</span>
              <strong className={`al-count ${Number(value) > 0 ? tone : "zero"}`}>{stats ? num(value) : "—"}</strong>
            </li>
          ))}
        </ul>
        <p className="al-muted small">Course ratings are not collected yet, so they are not shown here.</p>
      </section>
    </div>
  )
}
