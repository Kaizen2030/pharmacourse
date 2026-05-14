import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import CourseCard from "../components/CourseCard"

export default function Courses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from("courses")
      .select("*")
      .eq("is_published", true)
      .then(({ data }) => {
        setCourses(data || [])
        setLoading(false)
      })
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <div className="container">
          <h1>Explore Courses</h1>
          <p>Self-paced pharmacy professional development courses with downloadable resources and certificates.</p>
        </div>
      </div>

      <div className="container" style={{ paddingTop: "2rem" }}>
        {loading ? (
          <p style={{ color: "var(--text-500)" }}>Loading courses...</p>
        ) : courses.length === 0 ? (
          <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
            <p style={{ color: "var(--text-500)" }}>No courses published yet. Check back soon.</p>
          </div>
        ) : (
          <div className="courses-full-grid">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
