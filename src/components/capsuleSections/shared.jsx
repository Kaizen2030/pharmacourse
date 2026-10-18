/* shared bits for the two capsule-template sections (features + faq) */

// tiny seeded RNG so the grains are identical on every render / SSR pass
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export const gauss = (r) => (r() + r() + r() + r() - 2) / 2 // roughly -1..1

export function Grain({ x, y, r, tone }) {
  return <circle cx={x.toFixed(1)} cy={y.toFixed(1)} r={r.toFixed(1)} fill={tone === 0 ? "url(#csGrainG)" : tone === 1 ? "url(#csGrainD)" : "url(#csGrainW)"} />
}

export function CapsuleDefs() {
  return (
    <defs>
      <radialGradient id="csGrainG" cx="0.35" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#a6ee92" /><stop offset="0.55" stopColor="#2fae5a" /><stop offset="1" stopColor="#0b6a47" />
      </radialGradient>
      <radialGradient id="csGrainD" cx="0.35" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#4fc271" /><stop offset="0.6" stopColor="#0f7a55" /><stop offset="1" stopColor="#07432f" />
      </radialGradient>
      <radialGradient id="csGrainW" cx="0.35" cy="0.3" r="0.85">
        <stop offset="0" stopColor="#ffffff" /><stop offset="0.6" stopColor="#e3e9e6" /><stop offset="1" stopColor="#aeb9b4" />
      </radialGradient>
      <linearGradient id="csSilver" x1="0" x2="1" y1="0" y2="0.4">
        <stop offset="0" stopColor="#ffffff" /><stop offset="0.45" stopColor="#dfe6e2" /><stop offset="1" stopColor="#f6f8f7" />
      </linearGradient>
      <linearGradient id="csGreen" x1="0" x2="1">
        <stop offset="0" stopColor="#0a5a3e" /><stop offset="0.42" stopColor="#35b05c" /><stop offset="0.62" stopColor="#1f9a52" /><stop offset="1" stopColor="#074a34" />
      </linearGradient>
      <linearGradient id="csGlass" x1="0" x2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" /><stop offset="1" stopColor="#e7f3ec" stopOpacity="0.45" />
      </linearGradient>
      <radialGradient id="csCavity" cx="0.5" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#1c5e47" /><stop offset="1" stopColor="#06281d" />
      </radialGradient>
    </defs>
  )
}

/* a capsule half: open end at local y=0, dome pointing up (-y). */
export function Cup({ tone = "silver", transform, className }) {
  const fill = tone === "silver" ? "url(#csSilver)" : "url(#csGreen)"
  return (
    <g transform={transform} className={className}>
      <path d="M-75 0V-95a75 75 0 0 1 150 0V0a75 20 0 0 1-150 0Z" fill={fill} stroke={tone === "silver" ? "#cfd8d3" : "#0a5a3e"} strokeWidth="1" />
      <ellipse cx="0" cy="0" rx="75" ry="20" fill="url(#csCavity)" stroke={tone === "silver" ? "#ffffff" : "#6bd08a"} strokeOpacity="0.8" strokeWidth="2" />
      <rect x="-56" y="-150" width="16" height="118" rx="8" fill="#fff" fillOpacity={tone === "silver" ? 0.95 : 0.55} />
      <rect x="40" y="-120" width="8" height="84" rx="4" fill="#fff" fillOpacity={tone === "silver" ? 0.5 : 0.25} />
    </g>
  )
}
