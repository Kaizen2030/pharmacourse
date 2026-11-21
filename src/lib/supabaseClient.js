import { createClient } from "@supabase/supabase-js"

// Pharmacourse (courses, blog, community) Supabase project. This is a different project from RemedacarePOS:
// never fall back to the POS settings, or the course site would silently read and write the POS database.
const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || "").trim()
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim()

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Pharmacourse is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.")
}

export const supabase = createClient(
  supabaseUrl || "http://pharmacourse-not-configured.invalid",
  supabaseAnonKey || "pharmacourse-not-configured",
)
