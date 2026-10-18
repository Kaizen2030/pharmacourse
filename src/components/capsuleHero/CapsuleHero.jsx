import { useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import "./CapsuleHero.css"

/* small inline icons so the hero adds no dependency */
const Icon = ({ d, children }) => (
  <svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children || <path d={d} />}
  </svg>
)
const FlaskIcon = () => (
  <Icon><path d="M12 4h8M13 4v8L6 25a2 2 0 0 0 1.8 3h16.4A2 2 0 0 0 26 25l-7-13V4" /><path d="M9.5 21h13" /></Icon>
)
const CartIcon = () => (
  <Icon><path d="M3 5h4l3 14h14l3-10H9" /><circle cx="12" cy="25" r="1.8" /><circle cx="22" cy="25" r="1.8" /><path d="M17 10v6M14 13h6" /></Icon>
)
const HospitalIcon = () => (
  <Icon><path d="M5 28V9l11-5 11 5v19M3 28h26" /><path d="M16 12v8M12 16h8" /><path d="M13 28v-5h6v5" /></Icon>
)
const ConnectIcon = () => (
  <Icon><path d="M8 12h8a4 4 0 0 1 0 8H8a4 4 0 0 1 0-8Z" /><path d="M16 12h8a4 4 0 0 1 0 8h-8" /><path d="M12 16h8" /></Icon>
)

const CALLOUTS = [
  { key: "learn", pos: "learn", no: "01", title: "Pharmacourse", text: "CPD courses, clinical cases and certificates for pharmacy professionals.", href: "/courses", icon: FlaskIcon },
  { key: "pos", pos: "pos", no: "02", title: "RemedacarePOS", text: "Dispensing, inventory, claims and branches in one pharmacy workflow.", href: "/remedacarepos", icon: CartIcon },
  { key: "practice", pos: "practice", no: "03", title: "Practice ready", text: "Learn with practical scenarios built around real pharmacy decisions.", href: "/courses", icon: FlaskIcon },
  { key: "connect", pos: "connect", no: "04", title: "Connected care", text: "Move from learning to pharmacy operations and hospital management.", href: "#ecosystem", icon: ConnectIcon },
  { key: "hmis", pos: "hmis", no: "05", title: "RemedacareHMIS", text: "Patient records, departments, reporting and hospital operations connected.", href: "/remedacarehmis", icon: HospitalIcon },
]

export default function CapsuleHero({ badge, children }) {
  const stageRef = useRef(null)
  const sectionRef = useRef(null)

  useEffect(() => {
    const mount = stageRef.current
    if (!mount) return undefined
    let cancelled = false
    let hero
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
    import("./capsuleScene.js")
      .then(({ createCapsuleHero }) => {
        if (cancelled) return
        try { hero = createCapsuleHero(mount, { reduced: () => reduced.matches }) } catch (e) { console.error("Capsule hero WebGL unavailable:", e) }
      })
      .catch((e) => console.error("Failed to load capsule hero:", e))

    // parallax for the hex grid + callouts (desktop pointers only)
    const section = sectionRef.current
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)")
    const onMove = (e) => {
      if (!fine.matches || reduced.matches || !section) return
      const r = section.getBoundingClientRect()
      section.style.setProperty("--px", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3))
      section.style.setProperty("--py", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3))
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    return () => {
      cancelled = true
      window.removeEventListener("pointermove", onMove)
      hero?.dispose()
    }
  }, [])

  return (
    <section id="hero" className="cap-hero" ref={sectionRef}>
      <div className="cap-hex" aria-hidden="true" />
      <div className="cap-glow" aria-hidden="true" />
      <div className="cap-stage" ref={stageRef} role="img" aria-label="Open medicine capsules with a plant growing between them, releasing healthcare icons and particles" />

      <div className="cap-content">
        <div className="cap-copy">
          {badge && <span className="cap-badge">{badge}</span>}
          {children}
        </div>

        <ul className="cap-callouts">
          {CALLOUTS.map((c, i) => {
            const I = c.icon
            return (
              <li key={c.key} className={`cap-call cap-call--${c.pos}`} style={{ "--i": i }}>
                <Link to={c.href}>
                  <span className="cap-tab" aria-hidden="true"><i /><i /><b /></span>
                  <span className="cap-call-head">
                    <span className="cap-call-icon"><I /></span>
                    <strong><em>{c.no}</em> {c.title}</strong>
                  </span>
                  <span className="cap-call-text">{c.text}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
