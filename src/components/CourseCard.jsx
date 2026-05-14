import { Link } from "react-router-dom"
import "./CourseCard.css"

export default function CourseCard({ course, compact = false }) {
  const price = course.is_free ? "Free" : `KES ${course.price || 0}`

  return (
    <Link to={`/courses/${course.slug || course.id}`} style={{ textDecoration: "none" }}>
      <div className={`course-card-udemy${compact ? " compact" : ""}`}>
        <div className="course-card-image">
          {course.image_url ? (
            <img src={course.image_url} alt={course.title} />
          ) : (
            <div className="course-image-placeholder">PC</div>
          )}
          <div className="course-card-overlay">
            <button className="btn-view">View Course</button>
          </div>
        </div>

        <div className="course-card-content">
          <div className="course-card-category">{course.category || "Pharmacy"}</div>

          <h3 className="course-card-title">{course.title}</h3>

          <p className="course-card-desc">
            {(course.short_desc || course.description || "").substring(0, 85)}
            {(course.short_desc || course.description || "").length > 85 ? "..." : ""}
          </p>

          <div className="course-card-stats">
            <div className="stat">
              <span className="stat-icon">M</span>
              <span className="stat-text">Modules</span>
            </div>
            <div className="stat">
              <span className="stat-icon">S</span>
              <span className="stat-text">Self-paced</span>
            </div>
          </div>

          <div className="course-card-footer">
            <span className="course-card-price">{price}</span>
            <span className="course-card-rating">4.8</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
