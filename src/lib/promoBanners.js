import posPoster from "../assets/promo/01-pos.jpg"
import hmisPoster from "../assets/promo/02-hmis.jpg"
import joinPoster from "../assets/promo/03-pharmacourse.jpg"
import antibiogramPoster from "../assets/promo/04-antibiogram.jpg"
import leadershipPoster from "../assets/promo/05-leadership.jpg"
import ncdPoster from "../assets/promo/06-ncd.jpg"
import regulatoryPoster from "../assets/promo/07-regulatory.jpg"
import pgxPoster from "../assets/promo/08-pharmacogenomics.jpg"
import analyticsPoster from "../assets/promo/09-data-analytics.jpg"
import telePoster from "../assets/promo/10-telepharmacy.jpg"
import herbalPoster from "../assets/promo/11-herbal.jpg"
import greenPoster from "../assets/promo/12-green-pharmacy.jpg"

// Poster ads shown in the carousel under the homepage hero.
// Admins can replace this list from Admin → Homepage → Poster Ads; the
// edited list is stored as JSON in homepage_content (section_key "promoBanners").
export const PROMO_SECTION_KEY = "promoBanners"
export const PROMO_STORAGE_BUCKET = "course-covers"

// Bundled posters are saved as "builtin:<key>" so saved lists keep working
// after rebuilds change the hashed asset file names.
export const BUILTIN_PROMO_IMAGES = {
  pos: posPoster,
  hmis: hmisPoster,
  join: joinPoster,
  antibiogram: antibiogramPoster,
  leadership: leadershipPoster,
  ncd: ncdPoster,
  regulatory: regulatoryPoster,
  pgx: pgxPoster,
  analytics: analyticsPoster,
  telepharmacy: telePoster,
  herbal: herbalPoster,
  green: greenPoster,
}

export function promoImageSrc(imageUrl) {
  if (typeof imageUrl === "string" && imageUrl.startsWith("builtin:")) {
    return BUILTIN_PROMO_IMAGES[imageUrl.slice(8)] || ""
  }
  return imageUrl || ""
}

// course_match: words looked up in published course titles so the poster
// opens that course's page. link_url is used when no course matches.
export const DEFAULT_PROMO_SLIDES = [
  { id: "pos", image_url: "builtin:pos", alt: "RemedacarePOS – free pilot for pharmacies", link_url: "/remedacarepos", enabled: true },
  { id: "hmis", image_url: "builtin:hmis", alt: "RemedacareHMIS – free pilot for hospitals and clinics", link_url: "/remedacarehmis", enabled: true },
  { id: "join", image_url: "builtin:join", alt: "Pharmacourse – teach and inspire, join as a tutor", link_url: "/tutor", enabled: true },
  { id: "antibiogram", image_url: "builtin:antibiogram", alt: "Mastering Antibiogram Development – free course", link_url: "/courses", course_match: "antibiogram", enabled: true },
  { id: "leadership", image_url: "builtin:leadership", alt: "Leadership & Hospital Pharmacy Management – free course", link_url: "/courses", course_match: "leadership", enabled: true },
  { id: "ncd", image_url: "builtin:ncd", alt: "NCD Management Masterclass", link_url: "/courses", course_match: "ncd", enabled: true },
  { id: "regulatory", image_url: "builtin:regulatory", alt: "Regulatory Affairs, Pharmacovigilance & PPB Compliance", link_url: "/courses", course_match: "pharmacovigilance", enabled: true },
  { id: "pgx", image_url: "builtin:pgx", alt: "Pharmacogenomics & Precision Medicine", link_url: "/courses", course_match: "pharmacogenomics", enabled: true },
  { id: "analytics", image_url: "builtin:analytics", alt: "Data Analytics & Pharmacy Dashboard Mastery", link_url: "/courses", course_match: "analytics", enabled: true },
  { id: "telepharmacy", image_url: "builtin:telepharmacy", alt: "Telepharmacy & Digital Patient Care", link_url: "/courses", course_match: "telepharmacy", enabled: true },
  { id: "herbal", image_url: "builtin:herbal", alt: "Herbal & Integrative Pharmacy Practice", link_url: "/courses", course_match: "herbal", enabled: true },
  { id: "green", image_url: "builtin:green", alt: "Sustainable & Green Pharmacy Practice", link_url: "/courses", course_match: "green pharmacy", enabled: true },
]

export function parsePromoSlides(body) {
  if (!body) return null
  try {
    const parsed = typeof body === "string" ? JSON.parse(body) : body
    const list = Array.isArray(parsed) ? parsed : parsed?.slides
    if (!Array.isArray(list)) return null
    return list
      .filter((s) => s && typeof s.image_url === "string" && s.image_url.trim())
      .map((s, i) => ({
        id: String(s.id || `slide-${i}`),
        image_url: s.image_url.trim(),
        alt: String(s.alt || ""),
        link_url: String(s.link_url || ""),
        course_match: s.course_match ? String(s.course_match) : "",
        enabled: s.enabled !== false,
      }))
  } catch {
    return null
  }
}

export function serializePromoSlides(slides) {
  return JSON.stringify({
    slides: slides.map(({ id, image_url, alt, link_url, course_match, enabled }) => ({
      id, image_url, alt, link_url, course_match: course_match || "", enabled: enabled !== false,
    })),
  })
}

// Picks the destination for a slide: a matching published course first,
// then the slide's own link, then the course catalogue.
export function resolvePromoLink(slide, courses = []) {
  const match = (slide.course_match || "").trim().toLowerCase()
  if (match) {
    const course = courses.find((c) => (c.title || "").toLowerCase().includes(match))
    if (course) return `/courses/${course.slug || course.id}`
  }
  return slide.link_url || "/courses"
}
