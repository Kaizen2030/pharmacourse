import { createClient } from "@supabase/supabase-js"

// RemedacarePOS Supabase project (patient portal data). Set in .env and in Vercel; the build refuses to run
// without them (see vite.config.js), so a misconfigured deploy can never point the portal somewhere else.
const pharmacyPosUrl = String(import.meta.env.VITE_PHARMACYOS_SUPABASE_URL || "").trim()
const pharmacyPosAnonKey = String(import.meta.env.VITE_PHARMACYOS_SUPABASE_ANON_KEY || "").trim()

if (!pharmacyPosUrl || !pharmacyPosAnonKey) {
  console.error("Patient portal is not configured: set VITE_PHARMACYOS_SUPABASE_URL and VITE_PHARMACYOS_SUPABASE_ANON_KEY.")
}

export const pharmacyPosSupabase = createClient(
  pharmacyPosUrl || "http://pharmacy-pos-not-configured.invalid",
  pharmacyPosAnonKey || "pharmacy-pos-not-configured",
)
