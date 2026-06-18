import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabaseClient"
import {
  BookOpen,
  Globe2,
  Layers3,
  MousePointerClick,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Truck,
  Users,
  Video,
  Eye,
} from "lucide-react"
import "./AdminAnalytics.css"

const PERIOD_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
]

const ROUTE_LABELS = {
  home: "Home",
  courses: "Courses",
  blog: "Blog",
  workshops: "Workshops",
  community: "Community",
  patient: "Patient Portal",
  dashboard: "Learning Dashboard",
  product: "Product Pages",
  other: "Other",
}

const PATH_LABELS = {
  "/": "Home",
  "/courses": "Courses",
  "/courses/:id": "Course detail",
  "/courses/:id/:lessonId": "Lesson player",
  "/blog": "Blog",
  "/blog/:slug": "Blog post",
  "/workshops": "Workshops",
  "/community": "Community",
  "/dashboard": "Learning dashboard",
  "/patient/*": "Patient portal",
  "/patient/login": "Patient login",
  "/patient/register": "Patient registration",
  "/patient/prescription": "Prescription request",
  "/patient/appointment": "Appointment booking",
  "/patient/track": "Update tracker",
  "/pharmacyos": "PharmacyOS",
  "/remedacareos": "RemedacareOS",
  "/activate/*": "Account activation",
  "/verify/:id": "Certificate verification",
  "/certificate/:id": "Certificate page",
}

const ROUTE_COLORS = [
  "#0F6E56",
  "#0B7DA8",
  "#1F3A5F",
  "#E09B00",
  "#8B5CF6",
  "#DC2626",
  "#2563EB",
  "#64748B",
]

function formatCompact(value) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0)
}

function formatFull(value) {
  return new Intl.NumberFormat("en").format(value || 0)
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "0%"
  return `${Math.round(value * 10) / 10}%`
}

function formatDateLabel(date) {
  return new Date(date).toLocaleDateString("en-GB", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

function formatAgo(value) {
  const timestamp = new Date(value).getTime()
  if (!timestamp) return "just now"
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function isMissingTableError(error) {
  const message = String(error?.message || "").toLowerCase()
  return (
    error?.status === 404 ||
    message.includes("could not find the table") ||
    (message.includes("relation") && message.includes("does not exist"))
  )
}

async function loadOptionalQuery(queryPromise) {
  const result = await queryPromise
  if (result?.error && isMissingTableError(result.error)) {
    return { data: [], error: null, missing: true }
  }

  return { ...result, missing: false }
}

function normalizePath(path) {
  const raw = String(path || "/").split("?")[0] || "/"
  if (raw === "/") return "/"
  if (raw.startsWith("/courses/")) {
    const parts = raw.split("/").filter(Boolean)
    return parts.length > 2 ? "/courses/:id/:lessonId" : "/courses/:id"
  }
  if (raw.startsWith("/blog/")) return "/blog/:slug"
  if (raw.startsWith("/verify/")) return "/verify/:id"
  if (raw.startsWith("/certificate/")) return "/certificate/:id"
  if (raw.startsWith("/learn/")) return "/learn/:courseId/:lessonId"
  if (raw.startsWith("/patient/")) return "/patient/*"
  if (raw.startsWith("/activate/")) return "/activate/*"
  return raw
}

function getRouteGroup(path, metadata = {}) {
  if (metadata.route_group) return metadata.route_group
  if (path === "/") return "home"
  if (path.startsWith("/courses")) return "courses"
  if (path.startsWith("/blog")) return "blog"
  if (path.startsWith("/workshops")) return "workshops"
  if (path.startsWith("/community")) return "community"
  if (path.startsWith("/patient") || path.startsWith("/activate")) return "patient"
  if (path.startsWith("/dashboard")) return "dashboard"
  if (path.startsWith("/pharmacyos") || path.startsWith("/remedacare")) return "product"
  return "other"
}

function countBy(list, iteratee) {
  return list.reduce((map, item) => {
    const key = iteratee(item)
    if (!key) return map
    map.set(key, (map.get(key) || 0) + 1)
    return map
  }, new Map())
}

function getGeoMetadata(event) {
  const geo = event?.metadata?.geo
  return geo && typeof geo === "object" ? geo : {}
}

function cleanGeoLabel(value, fallback = "Unknown") {
  const normalized = String(value || "").trim()
  return normalized || fallback
}

function getGeoCountryLabel(geo) {
  const label = cleanGeoLabel(geo.country || geo.country_name || geo.country_code || geo.country_hint || "", "")
  return label || "Unknown"
}

function toSeries(events, days) {
  const today = new Date()
  const start = new Date(today)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))

  const map = new Map()
  for (let index = 0; index < days; index += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const key = date.toISOString().slice(0, 10)
    map.set(key, { date: key, views: 0, sessions: new Set() })
  }

  events.forEach((event) => {
    const stamp = new Date(event.created_at)
    if (Number.isNaN(stamp.getTime()) || stamp < start) return
    const key = stamp.toISOString().slice(0, 10)
    if (!map.has(key)) return
    const bucket = map.get(key)
    bucket.views += 1
    if (event.session_id) bucket.sessions.add(event.session_id)
  })

  return Array.from(map.values()).map((bucket) => ({
    date: bucket.date,
    views: bucket.views,
    sessions: bucket.sessions.size,
  }))
}

function MetricCard({ icon: Icon, label, value, detail, tone = "default" }) {
  return (
    <article className={`analytics-metric analytics-metric-${tone}`}>
      <div className="analytics-metric-top">
        <span className="analytics-metric-icon">
          <Icon size={18} />
        </span>
        <span className="analytics-metric-label">{label}</span>
      </div>
      <div className="analytics-metric-value">{value}</div>
      {detail ? <p className="analytics-metric-detail">{detail}</p> : null}
    </article>
  )
}

function ChartCard({ title, subtitle, children, action }) {
  return (
    <section className="analytics-card">
      <div className="analytics-card-head">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function LineChart({ data }) {
  const width = 980
  const height = 280
  const paddingX = 28
  const paddingY = 26
  const maxValue = Math.max(1, ...data.map((item) => item.views))
  const stepX = data.length > 1 ? (width - paddingX * 2) / (data.length - 1) : width / 2

  const points = data.map((item, index) => {
    const x = paddingX + (index * stepX)
    const y = height - paddingY - ((item.views / maxValue) * (height - paddingY * 2))
    return `${x},${y}`
  }).join(" ")

  const area = [
    `${paddingX},${height - paddingY}`,
    ...data.map((item, index) => {
      const x = paddingX + (index * stepX)
      const y = height - paddingY - ((item.views / maxValue) * (height - paddingY * 2))
      return `${x},${y}`
    }),
    `${width - paddingX},${height - paddingY}`,
  ].join(" ")

  return (
    <div className="analytics-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="analytics-svg" role="img" aria-label="Page views trend">
        {[0.25, 0.5, 0.75, 1].map((tick) => {
          const y = paddingY + ((height - paddingY * 2) * tick)
          return <line key={tick} x1={paddingX} x2={width - paddingX} y1={y} y2={y} className="analytics-grid-line" />
        })}
        <polyline points={area} className="analytics-area" />
        <polyline points={points} className="analytics-line" />
        {data.map((item, index) => {
          const x = paddingX + (index * stepX)
          const y = height - paddingY - ((item.views / maxValue) * (height - paddingY * 2))
          return <circle key={item.date} cx={x} cy={y} r="4.5" className="analytics-line-dot" />
        })}
      </svg>

      <div className="analytics-axis-labels">
        {data.filter((_, index) => index === 0 || index === data.length - 1 || index % Math.ceil(Math.max(1, data.length / 5)) === 0).map((item) => (
          <span key={item.date}>{formatDateLabel(item.date)}</span>
        ))}
      </div>
    </div>
  )
}

function HorizontalBars({ items }) {
  const maxValue = Math.max(1, ...items.map((item) => item.value))

  return (
    <div className="analytics-bars">
      {items.map((item, index) => (
        <div key={item.label} className="analytics-bar-row">
          <div className="analytics-bar-meta">
            <span className="analytics-bar-badge" style={{ background: `${ROUTE_COLORS[index % ROUTE_COLORS.length]}1A`, color: ROUTE_COLORS[index % ROUTE_COLORS.length] }}>
              {item.rank}
            </span>
            <div>
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
            </div>
          </div>
          <div className="analytics-bar-track">
            <span
              className="analytics-bar-fill"
              style={{
                width: `${Math.max(8, (item.value / maxValue) * 100)}%`,
                background: ROUTE_COLORS[index % ROUTE_COLORS.length],
              }}
            />
          </div>
          <div className="analytics-bar-value">{formatFull(item.value)}</div>
        </div>
      ))}
    </div>
  )
}

function TrafficPillList({ items }) {
  return (
    <div className="analytics-pill-list">
      {items.map((item, index) => (
        <div key={item.label} className="analytics-pill">
          <span className="analytics-pill-swatch" style={{ background: ROUTE_COLORS[index % ROUTE_COLORS.length] }} />
          <div>
            <strong>{item.label}</strong>
            <span>{formatFull(item.value)} events</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function RecentEventList({ events }) {
  return (
    <div className="analytics-feed">
      {events.length === 0 ? (
        <p className="analytics-empty">No website events were captured in this period yet.</p>
      ) : events.map((event) => (
        <article key={event.id} className="analytics-feed-item">
          <div className="analytics-feed-icon">
            <MousePointerClick size={16} />
          </div>
          <div className="analytics-feed-body">
            <div className="analytics-feed-top">
              <strong>{PATH_LABELS[normalizePath(event.path)] || ROUTE_LABELS[getRouteGroup(event.path, event.metadata)] || normalizePath(event.path)}</strong>
              <span>{formatAgo(event.created_at)}</span>
            </div>
            <p>
              {normalizePath(event.path)}
              {event.device_category ? ` · ${event.device_category}` : ""}
              {event.referrer ? ` · ${event.referrer}` : ""}
            </p>
          </div>
        </article>
      ))}
    </div>
  )
}

export default function WebsiteAnalyticsTab() {
  const [period, setPeriod] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [portalDataWarning, setPortalDataWarning] = useState("")
  const [patientTablesAvailable, setPatientTablesAvailable] = useState(() => {
    if (typeof window === "undefined") return true
    try {
      return window.localStorage.getItem("pharmacourse.analytics.patientTablesAvailable") !== "false"
    } catch {
      return true
    }
  })
  const [events, setEvents] = useState([])
  const [blogs, setBlogs] = useState([])
  const [courses, setCourses] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [certificates, setCertificates] = useState([])
  const [workshops, setWorkshops] = useState([])
  const [teamPlans, setTeamPlans] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [appointments, setAppointments] = useState([])
  const [deliveries, setDeliveries] = useState([])

  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    setError("")
    setPortalDataWarning("")

    const since = new Date()
    since.setDate(since.getDate() - (period - 1))
    since.setHours(0, 0, 0, 0)
    const sinceIso = since.toISOString()

    const [
      schemaResult,
      eventsResult,
      blogsResult,
      coursesResult,
      enrollmentsResult,
      certificatesResult,
      workshopsResult,
      teamPlansResult,
    ] = await Promise.all([
      supabase.rpc("get_analytics_schema_state"),
      supabase.rpc("get_website_events", { days: period }),
      supabase.from("blog_posts").select("id, title, slug, view_count, like_count, is_published, created_at, published_at").order("view_count", { ascending: false }),
      supabase.from("courses").select("id, title, created_at, cpd_hours").order("created_at", { ascending: false }),
      supabase.from("course_enrollments").select("id, course_id, status, created_at, completed_at"),
      supabase.from("certificates").select("id, course_id, issued_date"),
      supabase.from("workshops").select("id, title, is_upcoming, created_at, date").order("created_at", { ascending: false }),
      supabase.from("team_plan_enquiries").select("id, status, plan_tier, created_at").gte("created_at", sinceIso),
    ])

    const firstError =
      schemaResult.error ||
      eventsResult.error ||
      blogsResult.error ||
      coursesResult.error ||
      enrollmentsResult.error ||
      certificatesResult.error ||
      workshopsResult.error ||
      teamPlansResult.error

    if (firstError) {
      setError(firstError.message || "We could not load analytics right now.")
      setLoading(false)
      return
    }

    const schemaState = schemaResult.data || {}
    const schemaReady = Boolean(schemaState.patient_portal_tables_ready)

    let prescriptionsResult = { data: [], error: null, missing: false }
    let appointmentsResult = { data: [], error: null, missing: false }
    let deliveriesResult = { data: [], error: null, missing: false }

    if (schemaReady && patientTablesAvailable) {
      const optionalResults = await Promise.all([
        loadOptionalQuery(supabase.from("prescription_requests").select("id, status, created_at").gte("created_at", sinceIso)),
        loadOptionalQuery(supabase.from("appointments").select("id, status, created_at").gte("created_at", sinceIso)),
        loadOptionalQuery(supabase.from("deliveries").select("id, status, created_at").gte("created_at", sinceIso)),
      ])

      ;[prescriptionsResult, appointmentsResult, deliveriesResult] = optionalResults

      const optionalError = optionalResults.find((result) => result.error)
      if (optionalError?.error) {
        setError(optionalError.error.message || "We could not load analytics right now.")
        setLoading(false)
        return
      }

      const missingAny = optionalResults.some((result) => result.missing)
      if (missingAny) {
        setPatientTablesAvailable(false)
        try {
          window.localStorage.setItem("pharmacourse.analytics.patientTablesAvailable", "false")
        } catch {
          // Ignore storage failures.
        }
        setPortalDataWarning("Patient portal tables are not deployed in this Supabase project yet, so those metrics are hidden for now.")
      }
    } else {
      if (!schemaReady) {
        setPatientTablesAvailable(false)
      }
      setPortalDataWarning("Patient portal tables are not deployed in this Supabase project yet, so those metrics are hidden for now.")
    }

    const eventRows = Array.isArray(eventsResult.data?.events) ? eventsResult.data.events : []
    setEvents(eventRows.map((event) => ({
      ...event,
      path: String(event.path || "/"),
      metadata: typeof event.metadata === "object" && event.metadata ? event.metadata : {},
    })))
    setBlogs(Array.isArray(blogsResult.data) ? blogsResult.data : [])
    setCourses(Array.isArray(coursesResult.data) ? coursesResult.data : [])
    setEnrollments(Array.isArray(enrollmentsResult.data) ? enrollmentsResult.data : [])
    setCertificates(Array.isArray(certificatesResult.data) ? certificatesResult.data : [])
    setWorkshops(Array.isArray(workshopsResult.data) ? workshopsResult.data : [])
    setTeamPlans(Array.isArray(teamPlansResult.data) ? teamPlansResult.data : [])
    setPrescriptions(Array.isArray(prescriptionsResult.data) ? prescriptionsResult.data : [])
    setAppointments(Array.isArray(appointmentsResult.data) ? appointmentsResult.data : [])
    setDeliveries(Array.isArray(deliveriesResult.data) ? deliveriesResult.data : [])
    setLoading(false)
  }, [period])

  useEffect(() => {
    void loadAnalytics()
  }, [loadAnalytics])

  const pageViewEvents = useMemo(
    () => events.filter((event) => event.event_name === "page_view"),
    [events],
  )

  const sessionStartEvents = useMemo(
    () => events.filter((event) => event.event_name === "session_start"),
    [events],
  )

  const totalSessions = useMemo(() => {
    const sessionIds = new Set([
      ...pageViewEvents.map((event) => event.session_id).filter(Boolean),
      ...sessionStartEvents.map((event) => event.session_id).filter(Boolean),
    ])
    return sessionIds.size
  }, [pageViewEvents, sessionStartEvents])

  const dailySeries = useMemo(() => toSeries(pageViewEvents, period), [pageViewEvents, period])

  const routeBreakdown = useMemo(() => {
    const map = countBy(pageViewEvents, (event) => normalizePath(event.path))
    return Array.from(map.entries())
      .map(([path, value]) => ({
        path,
        label: PATH_LABELS[path] || ROUTE_LABELS[getRouteGroup(path)] || path,
        value,
      }))
      .sort((first, second) => second.value - first.value)
      .slice(0, 8)
      .map((item, index) => ({
        ...item,
        rank: `#${index + 1}`,
        detail: item.path,
      }))
  }, [pageViewEvents])

  const routeGroupBreakdown = useMemo(() => {
    const map = countBy(pageViewEvents, (event) => getRouteGroup(event.path, event.metadata))
    return Array.from(map.entries())
      .map(([group, value]) => ({
        label: ROUTE_LABELS[group] || group,
        value,
      }))
      .sort((first, second) => second.value - first.value)
  }, [pageViewEvents])

  const deviceBreakdown = useMemo(() => {
    const map = countBy(pageViewEvents, (event) => String(event.device_category || "unknown"))
    return Array.from(map.entries())
      .map(([device, value]) => ({ label: device, value }))
      .sort((first, second) => second.value - first.value)
  }, [pageViewEvents])

  const referrerBreakdown = useMemo(() => {
    const map = countBy(pageViewEvents, (event) => {
      if (!event.referrer) return "Direct"
      try {
        return new URL(event.referrer).host.replace(/^www\./, "")
      } catch {
        return "Direct"
      }
    })

    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((first, second) => second.value - first.value)
      .slice(0, 5)
  }, [pageViewEvents])

  const geoCountryBreakdown = useMemo(() => {
    const map = countBy(pageViewEvents, (event) => {
      const geo = getGeoMetadata(event)
      return getGeoCountryLabel(geo)
    })

    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((first, second) => second.value - first.value)
      .slice(0, 6)
  }, [pageViewEvents])

  const geoTimezoneBreakdown = useMemo(() => {
    const map = countBy(pageViewEvents, (event) => {
      const geo = getGeoMetadata(event)
      return cleanGeoLabel(geo.time_zone || geo.timezone, "Unknown")
    })

    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((first, second) => second.value - first.value)
      .slice(0, 6)
  }, [pageViewEvents])

  const geoRegionBreakdown = useMemo(() => {
    const map = countBy(pageViewEvents, (event) => {
      const geo = getGeoMetadata(event)
      return cleanGeoLabel(geo.region || geo.city || geo.country_code || "Unknown", "Unknown")
    })

    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((first, second) => second.value - first.value)
      .slice(0, 6)
  }, [pageViewEvents])

  const geoLocaleBreakdown = useMemo(() => {
    const map = countBy(pageViewEvents, (event) => {
      const geo = getGeoMetadata(event)
      return cleanGeoLabel(geo.locale || "Unknown", "Unknown")
    })

    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((first, second) => second.value - first.value)
      .slice(0, 6)
  }, [pageViewEvents])

  const blogPublishedCount = blogs.filter((blog) => blog.is_published).length
  const blogViews = blogs.reduce((sum, blog) => sum + Number(blog.view_count || 0), 0)
  const blogLikes = blogs.reduce((sum, blog) => sum + Number(blog.like_count || 0), 0)

  const courseCompletions = enrollments.filter((enrollment) => String(enrollment.status || "").toLowerCase() === "completed").length
  const activeEnrollments = enrollments.filter((enrollment) => String(enrollment.status || "").toLowerCase() !== "completed").length
  const certificateCount = certificates.length
  const patientRequests = prescriptions.length + appointments.length + deliveries.length
  const leadCount = teamPlans.length
  const highIntentActions = courseCompletions + patientRequests + leadCount
  const pageViewTotal = pageViewEvents.length
  const actionsPerSession = totalSessions > 0 ? highIntentActions / totalSessions : 0

  const topCourseCards = useMemo(() => {
    const enrollmentsByCourse = countBy(enrollments, (enrollment) => enrollment.course_id)
    const completionsByCourse = countBy(
      enrollments.filter((enrollment) => String(enrollment.status || "").toLowerCase() === "completed"),
      (enrollment) => enrollment.course_id,
    )
    const certificateByCourse = countBy(certificates, (certificate) => certificate.course_id)

    return courses
      .map((course) => ({
        ...course,
        enrollments: enrollmentsByCourse.get(course.id) || 0,
        completions: completionsByCourse.get(course.id) || 0,
        certificates: certificateByCourse.get(course.id) || 0,
      }))
      .sort((first, second) => (second.enrollments + second.completions + second.certificates) - (first.enrollments + first.completions + first.certificates))
      .slice(0, 6)
  }, [courses, enrollments, certificates])

  const peakDay = useMemo(() => {
    const top = dailySeries.reduce((best, item) => (item.views > (best?.views || 0) ? item : best), null)
    return top || null
  }, [dailySeries])

  const recentEvents = useMemo(
    () => [...events]
      .sort((first, second) => new Date(second.created_at) - new Date(first.created_at))
      .slice(0, 12),
    [events],
  )

  return (
    <div className="analytics-shell">
      <section className="analytics-hero">
        <div>
          <span className="analytics-hero-kicker">
            <Sparkles size={15} />
            Website analytics
          </span>
          <h2>Google-style traffic intelligence for your PharmCourse site</h2>
          <p>
            Track page views, route popularity, device mix, referrers, and the real conversion signals your pharmacy
            website generates across content, courses, patient requests, and leads.
          </p>
        </div>
        <div className="analytics-hero-actions">
          <div className="analytics-period-switcher">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={period === option.value ? "active" : ""}
                onClick={() => setPeriod(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button type="button" className="analytics-refresh" onClick={loadAnalytics} disabled={loading}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </section>

      {error ? (
        <div className="analytics-error">{error}</div>
      ) : null}

      {portalDataWarning ? (
        <div className="analytics-warning">
          {portalDataWarning}
        </div>
      ) : null}

      <div className="analytics-metrics-grid">
        <MetricCard
          icon={Eye}
          label={`Page views (${period}d)`}
          value={loading ? "…" : formatCompact(pageViewTotal)}
          detail={`${formatFull(totalSessions)} sessions captured`}
          tone="primary"
        />
        <MetricCard
          icon={MousePointerClick}
          label="High-intent actions"
          value={loading ? "…" : formatCompact(highIntentActions)}
          detail="Course completions, patient requests, and lead inquiries"
        />
        <MetricCard
          icon={TrendingUp}
          label="Actions per session"
          value={loading ? "…" : actionsPerSession.toFixed(2)}
          detail={peakDay ? `Peak day: ${formatDateLabel(peakDay.date)} (${formatFull(peakDay.views)} views)` : "No traffic yet"}
        />
        <MetricCard
          icon={Globe2}
          label="Traffic mix"
          value={loading ? "…" : `${routeGroupBreakdown.length} groups`}
          detail={routeGroupBreakdown[0] ? `Top group: ${routeGroupBreakdown[0].label}` : "No tracked traffic yet"}
        />
      </div>

      <div className="analytics-grid analytics-grid-main">
        <ChartCard
          title="Traffic trend"
          subtitle="Daily page views and sessions across the selected period."
          action={<span className="analytics-chip">{formatFull(pageViewTotal)} views</span>}
        >
          {loading ? <div className="analytics-loading">Loading chart data...</div> : <LineChart data={dailySeries} />}
        </ChartCard>

        <ChartCard
          title="Top routes"
          subtitle="The pages and routes your audience actually touches most."
          action={<span className="analytics-chip">{routeBreakdown.length} routes</span>}
        >
          {loading ? <div className="analytics-loading">Loading route data...</div> : <HorizontalBars items={routeBreakdown} />}
        </ChartCard>
      </div>

      <div className="analytics-grid analytics-grid-secondary">
        <ChartCard
          title="Traffic mix"
          subtitle="Route families split by content, patient portal, product pages, and more."
          action={<span className="analytics-chip">Route groups</span>}
        >
          {loading ? <div className="analytics-loading">Loading mix data...</div> : <TrafficPillList items={routeGroupBreakdown} />}
        </ChartCard>

        <ChartCard
          title="Device and source"
          subtitle="How visitors arrive and what they use to browse the site."
          action={<span className="analytics-chip">Referrers</span>}
        >
          <div className="analytics-dual-stack">
            <div>
              <h4>Devices</h4>
              {loading ? <div className="analytics-loading compact">Loading devices...</div> : <TrafficPillList items={deviceBreakdown} />}
            </div>
            <div>
              <h4>Top referrers</h4>
              {loading ? <div className="analytics-loading compact">Loading sources...</div> : <TrafficPillList items={referrerBreakdown} />}
            </div>
          </div>
        </ChartCard>
      </div>

      <div className="analytics-grid analytics-grid-single">
        <ChartCard
          title="Location signals"
          subtitle="Country, region, and timezone are resolved from the visit IP when possible, with browser locale as a fallback."
          action={<span className="analytics-chip">{formatFull(geoCountryBreakdown.length)} countries</span>}
        >
          <div className="analytics-dual-stack">
            <div>
              <h4>Countries</h4>
              {loading ? <div className="analytics-loading compact">Loading location data...</div> : <TrafficPillList items={geoCountryBreakdown} />}
            </div>
            <div>
              <h4>Time zones</h4>
              {loading ? <div className="analytics-loading compact">Loading location data...</div> : <TrafficPillList items={geoTimezoneBreakdown} />}
            </div>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <h4 style={{ margin: "0 0 0.8rem", fontSize: "0.92rem", color: "var(--gray-900)" }}>Locales</h4>
            {loading ? <div className="analytics-loading compact">Loading locale data...</div> : <TrafficPillList items={geoLocaleBreakdown} />}
          </div>
          <div style={{ marginTop: "1rem" }}>
            <h4 style={{ margin: "0 0 0.8rem", fontSize: "0.92rem", color: "var(--gray-900)" }}>Regions / cities</h4>
            {loading ? <div className="analytics-loading compact">Loading region data...</div> : <TrafficPillList items={geoRegionBreakdown} />}
          </div>
          <p className="analytics-geo-note">
            Location data is cached and collected passively, so the dashboard can show both exact GeoIP country data and browser fallback signals.
          </p>
        </ChartCard>
      </div>

      <div className="analytics-grid analytics-grid-secondary">
        <ChartCard
          title="Business snapshot"
          subtitle="A quick read on the site’s real conversion engines."
          action={<span className="analytics-chip">All-time + period</span>}
        >
          <div className="analytics-business-grid">
            <div className="analytics-business-card">
              <BookOpen size={18} />
              <strong>{formatFull(blogPublishedCount)}</strong>
              <span>Published blog posts</span>
            </div>
            <div className="analytics-business-card">
              <Eye size={18} />
              <strong>{formatFull(blogViews)}</strong>
              <span>Blog views</span>
            </div>
            <div className="analytics-business-card">
              <Users size={18} />
              <strong>{formatFull(activeEnrollments)}</strong>
              <span>Active course enrollments</span>
            </div>
            <div className="analytics-business-card">
              <Layers3 size={18} />
              <strong>{formatFull(certificateCount)}</strong>
              <span>Certificates issued</span>
            </div>
            <div className="analytics-business-card">
              <Video size={18} />
              <strong>{formatFull(workshops.length)}</strong>
              <span>Workshops listed</span>
            </div>
            <div className="analytics-business-card">
              <Truck size={18} />
              <strong>{formatFull(patientRequests)}</strong>
              <span>Patient requests in period</span>
            </div>
          </div>

          <div className="analytics-split-copy">
            <div>
              <h4>Top content by engagement</h4>
              <div className="analytics-mini-list">
                {topCourseCards.length === 0 ? (
                  <p className="analytics-empty">No course data yet.</p>
                ) : topCourseCards.map((course) => (
                  <div key={course.id} className="analytics-mini-row">
                    <div>
                      <strong>{course.title}</strong>
                      <span>{course.cpd_hours || 0} CPD hours</span>
                    </div>
                    <div className="analytics-mini-stats">
                      <span>{formatFull(course.enrollments)} enrollments</span>
                      <span>{formatFull(course.completions)} completions</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4>Lead activity</h4>
              <div className="analytics-mini-list">
                <div className="analytics-mini-row">
                  <div>
                    <strong>Team plan enquiries</strong>
                    <span>New inbound opportunities</span>
                  </div>
                  <div className="analytics-mini-stats">
                    <span>{formatFull(leadCount)}</span>
                    <span>{formatPercent(totalSessions > 0 ? (leadCount / totalSessions) * 100 : 0)}</span>
                  </div>
                </div>
                <div className="analytics-mini-row">
                  <div>
                    <strong>Patient portal requests</strong>
                    <span>Prescriptions, appointments, and delivery requests</span>
                  </div>
                  <div className="analytics-mini-stats">
                    <span>{formatFull(patientRequests)}</span>
                    <span>{formatFull(prescriptions.length)} prescriptions</span>
                  </div>
                </div>
                <div className="analytics-mini-row">
                  <div>
                    <strong>Blog engagement</strong>
                    <span>Views and likes</span>
                  </div>
                  <div className="analytics-mini-stats">
                    <span>{formatFull(blogLikes)} likes</span>
                    <span>{formatFull(blogViews)} views</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="Recent activity"
          subtitle="The latest tracked website sessions and route hits."
          action={<span className="analytics-chip">Live feed</span>}
        >
          {loading ? <div className="analytics-loading">Loading recent activity...</div> : <RecentEventList events={recentEvents} />}
        </ChartCard>
      </div>
    </div>
  )
}
