import { useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { CapsuleDefs, Cup } from "../capsuleSections/shared"
import "./CtaBanner.css"

const Leaf = ({ x, y, r, s = 1, o = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} opacity={o}>
    <use href="#ctaLeaf" />
  </g>
)

/* open capsule halves with two vines crossing, leaves in brand green */
function CapsuleVineArt() {
  return (
    <svg className="cb-art" viewBox="0 0 520 500" role="img" aria-label="Two open capsule halves with a plant growing out of them">
      <CapsuleDefs />
      <defs>
        <linearGradient id="ctaLeafG" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#9be07a" /><stop offset="0.55" stopColor="#35a84e" /><stop offset="1" stopColor="#0f6e56" />
        </linearGradient>
        <g id="ctaLeaf">
          <path d="M0 0C6-30 40-52 84-44C80-6 42 14 0 0Z" fill="url(#ctaLeafG)" />
          <path d="M2-2C28-14 54-26 80-42" stroke="#eafbe0" strokeOpacity="0.75" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>
        <radialGradient id="ctaShadow"><stop offset="0" stopColor="#0f6e56" stopOpacity="0.3" /><stop offset="1" stopColor="#0f6e56" stopOpacity="0" /></radialGradient>
      </defs>

      <g transform="translate(40 22) scale(0.8)">
        {/* capsule halves (mouths up) */}
        <Cup className="cb-capsule cb-capsule--green" tone="green" transform="translate(150 428) rotate(213) scale(0.95)" />
        <Cup className="cb-capsule cb-capsule--silver" tone="silver" transform="translate(372 418) rotate(146) scale(0.95)" />

        {/* vines growing out of the mouths, crossing */}
        <g className="cb-vines" fill="none" stroke="#2f8f3e" strokeWidth="5.5" strokeLinecap="round">
          <path d="M152 430C140 320 232 262 282 222C332 182 334 112 318 60" />
          <path d="M370 420C392 310 292 276 238 236C190 198 196 122 214 76" />
          <path d="M262 232C300 218 320 180 338 160" strokeWidth="3.5" />
          <path d="M222 240C196 234 168 216 150 190" strokeWidth="3.5" />
        </g>
        <g className="cb-leaves">
          <Leaf x={318} y={64} r={-84} s={0.9} />
          <Leaf x={338} y={160} r={-18} s={1.05} />
          <Leaf x={214} y={80} r={-100} s={0.8} />
          <Leaf x={150} y={190} r={-168} s={1.15} />
          <Leaf x={296} y={134} r={-62} s={0.75} />
          <Leaf x={236} y={164} r={-135} s={0.8} />
          <Leaf x={196} y={242} r={-190} s={0.7} />
          <Leaf x={372} y={232} r={-6} s={0.7} />
        </g>
      </g>
    </svg>
  )
}

export default function CtaBanner({ heading, subheading, primaryText, primaryUrl, secondaryText, secondaryUrl }) {
  const rightRef = useRef(null)
  const words = (heading || "Ready to transform your pharmacy practice?").trim().split(/\s+/)
  const split = Math.max(1, words.length - 2)
  const dark = words.slice(0, split).join(" ")
  const green = words.slice(split).join(" ")

  useEffect(() => {
    const right = rightRef.current
    if (!right) return undefined
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onMove = (event) => {
      if (reduced.matches) return
      const rect = right.getBoundingClientRect()
      right.style.setProperty("--mx", (((event.clientX - rect.left) / rect.width) * 2 - 1).toFixed(3))
      right.style.setProperty("--my", (((event.clientY - rect.top) / rect.height) * 2 - 1).toFixed(3))
    }
    const reset = () => { right.style.setProperty("--mx", "0"); right.style.setProperty("--my", "0") }
    right.addEventListener("pointermove", onMove, { passive: true })
    right.addEventListener("pointerleave", reset)
    return () => { right.removeEventListener("pointermove", onMove); right.removeEventListener("pointerleave", reset) }
  }, [])

  return (
    <section id="cta" className="cb-section">
      <div className="cb-card">
        <span className="cb-edge cb-edge--green" aria-hidden="true" />
        <span className="cb-edge cb-edge--dark" aria-hidden="true" />

        <div className="cb-copy">
          <h2>
            <span className="cb-h-dark">{dark}</span>
            <span className="cb-h-green">{green}</span>
          </h2>
          <div className="cb-dots" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ "--k": i }} />)}</div>
          {subheading && <p>{subheading}</p>}
          <div className="cb-actions">
            <Link to={primaryUrl || "/register"} className="cb-btn cb-btn--primary">{primaryText || "Start Learning Free"} <ArrowRight size={18} /></Link>
            <a href={secondaryUrl} className="cb-btn cb-btn--ghost">{secondaryText || "Book a Demo"}</a>
          </div>
        </div>

        <div className="cb-right" ref={rightRef} aria-hidden="false">
          <span className="cb-layer cb-layer--dark" aria-hidden="true" />
          <span className="cb-layer cb-layer--green" aria-hidden="true" />
          <div className="cb-layer cb-layer--art">
            <div className="cb-hex" aria-hidden="true" />
            <CapsuleVineArt />
          </div>
          <span className="cb-blob cb-blob--top" aria-hidden="true" />
        </div>
      </div>
    </section>
  )
}
