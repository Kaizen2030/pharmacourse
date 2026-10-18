import { Link } from "react-router-dom"
import { BookOpen, ShoppingCart, Building2, ChevronRight } from "lucide-react"
import "./ProductShowcase.css"

const PRODUCTS = [
  {
    key: "learn", side: "left", tab: "LEARN", icon: BookOpen,
    kicker: "Professional development", title: "Pharmacourse",
    text: "Practical CPD courses, clinical case simulations and certificates designed for pharmacy professionals.",
    stat: ["72%", "Courses completed"], cta: "Explore courses", href: "/courses",
  },
  {
    key: "pos", side: "right", tab: "OPERATE", icon: ShoppingCart,
    kicker: "Pharmacy operations", title: "RemedacarePOS",
    text: "Dispensing, inventory, patient requests, claims and branch operations for pharmacies.",
    stat: ["248", "Dispensed today"], cta: "Explore RemedacarePOS", href: "/remedacarepos",
  },
  {
    key: "hmis", side: "left", tab: "MANAGE CARE", icon: Building2,
    kicker: "Hospital management", title: "RemedacareHMIS",
    text: "Patient records, clinical departments, reporting, finance and hospital operations in one HMIS.",
    stat: ["1,284", "Care pathways tracked"], cta: "Explore RemedacareHMIS", href: "/remedacarehmis",
  },
]

/* glossy capsule + sprouting plant, pure SVG (no WebGL, no images) */
function CapsuleArt() {
  return (
    <svg className="ps-art" viewBox="10 20 420 460" role="img" aria-label="Two medicine capsules with a plant growing between them">
      <defs>
        <linearGradient id="psSolid" x1="0" x2="1">
          <stop offset="0" stopColor="#0a5a3e" /><stop offset="0.45" stopColor="#2fa254" /><stop offset="1" stopColor="#0a5a3e" />
        </linearGradient>
        <linearGradient id="psGlass" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" /><stop offset="1" stopColor="#c9efc2" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="psLeaf" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#8fd16a" /><stop offset="1" stopColor="#2c8a45" />
        </linearGradient>
        <radialGradient id="psShadow"><stop offset="0" stopColor="#0f6e56" stopOpacity="0.28" /><stop offset="1" stopColor="#0f6e56" stopOpacity="0" /></radialGradient>
        <clipPath id="psClipLow"><rect x="-70" y="0" width="140" height="170" /></clipPath>
        <symbol id="psCap" viewBox="-70 -140 140 280" overflow="visible">
          <rect x="-60" y="-130" width="120" height="260" rx="60" fill="url(#psGlass)" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="2" />
          <g clipPath="url(#psClipLow)"><rect x="-60" y="-130" width="120" height="260" rx="60" fill="url(#psSolid)" /></g>
          <rect x="-60" y="-1" width="120" height="3" fill="#ffffff" fillOpacity="0.55" />
          <rect x="-44" y="-112" width="12" height="104" rx="6" fill="#fff" fillOpacity="0.85" />
          <rect x="-44" y="22" width="9" height="84" rx="4.5" fill="#fff" fillOpacity="0.35" />
        </symbol>
      </defs>

      <ellipse cx="220" cy="452" rx="150" ry="16" fill="url(#psShadow)" />

      {/* leaves sprouting from between the capsules */}
      <g className="ps-leaves" transform="translate(228 310) scale(1.22)">
        <g className="ps-leaf ps-leaf-1"><path d="M0 0C20-60 90-90 150-70C140-10 70 30 0 0Z" fill="url(#psLeaf)" /><path d="M4-4C50-30 100-52 146-68" stroke="#e9f9dd" strokeOpacity="0.7" strokeWidth="2" fill="none" /></g>
        <g className="ps-leaf ps-leaf-2"><path d="M0 0C-10-70-70-120-130-120C-130-50-70 10 0 0Z" fill="url(#psLeaf)" /><path d="M-2-4C-40-40-85-80-126-116" stroke="#e9f9dd" strokeOpacity="0.7" strokeWidth="2" fill="none" /></g>
        <g className="ps-leaf ps-leaf-3"><path d="M0 0C30-40 60-50 100-40C90 5 40 25 0 0Z" fill="url(#psLeaf)" opacity="0.92" /></g>
      </g>

      {/* capsules */}
      <use href="#psCap" className="ps-cap ps-cap-a" x="-70" y="-140" width="140" height="280" transform="translate(140 320) rotate(-32) scale(0.95)" />
      <use href="#psCap" className="ps-cap ps-cap-b" x="-70" y="-140" width="140" height="280" transform="translate(272 305) rotate(4) scale(1.1)" />

      {/* sparkles */}
      <g fill="#3fae5a" className="ps-sparkles">
        <path d="M70 120l6 14 14 6-14 6-6 14-6-14-14-6 14-6z" />
        <path d="M372 96l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" />
        <circle cx="96" cy="250" r="4" /><circle cx="388" cy="230" r="5" /><circle cx="330" cy="60" r="3" />
      </g>
    </svg>
  )
}

export default function ProductShowcase() {
  return (
    <section id="ecosystem" className="ps-section">
      <div className="ps-hex" aria-hidden="true" />
      <div className="ps-wrap">
        <div className="section-header ps-header">
          <span className="section-badge">Our products</span>
          <h2>Choose the product<br />that fits your team.</h2>
          <p>Professional learning, pharmacy operations, and hospital information are separate tools for different needs.</p>
        </div>

        <div className="ps-stage">
          <div className="ps-center" aria-hidden="false"><CapsuleArt /></div>

          {PRODUCTS.map((p, i) => {
            const I = p.icon
            return (
              <Link key={p.key} to={p.href} className={`ps-call ps-call--${p.key} ps-${p.side}`} style={{ "--i": i }}>
                <span className="ps-tab">
                  <span className="ps-tab-in">
                    <I size={30} strokeWidth={2.4} />
                    <b>{p.tab}</b>
                  </span>
                </span>
                <span className="ps-panel">
                  <span className="ps-panel-in">
                    <small>{`0${i + 1} · ${p.kicker}`}</small>
                    <strong>{p.title}</strong>
                    <span className="ps-text">{p.text}</span>
                    <span className="ps-foot">
                      <span className="ps-stat"><em>{p.stat[0]}</em>{p.stat[1]}</span>
                      <span className="ps-cta">{p.cta} <ChevronRight size={15} /></span>
                    </span>
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
