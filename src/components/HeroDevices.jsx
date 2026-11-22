import { Award, BadgeCheck, Check, CirclePlay } from "lucide-react"
import "./hero-devices.css"

// Illustration only (decorative): a laptop showing "My learning" across different course areas, and a phone showing a
// lesson list, so visitors see they can learn on either. Built in HTML/CSS: sharp at any size, no image download.
const LAPTOP_COURSES = [
  { area: "Clinical pharmacy", title: "Managing hypertension and diabetes", pct: 60, note: "Lesson 4 of 7" },
  { area: "Regulation & compliance", title: "Inspection readiness for your pharmacy", pct: 100, note: "Certificate earned" },
  { area: "Pharmacy business", title: "Stock control and pharmacy finance", pct: 25, note: "Lesson 2 of 8" },
]
const PHONE_LESSONS = [
  { title: "Choosing the right antibiotic", done: true },
  { title: "Counselling patients", done: true },
  { title: "Resistance in practice", current: true },
]

export default function HeroDevices() {
  return (
    <div className="hd" aria-hidden="true">
      <div className="hd-glow" />

      <div className="hd-laptop">
        <div className="hd-screen">
          <div className="hd-camera" />
          <div className="hd-app">
            <div className="hd-side">
              <strong className="hd-brand">Pharmacourse</strong>
              <span className="active">My learning</span>
              <span>All courses</span>
              <span>Certificates</span>
              <span>CPD record</span>
            </div>
            <div className="hd-main">
            <div className="hd-app-head">
              <div>
                <span className="hd-kicker">My learning</span>
                <strong className="hd-app-title">Keep learning</strong>
              </div>
              <div className="hd-cpd"><Award size={13} /> 14 / 20 CPD hours</div>
            </div>
            <ul className="hd-courses">
              {LAPTOP_COURSES.map((c) => (
                <li key={c.title} className="hd-course">
                  <span className="hd-pill">{c.area}</span>
                  <strong>{c.title}</strong>
                  <div className="hd-bar"><span style={{ width: `${c.pct}%` }} /></div>
                  <small className={c.pct === 100 ? "done" : ""}>{c.pct === 100 ? <Check size={12} /> : null}{c.note}</small>
                </li>
              ))}
            </ul>
            </div>
          </div>
        </div>
        <div className="hd-base" />
      </div>

      <div className="hd-phone">
        <div className="hd-notch" />
        <div className="hd-phone-app">
          <span className="hd-kicker">Antimicrobial stewardship</span>
          <strong className="hd-phone-title">Antibiotics in everyday practice</strong>
          <div className="hd-bar"><span style={{ width: "60%" }} /></div>
          <small className="hd-muted">3 of 5 lessons complete</small>
          <ul className="hd-lessons">
            {PHONE_LESSONS.map((l, i) => (
              <li key={l.title} className={l.current ? "current" : ""}>
                <span>{i + 1}. {l.title}</span>
                {l.done ? <em>Done</em> : <CirclePlay size={13} />}
              </li>
            ))}
          </ul>
          <div className="hd-phone-btn">Continue lesson</div>
        </div>
      </div>

      <div className="hd-cert">
        <span className="hd-cert-kicker"><BadgeCheck size={14} /> Verified certificate</span>
        <strong>Certificate of completion</strong>
        <small>CPD hours recorded. Share a link so anyone can check it.</small>
      </div>
    </div>
  )
}
