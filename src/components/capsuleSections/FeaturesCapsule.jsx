import { useEffect, useMemo, useRef } from "react"
import { CapsuleDefs, Cup, Grain, rng, gauss } from "./shared"
import "./CapsuleSections.css"

const ITEMS = [
  { key: "a", title: "Self-Paced Learning", desc: "Learn at your own speed with short, focused modules.", line: "M268 250 L384 208" },
  { key: "b", title: "Downloadable Resources", desc: "Clinical notes and reference materials included.", line: "M690 268 L626 212" },
  { key: "c", title: "CPD Certificates", desc: "Earn certificates for your professional portfolio.", line: "M322 437 L440 336" },
]

function buildGrains() {
  const r = rng(7)
  const out = []
  const stream = (from, to, n) => {
    for (let i = 0; i < n; i++) {
      const t = Math.pow(r(), 0.85) * 1.2
      const spread = (1 - Math.min(t, 1)) * 46 + 6
      const x = from[0] + (to[0] - from[0]) * t + gauss(r) * spread
      const y = from[1] + (to[1] - from[1]) * t + gauss(r) * spread * 0.7
      const big = r() < 0.14
      out.push({ x, y, r: big ? 6 + r() * 4.5 : 1.6 + r() * 3.6, tone: r() < 0.5 ? (r() < 0.5 ? 0 : 1) : 2 })
    }
  }
  stream([372, 200], [498, 372], 190)
  stream([628, 200], [502, 372], 190)
  // dense cloud where the streams meet
  for (let i = 0; i < 90; i++) {
    out.push({ x: 500 + gauss(r) * 34, y: 365 + gauss(r) * 40, r: 1.4 + r() * 4.2, tone: r() < 0.5 ? (r() < 0.5 ? 0 : 1) : 2 })
  }
  // little cluster spilling inside each mouth
  for (let i = 0; i < 40; i++) {
    const side = i % 2 ? 1 : -1
    out.push({ x: 500 + side * (124 + gauss(r) * 26), y: 196 + gauss(r) * 16, r: 3 + r() * 5.5, tone: r() < 0.5 ? 0 : 2 })
  }
  return out.sort((a, b) => a.r - b.r)
}

export default function FeaturesCapsule({ badge, heading }) {
  const grains = useMemo(buildGrains, [])
  const stageRef = useRef(null)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return undefined
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onMove = (event) => {
      if (reduce.matches) return
      const rect = stage.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = ((event.clientY - rect.top) / rect.height) * 2 - 1
      stage.style.setProperty("--mx", Math.max(-1, Math.min(1, x)).toFixed(3))
      stage.style.setProperty("--my", Math.max(-1, Math.min(1, y)).toFixed(3))
    }
    const reset = () => {
      stage.style.setProperty("--mx", "0")
      stage.style.setProperty("--my", "0")
    }
    stage.addEventListener("pointermove", onMove, { passive: true })
    stage.addEventListener("pointerleave", reset)
    return () => {
      stage.removeEventListener("pointermove", onMove)
      stage.removeEventListener("pointerleave", reset)
    }
  }, [])

  return (
    <section id="features" className="cs-section cs-features">
      <div className="cs-wrap">
        <div className="cs-title cs-title--features">
          <small>{badge || "Pharmacourse Learning"}</small>
          <strong>{heading || "Accelerate your career with practical skills"}</strong>
          <span>Build practical confidence with short lessons, clinical references, and recognised CPD progress.</span>
        </div>

        <div className="cs-stage" ref={stageRef}>
          <div className="cs-stage-glow" aria-hidden="true" />
          <div className="cs-scene">
          <svg className="cs-svg" viewBox="0 0 1000 560" preserveAspectRatio="xMidYMin slice" role="img" aria-label="Two open capsules releasing green and white grains">
            <CapsuleDefs />
            <ellipse className="cs-stage-shadow" cx="500" cy="468" rx="245" ry="25" fill="#0f6e56" opacity="0.12" />
            <Cup className="cs-capsule cs-capsule--left" tone="silver" transform="translate(352 182) rotate(-44) scale(0.86)" />
            <Cup className="cs-capsule cs-capsule--right" tone="green" transform="translate(648 182) rotate(44) scale(0.86)" />
            <g className="cs-grains cs-float">{grains.map((g, i) => <g className="cs-grain" style={{ "--grain-i": i }} key={i}><Grain {...g} /></g>)}</g>
            <g className="cs-lines" fill="none" stroke="#0f6e56" strokeWidth="2">
              {ITEMS.map((it) => <path key={it.key} d={it.line} />)}
              <circle cx="384" cy="208" r="3.5" fill="#0f6e56" /><circle cx="626" cy="212" r="3.5" fill="#0f6e56" /><circle cx="440" cy="336" r="3.5" fill="#0f6e56" />
            </g>
          </svg>
          </div>

          {ITEMS.map((it) => (
            <div key={it.key} className={`cs-callout cs-callout--${it.key}`}>
              <span className="cs-pill">{it.title}</span>
              <p>{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
