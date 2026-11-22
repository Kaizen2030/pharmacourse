import { useCallback, useEffect, useMemo, useState } from "react"
import { Download, Monitor, RefreshCw, Smartphone, Tablet } from "lucide-react"
import { supabase } from "../../lib/supabaseClient"
import { friendlyError } from "../../lib/friendlyError"
import "./admin-learning.css"
import "./AdminAnalytics.css"

const PERIODS = [7, 30, 90]
const EVENT_CAP = 5000 // get_website_events returns at most this many rows

const PATH_LABELS = {
  "/": "Home",
  "/courses": "Courses",
  "/blog": "Blog",
  "/workshops": "Workshops",
  "/community": "Community",
  "/team-plans": "Team plans",
  "/login": "Sign in",
  "/register": "Register",
  "/dashboard": "My Learning",
  "/remedacarepos": "RemedacarePOS",
  "/pharmacyos": "RemedacarePOS",
  "/remedacarehmis": "RemedacareHMIS",
  "/remedacareos": "RemedacareHMIS",
  "/patient-portal": "Patient portal",
}

const fmt = (v) => new Intl.NumberFormat("en").format(Math.round(v || 0))
const fmtCompact = (v) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(v || 0)
const dayLabel = (iso, long = false) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", long ? { weekday: "short", day: "numeric", month: "short" } : { day: "numeric", month: "short" })
const csvEscape = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

function ago(value) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function cleanPath(path) {
  const raw = String(path || "/").split("?")[0].split("#")[0] || "/"
  return raw.length > 1 ? raw.replace(/\/+$/, "") : raw
}

function pageLabel(path, title) {
  if (PATH_LABELS[path]) return PATH_LABELS[path]
  const t = String(title || "").replace(/\s*[|·-]\s*Pharmacourse.*$/i, "").trim()
  if (t && t.toLowerCase() !== "pharmacourse") return t
  if (path.startsWith("/courses/")) return "Course page"
  if (path.startsWith("/blog/")) return "Blog post"
  if (path.startsWith("/verify/")) return "Certificate check"
  return path
}

function sourceOf(referrer) {
  if (!referrer) return "Direct"
  let host = ""
  try { host = new URL(referrer).host.replace(/^www\./, "").toLowerCase() } catch { return "Direct" }
  if (!host || host.includes("pharmacourse")) return "Direct"
  if (/google\./.test(host)) return "Google"
  if (/bing\.|duckduckgo|yahoo\./.test(host)) return "Other search"
  if (/facebook|fb\.|messenger/.test(host)) return "Facebook"
  if (/whatsapp|wa\.me/.test(host)) return "WhatsApp"
  if (/linkedin|lnkd/.test(host)) return "LinkedIn"
  if (/instagram/.test(host)) return "Instagram"
  if (/t\.co$|twitter|x\.com/.test(host)) return "X (Twitter)"
  if (/tiktok/.test(host)) return "TikTok"
  if (/youtube|youtu\.be/.test(host)) return "YouTube"
  return host
}

function countryOf(event) {
  const geo = event?.metadata?.geo && typeof event.metadata.geo === "object" ? event.metadata.geo : {}
  return String(geo.country || geo.country_name || geo.country_code || geo.country_hint || "").trim() || "Unknown"
}

function tally(list, keyFn) {
  const map = new Map()
  for (const item of list) {
    const key = keyFn(item)
    if (key) map.set(key, (map.get(key) || 0) + 1)
  }
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
}

function change(now, prev) {
  if (prev == null) return { text: "", tone: "" }
  if (!prev) return { text: now ? "New this period" : "No change", tone: "" }
  const pct = Math.round(((now - prev) / prev) * 100)
  return { text: `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct)}% vs previous`, tone: pct >= 0 ? "up" : "down" }
}

function buildSeries(events, days, now) {
  const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (days - 1))
  const buckets = []
  const index = new Map()
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start); d.setDate(start.getDate() + i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    index.set(key, buckets.length)
    buckets.push({ date: key, views: 0, visitors: new Set() })
  }
  for (const e of events) {
    const t = new Date(e.created_at)
    const key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`
    const i = index.get(key)
    if (i == null) continue
    buckets[i].views += 1
    if (e.session_id) buckets[i].visitors.add(e.session_id)
  }
  return buckets.map((b) => ({ date: b.date, views: b.views, visitors: b.visitors.size }))
}

function TrafficChart({ series }) {
  const [hover, setHover] = useState(null)
  const W = 760, H = 240, PAD = { l: 40, r: 12, t: 12, b: 28 }
  const max = Math.max(4, ...series.map((d) => d.views))
  const niceMax = Math.ceil(max / 4) * 4
  const x = (i) => PAD.l + (series.length <= 1 ? 0 : (i * (W - PAD.l - PAD.r)) / (series.length - 1))
  const y = (v) => PAD.t + (H - PAD.t - PAD.b) * (1 - v / niceMax)
  const line = (key) => series.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(" ")
  const area = `${line("views")} L${x(series.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`
  const step = Math.max(1, Math.ceil(series.length / 7))
  const h = hover != null ? series[hover] : null

  return (
    <div className="wt-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Daily page views and visitors" preserveAspectRatio="none" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="wtFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#10a37f" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#10a37f" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((g) => {
          const v = (niceMax / 4) * g
          return (
            <g key={g}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="wt-grid" />
              <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" className="wt-axis">{fmtCompact(v)}</text>
            </g>
          )
        })}
        <path d={area} fill="url(#wtFill)" />
        <path d={line("views")} className="wt-line views" />
        <path d={line("visitors")} className="wt-line visitors" />
        {series.map((d, i) => (i % step === 0 || i === series.length - 1 ? (
          <text key={d.date} x={x(i)} y={H - 8} textAnchor="middle" className="wt-axis">{dayLabel(d.date)}</text>
        ) : null))}
        {h ? (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={y(0)} className="wt-cursor" />
            <circle cx={x(hover)} cy={y(h.views)} r="4.5" className="wt-dot views" />
            <circle cx={x(hover)} cy={y(h.visitors)} r="4" className="wt-dot visitors" />
          </g>
        ) : null}
        {series.map((d, i) => (
          <rect key={`hit-${d.date}`} x={x(i) - (W - PAD.l - PAD.r) / Math.max(1, series.length - 1) / 2} y={PAD.t} width={(W - PAD.l - PAD.r) / Math.max(1, series.length - 1)} height={H - PAD.t - PAD.b}
            fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      {h ? (
        <div className="wt-tooltip" style={{ left: `${(x(hover) / W) * 100}%` }}>
          <strong>{dayLabel(h.date, true)}</strong>
          <span><i className="views" /> {fmt(h.views)} page views</span>
          <span><i className="visitors" /> {fmt(h.visitors)} visitors</span>
        </div>
      ) : null}
    </div>
  )
}

function BarList({ items, total, empty = "No data yet.", max = 6 }) {
  if (!items.length) return <p className="al-empty-cell">{empty}</p>
  const top = items.slice(0, max)
  const peak = Math.max(...top.map((i) => i.value), 1)
  return (
    <ul className="wt-barlist">
      {top.map((i) => (
        <li key={i.label}>
          <div className="wt-bar" style={{ width: `${(i.value / peak) * 100}%` }} />
          <span className="wt-bar-label">{i.label}</span>
          <span className="wt-bar-value">{fmt(i.value)}<small>{total ? `${Math.round((i.value / total) * 100)}%` : ""}</small></span>
        </li>
      ))}
    </ul>
  )
}

export default function WebsiteAnalyticsTab() {
  const [days, setDays] = useState(30)
  const [events, setEvents] = useState([])
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [loadedAt, setLoadedAt] = useState(0)

  const load = useCallback(async () => {
    setLoading(true); setError("")
    const [ev, bl] = await Promise.all([
      supabase.rpc("get_website_events", { days: days * 2 }),
      supabase.from("blog_posts").select("id, title, slug, view_count, like_count, is_published").eq("is_published", true).order("view_count", { ascending: false }).limit(6),
    ])
    setLoading(false)
    if (ev.error) { setError(friendlyError(ev.error, "We could not load website analytics.")); return }
    const rows = Array.isArray(ev.data?.events) ? ev.data.events : []
    setEvents(rows.filter((e) => e.event_name === "page_view").map((e) => ({ ...e, path: cleanPath(e.path), metadata: e.metadata && typeof e.metadata === "object" ? e.metadata : {} })))
    setBlogs(bl.data || [])
    setLoadedAt(Date.now())
  }, [days])

  useEffect(() => { void load() }, [load])

  const capped = events.length >= EVENT_CAP
  const stats = useMemo(() => {
    const split = loadedAt - days * 86400000
    const current = events.filter((e) => new Date(e.created_at).getTime() >= split)
    const previous = capped ? null : events.filter((e) => new Date(e.created_at).getTime() < split)
    const visitors = (list) => new Set(list.map((e) => e.session_id).filter(Boolean)).size
    const views = current.length
    const vis = visitors(current)
    const series = buildSeries(current, days, loadedAt)
    const peak = series.reduce((best, d) => (d.views > (best?.views || 0) ? d : best), null)
    const devices = tally(current, (e) => String(e.device_category || "unknown").toLowerCase())
    const mobile = devices.find((d) => d.label === "mobile")?.value || 0
    const pages = (() => {
      const map = new Map()
      for (const e of current) {
        const row = map.get(e.path) || { path: e.path, title: e.title, views: 0, sessions: new Set() }
        row.views += 1
        if (e.session_id) row.sessions.add(e.session_id)
        if (!row.title && e.title) row.title = e.title
        map.set(e.path, row)
      }
      return [...map.values()].map((r) => ({ path: r.path, label: pageLabel(r.path, r.title), views: r.views, visitors: r.sessions.size })).sort((a, b) => b.views - a.views)
    })()
    return {
      views, visitors: vis, series, peak, devices, mobileShare: views ? Math.round((mobile / views) * 100) : 0,
      pagesPerVisit: vis ? views / vis : 0,
      courseViews: current.filter((e) => e.path.startsWith("/courses/")).length,
      prevViews: previous ? previous.length : null,
      prevVisitors: previous ? visitors(previous) : null,
      prevCourseViews: previous ? previous.filter((e) => e.path.startsWith("/courses/")).length : null,
      sources: tally(current, (e) => sourceOf(e.referrer)),
      countries: tally(current, countryOf),
      pages,
      recent: [...current].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10),
    }
  }, [events, days, capped, loadedAt])

  function exportCsv() {
    const header = ["Page", "Path", "Page views", "Visitors"]
    const lines = stats.pages.map((p) => [p.label, p.path, p.views, p.visitors].map(csvEscape).join(","))
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" })
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `top-pages-${days}d.csv`; a.click(); URL.revokeObjectURL(a.href)
  }

  const deviceTotal = stats.devices.reduce((t, d) => t + d.value, 0)
  const deviceColor = { desktop: "#0b5f45", mobile: "#10a37f", tablet: "#8fd3bb", unknown: "#cbd8d1" }
  const DeviceIcon = { desktop: Monitor, mobile: Smartphone, tablet: Tablet }
  const kpis = [
    { label: "Page views", value: fmt(stats.views), delta: change(stats.views, stats.prevViews) },
    { label: "Visitors", value: fmt(stats.visitors), delta: change(stats.visitors, stats.prevVisitors), hint: "Unique browser sessions" },
    { label: "Pages per visit", value: stats.pagesPerVisit.toFixed(1), hint: "Average across visits" },
    { label: "Course page views", value: fmt(stats.courseViews), delta: change(stats.courseViews, stats.prevCourseViews) },
    { label: "On mobile", value: `${stats.mobileShare}%`, hint: "Share of page views" },
    { label: "Busiest day", value: stats.peak?.views ? dayLabel(stats.peak.date) : "—", hint: stats.peak?.views ? `${fmt(stats.peak.views)} page views` : "No visits yet" },
  ]

  return (
    <div className="al-page">
      <header className="al-head">
        <div>
          <h2>Website traffic</h2>
          <p>Visits, pages and where visitors come from. Only visitors who accept analytics are counted; no IP addresses are stored.</p>
        </div>
        <div className="al-head-actions">
          <div className="al-seg" role="radiogroup" aria-label="Period">
            {PERIODS.map((p) => <button key={p} type="button" role="radio" aria-checked={days === p} className={days === p ? "active" : ""} onClick={() => setDays(p)}>{p} days</button>)}
          </div>
          <button type="button" className="al-btn" onClick={exportCsv} disabled={!stats.pages.length}><Download size={16} aria-hidden="true" /> Export CSV</button>
          <button type="button" className="al-icon-btn" onClick={() => void load()} aria-label="Refresh" disabled={loading}><RefreshCw size={16} className={loading ? "wt-spin" : ""} /></button>
        </div>
      </header>

      {error ? <p role="alert" className="al-alert">{error}</p> : null}
      {capped ? <p className="al-setup">This period has more than {fmt(EVENT_CAP)} tracked page views, so only the most recent ones are shown and comparisons are hidden.</p> : null}

      <section className="al-kpis" aria-busy={loading}>
        {kpis.map((k) => (
          <div key={k.label} className="al-card al-kpi">
            <span>{k.label}</span>
            <strong>{loading ? "—" : k.value}</strong>
            <small className={k.delta?.tone ? `wt-delta ${k.delta.tone}` : "wt-hint"}>{loading ? "" : k.delta?.text || k.hint || ""}</small>
          </div>
        ))}
      </section>

      <div className="al-row-2">
        <section className="al-card al-block">
          <div className="al-block-head">
            <div><h3>Traffic over time</h3><p className="al-muted">Daily page views and visitors, last {days} days.</p></div>
            <span className="al-legend"><i className="wt-key views" /> Page views <i className="wt-key visitors" /> Visitors</span>
          </div>
          {loading ? <div className="wt-skeleton" /> : stats.views === 0 ? <p className="al-empty-cell">No visits recorded in this period yet.</p> : <TrafficChart series={stats.series} />}
        </section>

        <section className="al-card al-block">
          <div className="al-block-head"><div><h3>Traffic sources</h3><p className="al-muted">Where visits came from.</p></div></div>
          {loading ? <div className="wt-skeleton short" /> : <BarList items={stats.sources} total={stats.views} empty="No visits yet." />}
        </section>
      </div>

      <section className="al-card al-block">
        <div className="al-block-head"><div><h3>Top pages</h3><p className="al-muted">Most visited pages in the last {days} days.</p></div></div>
        <div className="al-table-wrap">
          <table className="al-table wt-table">
            <thead><tr><th>Page</th><th>Page views</th><th>Visitors</th><th className="wt-share-col">Share of views</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={4} className="al-empty-cell">Loading…</td></tr>
                : stats.pages.length === 0 ? <tr><td colSpan={4} className="al-empty-cell">No visits yet.</td></tr>
                  : stats.pages.slice(0, 10).map((p) => {
                    const share = stats.views ? (p.views / stats.views) * 100 : 0
                    return (
                      <tr key={p.path} style={{ cursor: "default" }}>
                        <td><strong>{p.label}</strong><span className="al-sub">{p.path}</span></td>
                        <td>{fmt(p.views)}</td>
                        <td>{fmt(p.visitors)}</td>
                        <td className="wt-share-col"><div className="wt-share"><div className="al-meter"><span style={{ width: `${share}%` }} /></div><span>{share.toFixed(1)}%</span></div></td>
                      </tr>
                    )
                  })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="al-row-2 even">
        <section className="al-card al-block">
          <div className="al-block-head"><div><h3>Devices</h3><p className="al-muted">What visitors browse on.</p></div></div>
          {loading ? <div className="wt-skeleton short" /> : deviceTotal === 0 ? <p className="al-empty-cell">No visits yet.</p> : (
            <>
              <div className="wt-stack" role="img" aria-label="Device split">
                {stats.devices.map((d) => <span key={d.label} style={{ flexGrow: d.value, background: deviceColor[d.label] || "#94a3b8" }} title={`${d.label}: ${Math.round((d.value / deviceTotal) * 100)}%`} />)}
              </div>
              <ul className="wt-devices">
                {stats.devices.map((d) => {
                  const Icon = DeviceIcon[d.label] || Monitor
                  return (
                    <li key={d.label}>
                      <span className="wt-swatch" style={{ background: deviceColor[d.label] || "#94a3b8" }} />
                      <Icon size={16} aria-hidden="true" />
                      <span className="wt-device-name">{d.label}</span>
                      <strong>{Math.round((d.value / deviceTotal) * 100)}%</strong>
                      <small>{fmt(d.value)}</small>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </section>

        <section className="al-card al-block">
          <div className="al-block-head"><div><h3>Countries</h3><p className="al-muted">Estimated from browser time zone and language.</p></div></div>
          {loading ? <div className="wt-skeleton short" /> : <BarList items={stats.countries} total={stats.views} empty="No visits yet." />}
        </section>
      </div>

      <div className="al-row-2 even">
        <section className="al-card al-block">
          <div className="al-block-head"><div><h3>Most read articles</h3><p className="al-muted">All-time views of published blog posts.</p></div></div>
          {blogs.length === 0 ? <p className="al-empty-cell">No published articles yet.</p> : (
            <ul className="al-quiz-list">
              {blogs.map((b, i) => (
                <li key={b.id}>
                  <div className="wt-rank-row"><span className="wt-rank">{i + 1}</span><div><strong>{b.title}</strong><span className="al-sub">{fmt(b.like_count)} likes</span></div></div>
                  <strong>{fmt(b.view_count)} <small className="al-sub" style={{ display: "inline" }}>views</small></strong>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="al-card al-block">
          <div className="al-block-head"><div><h3>Recent visits</h3><p className="al-muted">The latest pages people opened.</p></div></div>
          {loading ? <div className="wt-skeleton short" /> : stats.recent.length === 0 ? <p className="al-empty-cell">No visits yet.</p> : (
            <ul className="wt-recent">
              {stats.recent.map((e) => {
                const Icon = DeviceIcon[String(e.device_category || "").toLowerCase()] || Monitor
                return (
                  <li key={e.id || `${e.created_at}-${e.path}`}>
                    <span className="wt-recent-icon"><Icon size={15} aria-hidden="true" /></span>
                    <div><strong>{pageLabel(e.path, e.title)}</strong><span className="al-sub">{[sourceOf(e.referrer), countryOf(e) !== "Unknown" ? countryOf(e) : null].filter(Boolean).join(" · ")}</span></div>
                    <small>{ago(e.created_at)}</small>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
