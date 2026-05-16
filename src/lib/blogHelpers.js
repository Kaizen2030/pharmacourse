const BLOG_CATEGORY_ACRONYMS = new Map([
  ["ai", "AI"],
  ["api", "API"],
  ["b2b", "B2B"],
  ["b2c", "B2C"],
  ["cpd", "CPD"],
  ["hr", "HR"],
  ["it", "IT"],
  ["os", "OS"],
  ["phd", "PhD"],
  ["sha", "SHA"],
  ["seo", "SEO"],
  ["ui", "UI"],
  ["ux", "UX"],
])

export function normalizeBlogCategory(category) {
  const normalized = `${category || ""}`.trim().replace(/\s+/g, " ")
  if (!normalized) return ""

  return normalized
    .split(" ")
    .map((word) => {
      const cleanedWord = word.trim()
      if (!cleanedWord) return ""

      const directMatch = BLOG_CATEGORY_ACRONYMS.get(cleanedWord.toLowerCase())
      if (directMatch) return directMatch

      return cleanedWord
        .split("-")
        .map((part) => {
          const acronymPart = BLOG_CATEGORY_ACRONYMS.get(part.toLowerCase())
          if (acronymPart) return acronymPart
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        })
        .join("-")
    })
    .join(" ")
}

export function slugifyBlogCategory(value) {
  return `${normalizeBlogCategory(value)}`
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export function formatBlogDate(dateValue) {
  if (!dateValue) return "Unpublished"

  const parsedDate = new Date(dateValue)
  if (Number.isNaN(parsedDate.getTime())) return `${dateValue}`

  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function getBlogCategoryLabel(category) {
  return normalizeBlogCategory(category) || "General"
}

export function getBlogCoverFallback(category) {
  const normalizedCategory = `${category || ""}`.trim().toLowerCase()

  if (normalizedCategory === "clinical") {
    return "linear-gradient(135deg, #0F6E56, #1D9E75)"
  }

  if (normalizedCategory === "management") {
    return "linear-gradient(135deg, #185FA5, #378ADD)"
  }

  if (normalizedCategory === "compliance") {
    return "linear-gradient(135deg, #854F0B, #BA7517)"
  }

  return "linear-gradient(135deg, #533AB7, #7F77DD)"
}

export function stripHtmlContent(value) {
  const normalizedValue = `${value || ""}`
  if (!normalizedValue.trim()) return ""

  if (typeof window !== "undefined" && typeof window.DOMParser !== "undefined") {
    const parsed = new window.DOMParser().parseFromString(normalizedValue, "text/html")
    return `${parsed.body.textContent || ""}`.replace(/\s+/g, " ").trim()
  }

  return normalizedValue
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function getBlogExcerpt(post) {
  if (post.excerpt) return post.excerpt
  const content = stripHtmlContent(post.content)
  if (content) {
    return content.length > 160 ? `${content.slice(0, 160)}...` : content
  }

  const firstSectionBody = normalizeBlogSections(post.content_sections)
    .map((section) => `${section.body || ""}`.replace(/\s+/g, " ").trim())
    .find(Boolean)

  if (!firstSectionBody) return "Read the latest pharmacy operations and professional learning insight from PharmaCourse."
  return firstSectionBody.length > 160 ? `${firstSectionBody.slice(0, 160)}...` : firstSectionBody
}

export function createEmptyBlogSection() {
  return {
    title: "",
    body: "",
    images: [],
    pending_image_url: "",
  }
}

export function normalizeBlogSections(rawSections) {
  if (!Array.isArray(rawSections)) return []

  return rawSections.map((section) => {
    const imageList = Array.isArray(section?.images)
      ? section.images
      : (section?.image_url ? [section.image_url] : [])

    return {
      title: `${section?.title || ""}`,
      body: `${section?.body || ""}`,
      images: imageList
        .map((image) => `${image || ""}`.trim())
        .filter(Boolean),
      pending_image_url: `${section?.pending_image_url || ""}`,
    }
  })
}

export function hasPopulatedBlogSections(rawSections) {
  return normalizeBlogSections(rawSections).some((section) =>
    [section.title, section.body].some((value) => `${value || ""}`.trim()) || section.images.length > 0
  )
}

export function getPopulatedBlogSections(rawSections) {
  return normalizeBlogSections(rawSections).filter((section) =>
    [section.title, section.body].some((value) => `${value || ""}`.trim()) || section.images.length > 0
  )
}

export function getBlogSectionImageAlt(postTitle, sectionTitle, imageIndex = 0) {
  const safeSectionTitle = `${sectionTitle || ""}`.trim()
  const safePostTitle = `${postTitle || "Blog post"}`.trim()
  const imageNumber = imageIndex + 1

  if (safeSectionTitle) return `${safeSectionTitle} illustration ${imageNumber}`
  return `${safePostTitle} subsection illustration ${imageNumber}`
}
