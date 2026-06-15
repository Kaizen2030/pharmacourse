import { createClient } from "@supabase/supabase-js"

const pharmacyPortalSupabaseUrl =
  import.meta.env.VITE_PHARMACYOS_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL

const pharmacyPortalSupabaseAnonKey =
  import.meta.env.VITE_PHARMACYOS_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY

export const pharmacyPortalSupabase = createClient(
  pharmacyPortalSupabaseUrl,
  pharmacyPortalSupabaseAnonKey
)
