export const SUPPORT_WA_NUMBER = import.meta.env.VITE_SUPPORT_WA_NUMBER || ""
export function waLink(text = "", number = SUPPORT_WA_NUMBER) {
  const normalized = String(number || "").replace(/\D/g, "")
  if (!normalized) return ""
  return `https://wa.me/${normalized}${text ? `?text=${encodeURIComponent(text)}` : ""}`
}

export function waShareLink(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function contextMessage(pathname, pageTitle = "") {
  const path = pathname.toLowerCase()
  const title = pageTitle.replace(/\s*\|.*$/, "").trim()
  if (path.startsWith("/courses/")) return `Hi, I have a question about the course: ${title}`
  if (path.startsWith("/courses")) return "Hi, I need help choosing a course."
  if (path.startsWith("/workshops")) return "Hi, I have a question about your workshops."
  if (path.startsWith("/remedacarepos") || path.startsWith("/pharmacyos")) return "Hi, I'd like to book a demo of RemedacarePOS."
  if (path.startsWith("/remedacarehm") || path.startsWith("/remedacareos")) return "Hi, I'd like to book a demo of RemedacareHMIS."
  if (path.startsWith("/team-plans")) return "Hi, I'd like to enquire about team plans."
  return "Hi, I have a question about Pharmacourse."
}

export const FAQ = [
  {
    id: "courses",
    q: "What courses do you offer?",
    keywords: ["course", "courses", "learn", "cpd", "study", "class"],
    a: "Browse all pharmacy courses, including free ones, on the courses page.",
    link: { to: "/courses", label: "View courses" },
  },
  {
    id: "workshops",
    q: "When is the next workshop?",
    keywords: ["workshop", "webinar", "live", "session", "event"],
    a: "Upcoming workshops are listed with their dates and registration details.",
    link: { to: "/workshops", label: "See workshops" },
  },
  {
    id: "certificate",
    q: "How do I get or verify a certificate?",
    keywords: ["certificate", "certify", "verify", "proof"],
    a: "Your certificates are in My Learning once a course is complete. Employers can verify one using its certificate ID.",
    link: { to: "/dashboard", label: "Go to My Learning" },
  },
  {
    id: "pos",
    q: "Tell me about RemedacarePOS",
    keywords: ["pos", "remedacarepos", "pharmacy software", "inventory", "stock", "sales"],
    a: "RemedacarePOS is pharmacy software for sales, stock and operations.",
    link: { to: "/remedacarepos", label: "Explore RemedacarePOS" },
  },
  {
    id: "hmis",
    q: "Tell me about RemedacareHMIS",
    keywords: ["hmis", "hms", "hospital", "remedacarehmis"],
    a: "RemedacareHMIS connects hospital workflows in one system.",
    link: { to: "/remedacarehmis", label: "Explore RemedacareHMIS" },
  },
  {
    id: "teams",
    q: "Do you have team plans?",
    keywords: ["team", "teams", "staff", "bulk", "organisation", "organization", "group"],
    a: "Team plans cover staff training with CPD tracking and certificate management.",
    link: { to: "/team-plans", label: "View team plans" },
  },
]

export function matchFaq(input) {
  const text = input.toLowerCase()
  let best = null
  let bestScore = 0
  for (const item of FAQ) {
    const score = item.keywords.reduce((count, keyword) => count + Number(text.includes(keyword)), 0)
    if (score > bestScore) {
      best = item
      bestScore = score
    }
  }
  return best
}