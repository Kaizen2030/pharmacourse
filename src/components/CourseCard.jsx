import { Link } from "react-router-dom"
import { ArrowRight, Award, BookOpen, Clock, GraduationCap, Pill } from "lucide-react"
import "../styles/courses-ui.css"
import { hasCourseModules, tutorApplicationLink } from "../lib/courseAvailability"

const CATEGORY_ART = {
  clinical: ["#0F6E56", "#1D9E75"],
  management: ["#185FA5", "#378ADD"],
  compliance: ["#854F0B", "#BA7517"],
}

function categoryArt(category) {
  return CATEGORY_ART[(category || "").trim().toLowerCase()] || ["#3f2f9e", "#7F77DD"]
}

export function formatCoursePrice(course) {
  if (!hasCourseModules(course)) return { label: "Coming soon", free: false }
  if (course.is_free || !(Number(course.price) > 0)) return { label: "Free", free: true }
  return { label: Number(course.price).toLocaleString("en-KE"), currency: "KES", free: false }
}

// A card is one link (the whole card is clickable via an overlay), with optional action buttons layered above it,
// so there are never links inside links.
export default function CourseCard({ course }) {
  const href = `/courses/${course.slug || course.id}`
  const hasModules = hasCourseModules(course)
  const price = formatCoursePrice(course)
  const category = course.category || "Pharmacy"
  const [from, to] = categoryArt(course.category)
  const summary = course.short_desc || course.description || ""
  const moduleCount = Number(course.module_count || 0)
  const cpd = Number(course.cpd_hours || 0)

  return (
    <article className="pc-card">
      <Link to={href} className="pc-card-link" aria-label={`${course.title}: view course`} />
      <div className="pc-card-media">
        {course.image_url ? (
          <img src={course.image_url} alt="" loading="lazy" decoding="async" />
        ) : (
          <div className="pc-card-art" style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }} aria-hidden="true">
            <Pill />
            <span>{category}</span>
          </div>
        )}
        <div className="pc-badges">
          <span className="pc-badge is-dark">{category}</span>
          {!hasModules ? <span className="pc-badge is-soon">Coming soon</span> : price.free ? <span className="pc-badge is-free">Free</span> : null}
        </div>
      </div>

      <div className="pc-card-body">
        <h3 className="pc-card-title">{course.title}</h3>
        {summary ? <p className="pc-card-desc">{summary}</p> : null}

        <div className="pc-meta">
          {moduleCount > 0 ? <span><BookOpen size={15} aria-hidden="true" />{moduleCount} {moduleCount === 1 ? "module" : "modules"}</span> : null}
          {cpd > 0 ? <span><Award size={15} aria-hidden="true" />{cpd} CPD {cpd === 1 ? "hour" : "hours"}</span> : null}
          {course.level ? <span><GraduationCap size={15} aria-hidden="true" />{course.level}</span> : null}
          <span><Clock size={15} aria-hidden="true" />Self-paced</span>
        </div>

        <div className="pc-card-foot">
          <span className={`pc-price${price.free ? " is-free" : ""}`}>
            {price.currency ? <small>{price.currency}</small> : null}{price.label}
          </span>
          {hasModules ? <span className="pc-go">View course <ArrowRight size={16} aria-hidden="true" /></span> : null}
        </div>

        {!hasModules ? (
          <div className="pc-card-actions">
            {course.is_available ? <Link to={href} className="btn btn-primary">Apply to enrol</Link> : null}
            <a href={tutorApplicationLink(course)} target="_blank" rel="noreferrer noopener" className="btn btn-outline">Apply as tutor</a>
          </div>
        ) : null}
      </div>
    </article>
  )
}

export function CourseCardSkeleton() {
  return (
    <div className="pc-skeleton" aria-hidden="true">
      <div className="s-media" />
      <div className="s-line short" />
      <div className="s-line" />
      <div className="s-line last" />
    </div>
  )
}
