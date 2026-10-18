import { useEffect, useMemo, useRef, useState } from "react"
import { CapsuleDefs, Grain, rng } from "./shared"
import "./CapsuleSections.css"

const FAQS = [
  { q: "How can I access the courses?", a: "Browse the course list, register, and enroll. Introductory lessons are easy to start, and certificate access opens once you finish." },
  { q: "What if I do not understand a topic?", a: "Every course includes downloadable resources and support notes so you can review concepts anytime." },
  { q: "Can I study at my own pace?", a: "Yes. Lessons are self-paced and available anytime so you can learn around your schedule." },
  { q: "Who teaches the courses?", a: "Courses are created by experienced pharmacy educators and industry professionals." },
]

function buildGrains() {
  const r = rng(21)
  const out = []
  // packed inside the glass dome (local coords, dome centre (0,-135) radius 75, floor at y=-24)
  for (let i = 0; i < 230; i++) {
    const rr = 2 + r() * 5.2
    const y = -205 + r() * 176
    const dy = y + 135
    const half = y < -135 ? Math.sqrt(Math.max(0, 75 * 75 - dy * dy)) : 75
    const lim = half - rr - 3
    if (lim <= 0) continue
    const x = (r() * 2 - 1) * lim
    out.push({ x, y, r: rr, tone: r() < 0.55 ? (r() < 0.5 ? 0 : 1) : 2 })
  }
  // falling between the halves
  for (let i = 0; i < 60; i++) {
    const rr = 1.6 + r() * 4.5
    out.push({ x: (r() * 2 - 1) * (62 - rr), y: -30 + r() * 62, r: rr, tone: r() < 0.5 ? 0 : 2 })
  }
  // heap in the lower rim
  for (let i = 0; i < 40; i++) {
    const rr = 2 + r() * 4.5
    out.push({ x: (r() * 2 - 1) * (66 - rr), y: 20 + r() * 20, r: rr, tone: r() < 0.5 ? 0 : 2 })
  }
  return out
}

export default function FaqCapsule({ badge, heading }) {
  const grains = useMemo(buildGrains, [])
  const [active, setActive] = useState(0)
  const bodyRef = useRef(null)

  useEffect(() => {
    const body = bodyRef.current
    if (!body) return undefined
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onMove = (event) => {
      if (reduce.matches) return
      const rect = body.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = ((event.clientY - rect.top) / rect.height) * 2 - 1
      body.style.setProperty("--mx", Math.max(-1, Math.min(1, x)).toFixed(3))
      body.style.setProperty("--my", Math.max(-1, Math.min(1, y)).toFixed(3))
    }
    const reset = () => {
      body.style.setProperty("--mx", "0")
      body.style.setProperty("--my", "0")
    }
    body.addEventListener("pointermove", onMove, { passive: true })
    body.addEventListener("pointerleave", reset)
    return () => {
      body.removeEventListener("pointermove", onMove)
      body.removeEventListener("pointerleave", reset)
    }
  }, [])

  return (
    <section id="faq" className="cs-section cs-faq">
      <div className="cs-wrap">
        <div className="cs-title cs-title--faq">
          <small>{badge || "Frequently asked questions"}</small>
          <strong>{heading || "Need help getting started?"}</strong>
          <span>Quick answers for starting, studying, and getting the most from Pharmacourse.</span>
        </div>

        <div className="cs-faq-body" ref={bodyRef}>
          <ul className="cs-faq-list">
            {FAQS.map((f, i) => (
              <li key={i} className="cs-callout cs-callout--faq">
                <button type="button" className={`cs-faq-question${active === i ? " is-active" : ""}`} aria-expanded={active === i} onClick={() => setActive(active === i ? -1 : i)}>
                  <span className="cs-pill"><b>0{i + 1}</b>{f.q}</span><span className="cs-faq-plus" aria-hidden="true">{active === i ? "−" : "+"}</span>
                </button>
                <div className={`cs-faq-answer${active === i ? " is-open" : ""}`}><p>{f.a}</p></div>
              </li>
            ))}
          </ul>

          <div className="cs-faq-art">
          <div className="cs-art-label">Built for confident practice <span>↗</span></div>
          <svg className="cs-svg cs-svg--tall" viewBox="0 0 300 520" role="img" aria-label="A capsule full of green and white grains">
            <CapsuleDefs />
            <ellipse cx="150" cy="498" rx="110" ry="14" fill="#0f6e56" opacity="0.12" />
            <g className="cs-tall-capsule" transform="translate(150 262) rotate(11)">
              {/* solid lower half */}
              <path d="M-75 30V135a75 75 0 0 0 150 0V30a75 20 0 0 1-150 0Z" fill="url(#csGreen)" stroke="#0a5a3e" />
              <ellipse cx="0" cy="30" rx="75" ry="20" fill="url(#csCavity)" stroke="#6bd08a" strokeOpacity="0.8" strokeWidth="2" />
              <rect x="-56" y="62" width="14" height="100" rx="7" fill="#fff" fillOpacity="0.5" />
              <rect x="42" y="70" width="7" height="70" rx="3.5" fill="#fff" fillOpacity="0.22" />
              {/* glass upper half */}
              <path d="M-75 -20V-135a75 75 0 0 1 150 0V-20a75 20 0 0 1-150 0Z" fill="url(#csGlass)" stroke="#fff" strokeWidth="2" />
              <g className="cs-float">{grains.map((g, i) => <g className="cs-grain" style={{ "--grain-i": i }} key={i}><Grain {...g} /></g>)}</g>
              <path d="M-75 -20V-135a75 75 0 0 1 150 0V-20a75 20 0 0 1-150 0Z" fill="none" stroke="#cfd8d3" strokeWidth="1.2" />
              <rect x="-58" y="-190" width="14" height="110" rx="7" fill="#fff" fillOpacity="0.8" />
            </g>
          </svg>
          </div>
        </div>
      </div>
    </section>
  )
}
