import { supabase } from "./supabaseClient"

export const isGroupInviteUrl = (value) => /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+/.test((value || "").trim())

// Enrolled learners (and the tutor/admin) get the link; everyone else gets null.
export async function fetchMyCourseGroup(courseId) {
  if (!courseId) return null
  const { data, error } = await supabase.rpc("get_my_course_group", { p_course: courseId })
  if (error) {
    // SQL not installed yet: behave as "no group" instead of breaking the page.
    if (/get_my_course_group|schema cache|does not exist/i.test(error.message || "")) return null
    throw error
  }
  return Array.isArray(data) ? data[0] || null : data || null
}
