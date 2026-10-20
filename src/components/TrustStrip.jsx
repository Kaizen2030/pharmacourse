import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"

const ITEMS = [
  ["learners", "learners enrolled"],
  ["courses", "courses published"],
  ["certificates", "certificates issued"],
]

// Live numbers from the platform_stats() SQL function. Renders nothing until
// there is real data, so it never shows zeros or breaks the page.
export default function TrustStrip() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let active = true
    supabase.rpc("platform_stats").then(({ data, error }) => {
      if (active && !error && data) setStats(data)
    })
    return () => { active = false }
  }, [])

  const visible = stats ? ITEMS.filter(([key]) => Number(stats[key]) > 0) : []
  if (visible.length === 0) return null

  return (
    <div className="trust-strip" role="list" aria-label="Pharmacourse in numbers">
      {visible.map(([key, label]) => (
        <div key={key} className="trust-stat" role="listitem">
          <strong>{Number(stats[key]).toLocaleString("en-KE")}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}
