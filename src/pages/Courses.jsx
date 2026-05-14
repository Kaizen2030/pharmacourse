import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import CourseCard from "../components/CourseCard"
import SEO from "../components/SEO"
import Pagination from "../components/Pagination"

const PAGE_SIZE = 12

export default function Courses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCourses, setTotalCourses] = useState(0)

  useEffect(() => {
    loadCourses(page)
  }, [page])

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

  const totalPages = Math.max(1, Math.ceil(totalCourses / PAGE_SIZE))

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
            <div className="courses-full-grid">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} compact />
              ))}
            </div>
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
