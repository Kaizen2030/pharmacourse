import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient"
import { useAuth } from "../context/AuthContext"

// Is the signed-in user a linked tutor? Returns { loading, instructorId, setupMissing }.
export function useTutorProfile() {
  const { user, loading } = useAuth()
  const [state, setState] = useState({ loading: true, instructorId: null })
  useEffect(() => {
    if (loading) return undefined
    if (!user) { setState({ loading: false, instructorId: null }); return undefined }
    let active = true
    supabase.rpc("my_instructor_id").then(({ data, error }) => {
      if (active) setState({ loading: false, instructorId: error ? null : data || null, setupMissing: Boolean(error && /my_instructor_id|does not exist|schema cache/i.test(error.message || "")) })
    })
    return () => { active = false }
  }, [user, loading])
  return state
}
