import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import CourseCard from "../components/CourseCard"
import SEO from "../components/SEO"
import Pagination from "../components/Pagination"
import { getCourseCategoryLabel } from "../lib/courseCategoryHelpers"

const PAGE_SIZE = 12

function normalizeValue(value) {
  return (value || "").trim().toLowerCase()
}

function buildCategoryList(values) {
  const uniqueCategories = Array.from(
    new Set(
      (values || [])
        .map((value) => getCourseCategoryLabel(value))
        .filter(Boolean)
    )
  )

  return uniqueCategories.sort((a, b) => a.localeCompare(b))
}

export default function Courses() {
  const [courses, setCourses] = useState([])
  const [categoryTabs, setCategoryTabs] = useState(["All"])
  const [loading, setLoading] = useState(true)
  const [totalCourses, setTotalCourses] = useState(0)
  // Filters live in the URL so a filtered list can be shared (e.g. on WhatsApp).
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1)
  const activeCategory = searchParams.get("category") || "All"
  const priceFilter = ["free", "paid"].includes(searchParams.get("price")) ? searchParams.get("price") : "all"
  const urlQuery = searchParams.get("q") || ""
  const [searchQuery, setSearchQuery] = useState(urlQuery)
  const requestId = useRef(0)

  const updateParams = useCallback((changes, { resetPage = true } = {}) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      Object.entries(changes).forEach(([key, value]) => {
        if (value === null || value === "" || value === "All" || value === "all") next.delete(key)
        else next.set(key, String(value))
      })
      if (resetPage) next.delete("page")
      return next
    }, { replace: true })
  }, [setSearchParams])
  const categoryTabsRef = useRef(null)
  const [categoryScrollState, setCategoryScrollState] = useState({
    hasOverflow: false,
    canScrollLeft: false,
    canScrollRight: false,
  })

  const loadCourses = useCallback(async () => {
    const currentRequest = ++requestId.current
    setLoading(true)

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from("courses")
      .select("*", { count: "exact" })
      .eq("is_published", true)
    if (activeCategory !== "All") query = query.ilike("category", activeCategory.replace(/[%_,()]/g, " ").trim())
    if (priceFilter === "free") query = query.eq("is_free", true)
    if (priceFilter === "paid") query = query.eq("is_free", false)
    const cleanQuery = urlQuery.replace(/[%_,()]/g, " ").trim()
    if (cleanQuery) query = query.ilike("title", `%${cleanQuery}%`)

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to)

    if (currentRequest !== requestId.current) return // a newer request replaced this one

    if (error) {
      console.error("Failed to load courses:", error)
      setCourses([])
      setTotalCourses(0)
    } else {
      setCourses(data || [])
      setTotalCourses(count || 0)
    }

    setLoading(false)
  }, [page, activeCategory, priceFilter, urlQuery])

  async function loadCategories() {
    const [managedResponse, usedResponse] = await Promise.all([
      supabase
        .from("course_categories")
        .select("name")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("courses")
        .select("category")
        .eq("is_published", true),
    ])

    const managedCategories = managedResponse.error
      ? []
      : buildCategoryList((managedResponse.data || []).map((row) => row.name))

    const usedCategories = usedResponse.error
      ? []
      : buildCategoryList((usedResponse.data || []).map((row) => row.category))

    if (managedResponse.error && usedResponse.error) {
      console.error("Failed to load course categories:", managedResponse.error, usedResponse.error)
      setCategoryTabs(["All"])
      return
    }

    const nextCategories = Array.from(
      new Set([...managedCategories, ...usedCategories])
    ).sort((first, second) => first.localeCompare(second))

    setCategoryTabs(["All", ...nextCategories])
  }

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  // Debounce typing into the URL (one request per pause, not per keystroke).
  useEffect(() => {
    if (searchQuery.trim() === urlQuery) return undefined
    const timer = window.setTimeout(() => updateParams({ q: searchQuery.trim() }), 350)
    return () => window.clearTimeout(timer)
  }, [searchQuery, urlQuery, updateParams])

  // Keep the input in sync if the URL changes (back button, shared link).
  useEffect(() => { setSearchQuery(urlQuery) }, [urlQuery])

  useEffect(() => {
    loadCategories()
  }, [])

  const totalPages = Math.max(1, Math.ceil(totalCourses / PAGE_SIZE))
  const hasActiveFilters = activeCategory !== "All" || priceFilter !== "all" || urlQuery.length > 0

  useEffect(() => {
    // Ignore categories that no longer exist (only once the list has loaded).
    if (categoryTabs.length > 1 && activeCategory !== "All" && !categoryTabs.some((tab) => normalizeValue(tab) === normalizeValue(activeCategory))) {
      updateParams({ category: null })
    }
  }, [activeCategory, categoryTabs, updateParams])

  useEffect(() => {
    const rail = categoryTabsRef.current
    if (!rail) return

    function updateCategoryScrollState() {
      const maxScrollLeft = rail.scrollWidth - rail.clientWidth
      const hasOverflow = maxScrollLeft > 8

      setCategoryScrollState({
        hasOverflow,
        canScrollLeft: hasOverflow && rail.scrollLeft > 8,
        canScrollRight: hasOverflow && rail.scrollLeft < maxScrollLeft - 8,
      })
    }

    updateCategoryScrollState()

    rail.addEventListener("scroll", updateCategoryScrollState, { passive: true })
    window.addEventListener("resize", updateCategoryScrollState)

    return () => {
      rail.removeEventListener("scroll", updateCategoryScrollState)
      window.removeEventListener("resize", updateCategoryScrollState)
    }
  }, [categoryTabs])

  function togglePriceFilter(nextFilter) {
    updateParams({ price: priceFilter === nextFilter ? null : nextFilter })
  }

  function scrollCategoryTabs(direction) {
    const rail = categoryTabsRef.current
    if (!rail) return

    const scrollAmount = Math.max(rail.clientWidth * 0.72, 180) * direction
    rail.scrollBy({ left: scrollAmount, behavior: "smooth" })
  }

  return (
    <div className="page">
      <SEO
        title="Pharmacy Courses"
        description="Explore self-paced pharmacy CPD courses with practical lessons, downloadable resources, and completion certificates from RemedacarePOS."
        path="/courses"
        type="website"
      />

      <div className="page-header">
        <div className="container-wide">
          <h1>Explore Courses</h1>
          <p>Self-paced pharmacy professional development courses with downloadable resources and certificates.</p>
        </div>
      </div>

      <div className="container-wide" style={{ paddingTop: "2rem" }}>
        {loading && courses.length === 0 && categoryTabs.length <= 1 && !hasActiveFilters ? (
          <p style={{ color: "var(--text-500)" }}>Loading courses...</p>
        ) : (
          <>
            <div className="card courses-filter-bar">
              <div className="courses-filter-row">
                <div className="courses-filter-group category-filter-group">
                  <span className="courses-filter-label">Category</span>
                  <div className={`courses-filter-scroller${categoryScrollState.hasOverflow ? " has-overflow" : ""}`}>
                    <button
                      type="button"
                      className="courses-filter-scroll-btn"
                      aria-label="Scroll categories left"
                      onClick={() => scrollCategoryTabs(-1)}
                      disabled={!categoryScrollState.canScrollLeft}
                    >
                      <span aria-hidden="true">‹</span>
                    </button>

                    <div
                      ref={categoryTabsRef}
                      className="courses-filter-tabs"
                      role="tablist"
                      aria-label="Course categories"
                    >
                      {categoryTabs.map((category) => {
                        const isActive = activeCategory === category

                        return (
                          <button
                            key={category}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            className={`btn ${isActive ? "btn-primary" : "btn-outline"}`}
                            onClick={() => updateParams({ category })}
                          >
                            {category}
                          </button>
                        )
                      })}
                    </div>

                    <button
                      type="button"
                      className="courses-filter-scroll-btn"
                      aria-label="Scroll categories right"
                      onClick={() => scrollCategoryTabs(1)}
                      disabled={!categoryScrollState.canScrollRight}
                    >
                      <span aria-hidden="true">›</span>
                    </button>
                  </div>
                  {categoryScrollState.hasOverflow ? (
                    <p className="courses-filter-scroll-hint">Swipe or use the arrows to see more categories</p>
                  ) : null}
                </div>

                <div className="courses-filter-search">
                  <label className="courses-filter-label" htmlFor="course-search">
                    Search courses
                  </label>
                  <input
                    id="course-search"
                    type="search"
                    className="courses-search-input"
                    placeholder="Search by course title"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>
              </div>

              <div className="courses-filter-row courses-filter-row-bottom">
                <div className="courses-filter-group">
                  <span className="courses-filter-label">Pricing</span>
                  <div className="courses-price-toggle" aria-label="Filter by pricing">
                    <button
                      type="button"
                      className={`btn ${priceFilter === "free" ? "btn-primary" : "btn-outline"}`}
                      aria-pressed={priceFilter === "free"}
                      onClick={() => togglePriceFilter("free")}
                    >
                      Free
                    </button>
                    <button
                      type="button"
                      className={`btn ${priceFilter === "paid" ? "btn-primary" : "btn-outline"}`}
                      aria-pressed={priceFilter === "paid"}
                      onClick={() => togglePriceFilter("paid")}
                    >
                      Paid
                    </button>
                  </div>
                  <p className="courses-filter-scroll-hint">Swipe left or right to view filter options</p>
                </div>

                <p className="courses-filter-summary">
                  {loading ? "Searching…" : `${totalCourses} ${totalCourses === 1 ? "course" : "courses"} found`}
                  {hasActiveFilters ? (
                    <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: "0.5rem" }} onClick={() => { setSearchQuery(""); setSearchParams({}, { replace: true }) }}>Clear filters</button>
                  ) : null}
                </p>
              </div>
            </div>

            {!loading && courses.length === 0 ? (
              <div className="card" style={{ padding: "2.5rem", textAlign: "center" }}>
                <p style={{ color: "var(--text-500)" }}>
                  {hasActiveFilters
                    ? "No courses match these filters."
                    : "No courses published yet. Check back soon."}
                </p>
              </div>
            ) : (
              <div className="courses-full-grid" style={loading ? { opacity: 0.55, transition: "opacity .15s" } : undefined}>
                {courses.map((course) => (
                  <CourseCard key={course.id} course={course} compact />
                ))}
              </div>
            )}

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalCourses}
              pageSize={PAGE_SIZE}
              onPageChange={(nextPage) => { updateParams({ page: nextPage > 1 ? nextPage : null }, { resetPage: false }); window.scrollTo({ top: 0, behavior: "smooth" }) }}
              label="courses"
            />
          </>
        )}
      </div>
    </div>
  )
}
