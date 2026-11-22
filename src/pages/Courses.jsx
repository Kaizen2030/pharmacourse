import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Award, BadgeCheck, MonitorSmartphone, Search, SearchX, Sparkles, Timer } from "lucide-react"
import { supabase } from "../lib/supabaseClient"
import CourseCard, { CourseCardSkeleton } from "../components/CourseCard"
import SEO from "../components/SEO"
import Pagination from "../components/Pagination"
import HeroDevices from "../components/HeroDevices"
import { getCourseCategoryLabel } from "../lib/courseCategoryHelpers"
import "../styles/courses-ui.css"

const PAGE_SIZE = 12
const SORTS = {
  newest: { label: "Newest", column: "created_at", ascending: false },
  "price-low": { label: "Price: low to high", column: "price", ascending: true },
  "price-high": { label: "Price: high to low", column: "price", ascending: false },
  title: { label: "A to Z", column: "title", ascending: true },
}

const normalizeValue = (value) => (value || "").trim().toLowerCase()
const cleanFilterText = (value) => String(value || "").replace(/[%_,()\\*"]/g, " ").trim()

function buildCategoryList(values) {
  return Array.from(new Set((values || []).map((value) => getCourseCategoryLabel(value)).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b))
}

function usePlatformStats() {
  const [stats, setStats] = useState(null)
  useEffect(() => {
    let active = true
    supabase.rpc("platform_stats").then(({ data, error }) => { if (active && !error && data) setStats(data) })
    return () => { active = false }
  }, [])
  return stats
}

export default function Courses() {
  const [courses, setCourses] = useState([])
  const [categoryTabs, setCategoryTabs] = useState(["All"])
  const [loading, setLoading] = useState(true)
  const [totalCourses, setTotalCourses] = useState(0)
  const [stuck, setStuck] = useState(false)
  // Filters live in the URL so a filtered list can be shared (e.g. on WhatsApp).
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1)
  const activeCategory = searchParams.get("category") || "All"
  const priceFilter = ["free", "paid"].includes(searchParams.get("price")) ? searchParams.get("price") : "all"
  const sort = SORTS[searchParams.get("sort")] ? searchParams.get("sort") : "newest"
  const urlQuery = searchParams.get("q") || ""
  const [searchQuery, setSearchQuery] = useState(urlQuery)
  const requestId = useRef(0)
  const sentinelRef = useRef(null)
  const resultsRef = useRef(null)
  const stats = usePlatformStats()

  const updateParams = useCallback((changes, { resetPage = true } = {}) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      Object.entries(changes).forEach(([key, value]) => {
        if (value === null || value === "" || value === "All" || value === "all" || (key === "sort" && value === "newest")) next.delete(key)
        else next.set(key, String(value))
      })
      if (resetPage) next.delete("page")
      return next
    }, { replace: true })
  }, [setSearchParams])

  const loadCourses = useCallback(async () => {
    const currentRequest = ++requestId.current
    setLoading(true)
    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    const order = SORTS[sort]

    let query = supabase.from("courses").select("*", { count: "exact" }).eq("is_published", true)
    if (activeCategory !== "All") query = query.ilike("category", cleanFilterText(activeCategory))
    if (priceFilter === "free") query = query.eq("is_free", true)
    if (priceFilter === "paid") query = query.eq("is_free", false)
    const cleanQuery = cleanFilterText(urlQuery)
    if (cleanQuery) query = query.or(`title.ilike.%${cleanQuery}%,short_desc.ilike.%${cleanQuery}%,category.ilike.%${cleanQuery}%`)

    const { data, count, error } = await query
      .order(order.column, { ascending: order.ascending, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(from, to)

    if (currentRequest !== requestId.current) return // a newer request replaced this one

    if (error) {
      console.error("Failed to load courses:", error)
      setCourses([])
      setTotalCourses(0)
    } else {
      const courseRows = data || []
      const courseIds = courseRows.map((course) => course.id)
      const { data: moduleRows, error: moduleError } = courseIds.length
        ? await supabase.from("course_outline").select("course_id").in("course_id", courseIds)
        : { data: [], error: null }
      if (moduleError) console.error("Failed to load course module counts:", moduleError)
      const moduleCounts = (moduleRows || []).reduce((counts, module) => {
        counts[module.course_id] = (counts[module.course_id] || 0) + 1
        return counts
      }, {})
      if (currentRequest !== requestId.current) return
      setCourses(courseRows.map((course) => ({ ...course, module_count: moduleCounts[course.id] || 0 })))
      setTotalCourses(count || 0)
    }
    setLoading(false)
  }, [page, activeCategory, priceFilter, sort, urlQuery])

  useEffect(() => { loadCourses() }, [loadCourses])

  useEffect(() => {
    let active = true
    Promise.all([
      supabase.from("course_categories").select("name").eq("is_active", true).order("name", { ascending: true }),
      supabase.from("courses").select("category").eq("is_published", true),
    ]).then(([managed, used]) => {
      if (!active) return
      if (managed.error && used.error) {
        console.error("Failed to load course categories:", managed.error, used.error)
        return
      }
      const names = new Set([
        ...(managed.error ? [] : buildCategoryList((managed.data || []).map((row) => row.name))),
        ...(used.error ? [] : buildCategoryList((used.data || []).map((row) => row.category))),
      ])
      setCategoryTabs(["All", ...Array.from(names).sort((a, b) => a.localeCompare(b))])
    })
    return () => { active = false }
  }, [])

  // Debounce typing into the URL (one request per pause, not per keystroke).
  useEffect(() => {
    if (searchQuery.trim() === urlQuery) return undefined
    const timer = window.setTimeout(() => updateParams({ q: searchQuery.trim() }), 350)
    return () => window.clearTimeout(timer)
  }, [searchQuery, urlQuery, updateParams])

  // Keep the input in sync if the URL changes (back button, shared link).
  useEffect(() => { setSearchQuery(urlQuery) }, [urlQuery])

  // Ignore categories that no longer exist (only once the list has loaded).
  useEffect(() => {
    if (categoryTabs.length > 1 && activeCategory !== "All" && !categoryTabs.some((tab) => normalizeValue(tab) === normalizeValue(activeCategory))) {
      updateParams({ category: null })
    }
  }, [activeCategory, categoryTabs, updateParams])

  // Show a hairline under the filter bar once it sticks to the top.
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || typeof IntersectionObserver === "undefined") return undefined
    const observer = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), { threshold: 0, rootMargin: "-72px 0px 0px 0px" })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  const totalPages = Math.max(1, Math.ceil(totalCourses / PAGE_SIZE))
  const hasActiveFilters = activeCategory !== "All" || priceFilter !== "all" || urlQuery.length > 0
  const firstLoad = loading && courses.length === 0
  const statItems = stats
    ? [["courses", "courses"], ["learners", "learners"], ["certificates", "certificates issued"]].filter(([key]) => Number(stats[key]) > 0)
    : []

  function clearFilters() {
    setSearchQuery("")
    setSearchParams({}, { replace: true })
  }

  function submitSearch(event) {
    event.preventDefault()
    updateParams({ q: searchQuery.trim() })
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="pc-page">
      <SEO
        title="Pharmacy Courses"
        description="Explore self-paced pharmacy CPD courses with practical lessons, downloadable resources, and completion certificates."
        path="/courses"
        type="website"
      />

      <section className="pc-hero">
        <div className="pc-wrap">
          <div className="pc-hero-grid">
          <div className="pc-hero-inner">
            <span className="pc-eyebrow"><Sparkles size={14} aria-hidden="true" /> CPD courses for pharmacy professionals</span>
            <h1>Build the skills <em>your pharmacy career</em> needs.</h1>
            <p className="pc-lead">Clinical pharmacy, dispensing, regulation, management and business. Practical courses built by practising pharmacists. Learn on your laptop or phone, at your own pace, and earn a verifiable certificate.</p>
            <div className="pc-hero-actions">
              <button type="button" className="pc-hero-btn primary" onClick={() => { updateParams({ price: null }); resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) }}>Browse all courses</button>
              <button type="button" className="pc-hero-btn ghost" onClick={() => { updateParams({ price: "free" }); resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) }}>Start with a free course</button>
            </div>
            <form className="pc-search" role="search" onSubmit={submitSearch}>
              <Search size={20} aria-hidden="true" />
              <label htmlFor="course-search" className="sr-only">Search courses</label>
              <input
                id="course-search"
                type="search"
                placeholder="Search: clinical, dispensing, compliance, business"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                autoComplete="off"
              />
              <button type="submit" className="btn btn-primary"><Search size={16} aria-hidden="true" /><span>Search</span></button>
            </form>
            <div className="pc-hero-chips" aria-label="What every course includes">
              <span className="pc-hero-chip"><BadgeCheck size={15} aria-hidden="true" /> Verifiable certificate</span>
              <span className="pc-hero-chip"><Award size={15} aria-hidden="true" /> CPD hours</span>
              <span className="pc-hero-chip"><Timer size={15} aria-hidden="true" /> Self-paced</span>
              <span className="pc-hero-chip"><MonitorSmartphone size={15} aria-hidden="true" /> Laptop or phone</span>
            </div>
          </div>
          <div className="pc-hero-visual"><HeroDevices /></div>
          </div>
        </div>
      </section>

      <div className="pc-wrap">
        {statItems.length ? (
          <div className="pc-stats" role="list" aria-label="Pharmacourse in numbers">
            {statItems.map(([key, label]) => (
              <div key={key} className="pc-stat" role="listitem">
                <strong>{Number(stats[key]).toLocaleString("en-KE")}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        ) : null}
        <div ref={sentinelRef} aria-hidden="true" />
      </div>

      <div className={`pc-toolbar${stuck ? " is-stuck" : ""}`}>
        <div className="pc-wrap pc-toolbar-row">
          <div className="pc-chips" role="tablist" aria-label="Course categories">
            {categoryTabs.map((category) => (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={normalizeValue(activeCategory) === normalizeValue(category)}
                className="pc-chip"
                onClick={() => updateParams({ category })}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="pc-toolbar-controls">
            <div className="pc-segment" role="group" aria-label="Price">
              {[["all", "All"], ["free", "Free"], ["paid", "Paid"]].map(([value, label]) => (
                <button key={value} type="button" aria-pressed={priceFilter === value} onClick={() => updateParams({ price: value })}>{label}</button>
              ))}
            </div>
            <label htmlFor="course-sort" className="sr-only">Sort courses</label>
            <select id="course-sort" className="pc-select" value={sort} onChange={(event) => updateParams({ sort: event.target.value })}>
              {Object.entries(SORTS).map(([value, option]) => <option key={value} value={value}>{option.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="pc-wrap" ref={resultsRef}>
        <div className="pc-results" aria-live="polite">
          <p>
            {loading ? "Finding courses…" : <><strong>{totalCourses}</strong> {totalCourses === 1 ? "course" : "courses"}{urlQuery ? <> for “{urlQuery}”</> : null}</>}
          </p>
          {hasActiveFilters ? <button type="button" className="pc-link-btn" onClick={clearFilters}>Clear filters</button> : null}
        </div>

        {firstLoad ? (
          <div className="pc-grid" aria-busy="true">
            {Array.from({ length: 6 }, (_, index) => <CourseCardSkeleton key={index} />)}
          </div>
        ) : !loading && courses.length === 0 ? (
          <div className="pc-empty">
            <div className="pc-empty-icon"><SearchX size={26} aria-hidden="true" /></div>
            <h2>{hasActiveFilters ? "No courses match that" : "Courses are on their way"}</h2>
            <p>{hasActiveFilters ? "Try another word, or clear the filters to see every course." : "No courses are published yet. Check back soon."}</p>
            {hasActiveFilters ? <button type="button" className="btn btn-outline" onClick={clearFilters}>Show all courses</button> : null}
          </div>
        ) : (
          <div className={`pc-grid${loading ? " is-loading" : ""}`}>
            {courses.map((course) => <CourseCard key={course.id} course={course} />)}
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalCourses}
          pageSize={PAGE_SIZE}
          onPageChange={(nextPage) => {
            updateParams({ page: nextPage > 1 ? nextPage : null }, { resetPage: false })
            resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
          }}
          label="courses"
        />
      </div>
    </div>
  )
}
