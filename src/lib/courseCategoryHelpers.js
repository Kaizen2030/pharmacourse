const COURSE_CATEGORY_ACRONYMS = new Map([
  ["ai", "AI"],
  ["api", "API"],
  ["b2b", "B2B"],
  ["b2c", "B2C"],
  ["cpd", "CPD"],
  ["hr", "HR"],
  ["it", "IT"],
  ["otc", "OTC"],
  ["os", "OS"],
  ["sha", "SHA"],
  ["ui", "UI"],
  ["ux", "UX"],
])

export function normalizeCourseCategory(category) {
  const normalized = `${category || ""}`.trim().replace(/\s+/g, " ")
  if (!normalized) return ""

  return normalized
    .split(" ")
    .map((word) => {
      const cleanedWord = word.trim()
      if (!cleanedWord) return ""

      const directMatch = COURSE_CATEGORY_ACRONYMS.get(cleanedWord.toLowerCase())
      if (directMatch) return directMatch

      return cleanedWord
        .split("-")
        .map((part) => {
          const acronymPart = COURSE_CATEGORY_ACRONYMS.get(part.toLowerCase())
          if (acronymPart) return acronymPart
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        })
        .join("-")
    })
    .join(" ")
}

export function slugifyCourseCategory(value) {
  return `${normalizeCourseCategory(value)}`
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export function getCourseCategoryLabel(category) {
  return normalizeCourseCategory(category) || "General"
}
