import { Link } from "react-router-dom"
import "./CourseCard.css"

const CATEGORY_GRADIENTS = {
  clinical: ["#0F6E56", "#1D9E75"],
  management: ["#185FA5", "#378ADD"],
  compliance: ["#854F0B", "#BA7517"],
}

function getCategoryGradient(category) {
  return CATEGORY_GRADIENTS[(category || "").trim().toLowerCase()] || ["#533AB7", "#7F77DD"]
}

export default function CourseCard({ course, compact = false }) {
  const price = course.is_free ? "Free" : `KES ${course.price || 0}`
  const categoryLabel = course.category || "Pharmacy"
  const [gradientStart, gradientEnd] = getCategoryGradient(course.category)

  return (
    <Link to={`/courses/${course.slug || course.id}`} style={{ textDecoration: "none" }}>
      <div className={`course-card-udemy${compact ? " compact" : ""}`}>
        <div className="course-card-image">
          {course.image_url ? (
            <img src={course.image_url} alt={course.title} />
          ) : (
            <div
              className="course-image-placeholder"
              style={{ background: `linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%)` }}
            >
              <span>{categoryLabel}</span>
            </div>
          )}
          <div className="course-card-overlay">
            <button className="btn-view">View Course</button>
          </div>
        </div>

        <div className="course-card-content">
          <div className="course-card-category">{categoryLabel}</div>

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
