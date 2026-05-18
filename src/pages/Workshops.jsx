import { useEffect, useMemo, useState } from "react"
import { CalendarDays, Clock3, UserRound, Video } from "lucide-react"
import { supabase } from "../lib/supabaseClient"
import SEO from "../components/SEO"
import "./Workshops.css"

function formatWorkshopDate(dateValue) {
  if (!dateValue) return "Date TBA"

  const parsedDate = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) return dateValue

  return parsedDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatWorkshopTime(timeValue) {
  if (!timeValue) return ""

  const [hours, minutes] = `${timeValue}`.split(":")
  if (hours == null || minutes == null) return `${timeValue}`

  const parsedDate = new Date()
  parsedDate.setHours(Number(hours), Number(minutes), 0, 0)

  if (Number.isNaN(parsedDate.getTime())) return `${hours}:${minutes}`

  return parsedDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatDateParts(dateValue) {
  if (!dateValue) {
    return { month: "TBA", day: "--" }
  }

  const parsedDate = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) {
    return { month: "Date", day: "TBA" }
  }

  return {
    month: parsedDate.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: parsedDate.toLocaleDateString("en-US", { day: "2-digit" }),
  }
}

function formatDuration(durationMinutes) {
  if (!durationMinutes) return "Duration TBA"
  if (durationMinutes < 60) return `${durationMinutes} min`

  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60

  if (minutes === 0) return `${hours} hr${hours > 1 ? "s" : ""}`
  return `${hours} hr ${minutes} min`
}

function formatPrice(workshop) {
  if (workshop.is_free) return "Free"
  return `KES ${Number(workshop.price || 0).toLocaleString()}`
}

function formatHostLine(workshop) {
  if (workshop.host_name && workshop.host_title) return `${workshop.host_name}, ${workshop.host_title}`
  if (workshop.host_name) return workshop.host_name
  if (workshop.host_title) return workshop.host_title
  return "Host to be announced"
}

function hasRecording(tags) {
  return (tags || []).some((tag) => {
    const normalizedTag = (tag || "").trim().toLowerCase()
    return normalizedTag === "recording available" || normalizedTag === "recording" || normalizedTag === "replay"
  })
}

function WorkshopCard({ workshop }) {
  const dateBadge = formatDateParts(workshop.date)

  return (
    <article className="card workshop-card">
      <div className="workshop-card-top">
        <div className="workshop-date-badge" aria-label={formatWorkshopDate(workshop.date)}>
          <span className="workshop-date-month">{dateBadge.month}</span>
          <span className="workshop-date-day">{dateBadge.day}</span>
        </div>

        <span className={`workshop-price-badge ${workshop.is_free ? "free" : "paid"}`}>
          {formatPrice(workshop)}
        </span>
      </div>

      {workshop.cover_image_url ? (
        <div className="workshop-cover-frame">
          <img src={workshop.cover_image_url} alt={workshop.title} className="workshop-cover-image" />
        </div>
      ) : null}

      <div className="workshop-card-content">
        <p className="workshop-card-date">
          {formatWorkshopDate(workshop.date)}
          {workshop.time ? ` | ${formatWorkshopTime(workshop.time)}` : ""}
        </p>
        <h3>{workshop.title}</h3>
        <p className="workshop-card-description">
          {workshop.description || "A live practical session for pharmacy professionals."}
        </p>

        <div className="workshop-meta-list">
          <span><UserRound size={15} /> {formatHostLine(workshop)}</span>
          <span><Clock3 size={15} /> {formatDuration(workshop.duration_minutes)}</span>
        </div>

        {(workshop.tags || []).length > 0 ? (
          <div className="workshop-tag-row">
            {workshop.tags.map((tag) => (
              <span key={tag} className="workshop-tag">{tag}</span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="workshop-card-actions">
        {workshop.whatsapp_link ? (
          <a
            href={workshop.whatsapp_link}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary"
          >
            Register on WhatsApp
          </a>
        ) : (
          <button type="button" className="btn btn-outline" disabled>
            Registration opening soon
          </button>
        )}
      </div>
    </article>
  )
}

function PastWorkshopRow({ workshop }) {
  return (
    <article className="card workshop-past-row">
      <div className="workshop-past-main">
        <div className="workshop-past-header">
          <p className="workshop-past-date">
            <CalendarDays size={15} />
            {formatWorkshopDate(workshop.date)}
            {workshop.time ? ` | ${formatWorkshopTime(workshop.time)}` : ""}
          </p>
          {hasRecording(workshop.tags) ? (
            <span className="workshop-recording-badge">
              <Video size={14} />
              Recording available
            </span>
          ) : null}
        </div>

        <h3>{workshop.title}</h3>
        <p className="workshop-past-host">
          {formatHostLine(workshop)}
          {" | "}
          {formatDuration(workshop.duration_minutes)}
        </p>
        {workshop.description ? <p className="workshop-past-description">{workshop.description}</p> : null}
      </div>

      <div className="workshop-past-side">
        <span className={`workshop-price-badge ${workshop.is_free ? "free" : "paid"}`}>
          {formatPrice(workshop)}
        </span>
        {workshop.whatsapp_link ? (
          <a
            href={workshop.whatsapp_link}
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline"
          >
            View details
          </a>
        ) : null}
      </div>
    </article>
  )
}

export default function Workshops() {
  const [workshops, setWorkshops] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  async function loadWorkshops() {
    setLoading(true)
    setErrorMessage("")

    const { data, error } = await supabase
      .from("workshops")
      .select("*")
      .order("date", { ascending: true })
      .order("time", { ascending: true })

    if (error) {
      console.error("Failed to load workshops:", error)
      setWorkshops([])
      setErrorMessage("We could not load workshops right now. Please try again shortly.")
    } else {
      setWorkshops(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadWorkshops()
  }, [])

  const { upcomingWorkshops, pastWorkshops } = useMemo(() => {
    const upcoming = []
    const past = []

    workshops.forEach((workshop) => {
      if (workshop.is_upcoming) {
        upcoming.push(workshop)
      } else {
        past.push(workshop)
      }
    })

    return {
      upcomingWorkshops: upcoming,
      pastWorkshops: past.sort((first, second) => new Date(second.date || 0) - new Date(first.date || 0)),
    }
  }, [workshops])

  return (
    <div className="page workshops-page">
      <SEO
        title="Live Workshops & Webinars"
        description="Join live pharmacy workshops and webinars, register quickly on WhatsApp, and revisit past sessions from PharmaCourse."
        path="/workshops"
        type="website"
      />

      <div className="page-header">
        <div className="container-wide workshops-hero">
          <div className="detail-badge">Live Learning</div>
          <h1>Live Workshops & Webinars</h1>
          <p>
            Join practical live sessions for pharmacists, pharmacy teams, and healthcare operators. Register on
            WhatsApp, learn directly from experienced hosts, and catch up on selected past sessions.
          </p>
        </div>
      </div>

      <div className="container-wide workshops-layout">
        <section className="workshops-section">
          <div className="workshops-section-heading">
            <div>
              <h2>Upcoming</h2>
              <p>Reserve your seat for the next live sessions.</p>
            </div>
          </div>

          {loading ? (
            <div className="card workshops-empty-state">
              <p>Loading workshops...</p>
            </div>
          ) : errorMessage ? (
            <div className="card workshops-empty-state">
              <p>{errorMessage}</p>
            </div>
          ) : upcomingWorkshops.length === 0 ? (
            <div className="card workshops-empty-state">
              <p>No upcoming workshops have been published yet.</p>
            </div>
          ) : (
            <div className="workshops-grid">
              {upcomingWorkshops.map((workshop) => (
                <WorkshopCard key={workshop.id} workshop={workshop} />
              ))}
            </div>
          )}
        </section>

        <section className="workshops-section">
          <div className="workshops-section-heading">
            <div>
              <h2>Past Sessions</h2>
              <p>Browse previous webinars and workshop replays.</p>
            </div>
          </div>

          {loading ? (
            <div className="card workshops-empty-state">
              <p>Loading past sessions...</p>
            </div>
          ) : errorMessage ? (
            <div className="card workshops-empty-state">
              <p>{errorMessage}</p>
            </div>
          ) : pastWorkshops.length === 0 ? (
            <div className="card workshops-empty-state">
              <p>No past workshop sessions are available yet.</p>
            </div>
          ) : (
            <div className="workshops-past-list">
              {pastWorkshops.map((workshop) => (
                <PastWorkshopRow key={workshop.id} workshop={workshop} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
