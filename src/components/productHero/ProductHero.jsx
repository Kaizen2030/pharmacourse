import { useId } from "react"
import { ArrowRight } from "lucide-react"
import "./ProductHero.css"

// Ball-and-stick molecule with glossy, shaded atoms so it reads as 3D.
function Molecule({ className, tone = "green" }) {
  const id = `phm${useId().replace(/[^a-zA-Z0-9]/g, "")}`
  const colors = {
    green: ["#9ff5c4", "#22b87a", "#0a5c45"],
    lime: ["#e6ffb0", "#93d93a", "#4f8a12"],
    white: ["#ffffff", "#d9efe3", "#8fb9a5"],
  }[tone]
  const atoms = [[60, 24, 9], [92, 42, 8], [92, 78, 9], [60, 96, 8], [28, 78, 9], [28, 42, 8], [60, 6, 6], [110, 88, 6], [10, 88, 6]]
  return (
    <svg className={`ph-molecule ${className}`} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-atom`} cx="35%" cy="30%" r="70%">
          <stop offset="0" stopColor={colors[0]} />
          <stop offset="0.55" stopColor={colors[1]} />
          <stop offset="1" stopColor={colors[2]} />
        </radialGradient>
        <linearGradient id={`${id}-bond`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#b9d6c8" />
        </linearGradient>
      </defs>
      <g stroke={`url(#${id}-bond)`} strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M60 24 92 42v36L60 96 28 78V42z" />
        <path d="M60 24V6M92 78l18 10M28 78l-18 10" />
      </g>
      {atoms.map(([cx, cy, r]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-atom)`} />
          <ellipse cx={cx - r * 0.3} cy={cy - r * 0.38} rx={r * 0.32} ry={r * 0.2} fill="#fff" opacity="0.8" />
        </g>
      ))}
    </svg>
  )
}

function Capsule({ className, tone = "green" }) {
  return (
    <span className={`ph-capsule ph-capsule-${tone} ${className}`} aria-hidden="true">
      <span className="ph-capsule-body">
        <span />
        <span />
      </span>
    </span>
  )
}

/**
 * White product hero with bright green shapes, floating capsules and molecules,
 * and the product poster shown as a tilted screen on the right.
 */
export default function ProductHero({ badge, title, copy, primary, secondary, chips = [], image, imageAlt, floatCards = [] }) {
  return (
    <section className="ph-hero">
      <div className="ph-bg" aria-hidden="true">
        <span className="ph-hex" />
        <span className="ph-glow" />
        <span className="ph-sphere ph-sphere-xl" />
        <span className="ph-sphere ph-sphere-lime" />
        <span className="ph-sphere ph-sphere-mint" />
        <span className="ph-sphere ph-sphere-sm" />
        <span className="ph-bubble ph-bubble-1" />
        <span className="ph-bubble ph-bubble-2" />
      </div>

      <Molecule className="ph-mol-1" tone="green" />
      <Molecule className="ph-mol-2" tone="white" />
      <Molecule className="ph-mol-3" tone="lime" />
      <Capsule className="ph-cap-1" />
      <Capsule className="ph-cap-2" tone="lime" />
      <Capsule className="ph-cap-3" tone="mint" />
      <Capsule className="ph-cap-4" />
      <Capsule className="ph-cap-5" tone="lime" />

      <div className="ph-inner">
        <div className="ph-copy">
          <span className="ph-badge"><span className="ph-badge-dot" />{badge}</span>
          <h1>{title}</h1>
          <p>{copy}</p>

          <div className="ph-actions">
            {primary ? (
              <a href={primary.href} target="_blank" rel="noreferrer noopener" className="ph-btn ph-btn-primary">
                {primary.label} <ArrowRight size={17} aria-hidden="true" />
              </a>
            ) : null}
            {secondary ? (
              <a href={secondary.href} target="_blank" rel="noreferrer noopener" className="ph-btn ph-btn-ghost">
                {secondary.label}
              </a>
            ) : null}
          </div>

          {chips.length ? (
            <ul className="ph-chips">
              {chips.map(({ icon: Icon, label }) => (
                <li key={label}>{Icon ? <Icon size={15} aria-hidden="true" /> : null}{label}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="ph-visual">
          <div className="ph-orbit" aria-hidden="true"><span className="ph-orbit-dot" /></div>
          <div className="ph-shadow" aria-hidden="true" />
          <figure className="ph-frame">
            <img src={image} alt={imageAlt} width="960" height="960" decoding="async" fetchpriority="high" />
          </figure>
          {floatCards.map(({ icon: Icon, title: cardTitle, text }, index) => (
            <div key={cardTitle} className={`ph-float ph-float-${index + 1}`} aria-hidden="true">
              {Icon ? <span className="ph-float-icon"><Icon size={16} /></span> : null}
              <span>
                <strong>{cardTitle}</strong>
                <small>{text}</small>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
