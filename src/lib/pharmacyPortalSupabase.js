import { createClient } from "@supabase/supabase-js"

const pharmacyPortalUrl =
  import.meta.env.VITE_PHARMACYOS_SUPABASE_URL ||
  "https://npybtjtilzjsgcxgesxy.supabase.co"

const pharmacyPortalAnonKey =
  import.meta.env.VITE_PHARMACYOS_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5weWJ0anRpbHpqc2djeGdlc3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NjQxMzgsImV4cCI6MjA5MTE0MDEzOH0.C6K-lBJ-R6DdEqeqTTHCWjNhhxXmBSYTzfr6xTZAIlw"

export const pharmacyPortalSupabase = createClient(pharmacyPortalUrl, pharmacyPortalAnonKey)
