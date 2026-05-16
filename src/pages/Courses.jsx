import { useEffect, useState } from "react"
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
  const [page, setPage] = useState(1)
  const [totalCourses, setTotalCourses] = useState(0)
  const [activeCategory, setActiveCategory] = useState("All")
  const [priceFilter, setPriceFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    loadCourses(page)
  }, [page])

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCourses(targetPage) {
    setLoading(true)

    const from = (targetPage - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, count, error } = await supabase
      .from("courses")
      .select("*", { count: "exact" })
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) {
      console.error("Failed to load courses:", error)
      setCourses([])
      setTotalCourses(0)
    } else {
      setCourses(data || [])
      setTotalCourses(count || 0)
    }

    setLoading(false)
  }

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

  const totalPages = Math.max(1, Math.ceil(totalCourses / PAGE_SIZE))
  const normalizedSearchQuery = searchQuery.trim().toLowerCase()

  const filteredCourses = courses.filter((course) => {
    const matchesCategory =
      activeCategory === "All" ||
      normalizeValue(course.category) === normalizeValue(activeCategory)

    const matchesPrice =
      priceFilter === "all" ||
      (priceFilter === "free" && course.is_free) ||
      (priceFilter === "paid" && !course.is_free)

    const matchesSearch = (course.title || "").toLowerCase().includes(normalizedSearchQuery)

    return matchesCategory && matchesPrice && matchesSearch
  })

  const hasActiveFilters =
    activeCategory !== "All" || priceFilter !== "all" || normalizedSearchQuery.length > 0

  useEffect(() => {
    if (activeCategory !== "All" && !categoryTabs.includes(activeCategory)) {
      setActiveCategory("All")
    }
  }, [activeCategory, categoryTabs])

  function togglePriceFilter(nextFilter) {
    setPriceFilter((currentFilter) => (currentFilter === nextFilter ? "all" : nextFilter))
  }

  return (
    <div className="page">
      <SEO
        title="Pharmacy Courses"
        description="Explore self-paced pharmacy CPD courses with practical lessons, downloadable resources, and completion certificates from PharmaCourse."
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
        {loading ? (
          <p style={{ color: "var(--text-500)" }}>Loading courses...</p>
        ) : courses.length === 0 ? (
          <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
            <p style={{ color: "var(--text-500)" }}>No courses published yet. Check back soon.</p>
          </div>
        ) : (
          <>
            <div className="card courses-filter-bar">
              <div className="courses-filter-row">
                <div className="courses-filter-group">
                  <span className="courses-filter-label">Category</span>
                  <div className="courses-filter-tabs" role="tablist" aria-label="Course categories">
                    {categoryTabs.map((category) => {
                      const isActive = activeCategory === category

                      return (
                        <button
                          key={category}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          className={`btn ${isActive ? "btn-primary" : "btn-outline"}`}
                          onClick={() => setActiveCategory(category)}
                        >
                          {category}
                        </button>
                      )
                    })}
                  </div>
                  {categoryTabs.length > 3 ? (
                    <p className="courses-filter-scroll-hint">Swipe left to see more categories</p>
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
                  Showing {filteredCourses.length} of {courses.length} courses on this page
                </p>
              </div>
            </div>

            {filteredCourses.length === 0 ? (
              <div className="card" style={{ padding: "2.5rem", textAlign: "center" }}>
                <p style={{ color: "var(--text-500)" }}>
                  {hasActiveFilters
                    ? "No courses match the filters on this page."
                    : "No courses available on this page."}
                </p>
              </div>
            ) : (
              <div className="courses-full-grid">
                {filteredCourses.map((course) => (
                  <CourseCard key={course.id} course={course} compact />
                ))}
              </div>
            )}

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalCourses}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              label="courses"
            />
          </>
        )}
      </div>
    </div>
  )
}
