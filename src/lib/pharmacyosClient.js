import { createClient } from "@supabase/supabase-js"

const pharmacyosUrl =
  import.meta.env.VITE_PHARMACYOS_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL

const pharmacyosAnonKey =
  import.meta.env.VITE_PHARMACYOS_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY

export const pharmacyosClient = createClient(pharmacyosUrl, pharmacyosAnonKey)
