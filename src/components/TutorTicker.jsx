import { useEffect, useState } from "react"
import { GraduationCap, X } from "lucide-react"
import { supabase } from "../lib/supabaseClient"
import { waLink } from "../lib/whatsappConfig"
import "./tutor-ticker.css"

// Running "we are hiring tutors" banner under the menu. Words move right to left, pause on hover, stand still for
// visitors who prefer less motion, and can be closed (comes back after 7 days).
const HIDE_KEY = "pc-tutor-ticker-hidden"
const HIDE_DAYS = 7

const LINES = [
  "Calling all pharmacists: teach what you know, shape what Kenya learns",
  "Your experience at the counter, ward or office can become a course",
  "Teach one of our courses, or bring a brand-new idea",
  "Clinical • Dispensing • Regulation • Management • Business • Your speciality",
  "Turn your expertise into income",
  "Build your name as an expert: your profile on every course you teach",
  "We help with filming, slides and quizzes. You bring the knowledge",
  "Flexible: create at your own pace, from anywhere",
]

function hiddenRecently() {
  try {
    const at = Number(localStorage.getItem(HIDE_KEY) || 0)
    return at > 0 && Date.now() - at < HIDE_DAYS * 86400000
  } catch { return false }
}

export default function TutorTicker() {
  const [hidden, setHidden] = useState(hiddenRecently)
  const [courses, setCourses] = useState([])

  useEffect(() => {
    if (hidden) return undefined
    let active = true
    supabase.from("courses").select("title").eq("is_published", true).order("created_at", { ascending: false }).limit(12)
      .then(({ data }) => { if (active && data) setCourses(data.map((c) => c.title).filter(Boolean)) })
    return () => { active = false }
  }, [hidden])

  if (hidden) return null

  // Mix the real course names in between the messages.
  const items = [{ text: "We're looking for tutors!", kind: "course" }]
  LINES.forEach((line, i) => {
    items.push({ text: line, kind: "line" })
    if (courses[i]) items.push({ text: `Tutors wanted: ${courses[i]}`, kind: "course" })
  })
  courses.slice(LINES.length).forEach((title) => items.push({ text: `Tutors wanted: ${title}`, kind: "course" }))

  const apply = waLink("Hi Pharmacourse, I'd like to become a tutor. My area of expertise is: ") || "/register"
  const external = apply.startsWith("http")
  const close = () => {
    try { localStorage.setItem(HIDE_KEY, String(Date.now())) } catch { /* storage blocked */ }
    setHidden(true)
  }

  // The list is rendered twice so the loop is seamless; the copy is hidden from screen readers.
  const track = (copy) => (
    <ul className="tt-list" aria-hidden={copy ? "true" : undefined}>
      {items.map((it, i) => (
        <li key={`${copy ? "b" : "a"}-${i}`} className={`tt-item ${it.kind}`}>
          <span className="tt-dot" aria-hidden="true">✦</span>{it.text}
        </li>
      ))}
    </ul>
  )

  return (
    <aside className="tt" aria-label="We are looking for tutors">
      <span className="tt-badge"><GraduationCap size={15} aria-hidden="true" /> <span>Now recruiting tutors</span></span>
      <div className="tt-viewport" style={{ "--tt-duration": `${Math.max(40, items.length * 6)}s` }}>
        <div className="tt-track">{track(false)}{track(true)}</div>
      </div>
      <a className="tt-cta" href={apply} {...(external ? { target: "_blank", rel: "noreferrer" } : {})} aria-label="Apply to teach">
        <span className="tt-cta-long">Apply to teach</span><span className="tt-cta-short" aria-hidden="true">Apply</span>
      </a>
      <button type="button" className="tt-close" onClick={close} aria-label="Hide this message"><X size={15} /></button>
    </aside>
  )
}
