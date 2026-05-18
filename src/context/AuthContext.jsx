/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"

const AuthContext = createContext({})
const SESSION_TIMEOUT_MS = 8000

function withTimeout(promise, message, timeoutMs = SESSION_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs)
    }),
  ])
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const isAdmin = profile?.role === "admin"
  const isSuperAdmin = isAdmin && profile?.admin_role === "super"
  const isContentAdmin = isAdmin && profile?.admin_role === "content"

  useEffect(() => {
    let isActive = true

    async function applySession(session) {
      if (!isActive) return

      const nextUser = session?.user ?? null
      setUser(nextUser)

      if (!nextUser) {
        setProfile(null)
        setLoading(false)
        return
      }

      try {
        const nextProfile = await ensureProfile(nextUser)
        if (!isActive) return
        setProfile(nextProfile)
      } catch (error) {
        console.error("[Auth] Profile load failed:", error)
        if (!isActive) return
        setProfile(null)
      } finally {
        if (isActive) setLoading(false)
      }
    }

    async function restoreSession() {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          "Timed out while restoring your saved session."
        )

        if (error) throw error
        await applySession(data?.session ?? null)
      } catch (error) {
        console.error("[Auth] Load failed:", error)
        if (!isActive) return
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    }

    restoreSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoading(true)
      void applySession(session)
    })

    return () => {
      isActive = false
      subscription.unsubscribe()
    }
  }, [])

  async function fetchProfile(userId) {
    const { data, error } = await withTimeout(
      supabase.from("user_profiles").select("*").eq("id", userId).maybeSingle(),
      "Timed out while loading your profile."
    )

    if (error) throw error
    return data ?? null
  }

  async function ensureProfile(nextUser) {
    const existingProfile = await fetchProfile(nextUser.id)
    if (existingProfile) return existingProfile

    const fullName =
      nextUser.user_metadata?.full_name ??
      nextUser.user_metadata?.name ??
      [nextUser.user_metadata?.given_name, nextUser.user_metadata?.family_name]
        .filter(Boolean)
        .join(" ")

    const profilePayload = {
      id: nextUser.id,
      email: nextUser.email ?? "",
      full_name: fullName,
      professional_id: nextUser.user_metadata?.professional_id ?? "",
      role: "student",
    }

    const { error } = await withTimeout(
      supabase.from("user_profiles").insert(profilePayload),
      "Timed out while creating your profile."
    )

    if (error && error.code !== "23505") throw error

    return fetchProfile(nextUser.id)
  }

  async function updateProfile(updates) {
    if (!user?.id) {
      throw new Error("You must be signed in to update your profile.")
    }

    const profileUpdates = {
      full_name: updates.full_name?.trim() ?? profile?.full_name ?? "",
      professional_id: updates.professional_id?.trim() ?? profile?.professional_id ?? "",
    }

    const { error: profileError } = await withTimeout(
      supabase.from("user_profiles").update(profileUpdates).eq("id", user.id),
      "Timed out while saving your profile."
    )

    if (profileError) {
      if (profileError.message?.toLowerCase().includes("permission denied")) {
        throw new Error("Supabase denied profile updates. Re-run supabase/rls_reset.sql in the Supabase SQL Editor, then try again.")
      }

      throw profileError
    }

    const metadataUpdates = {
      full_name: profileUpdates.full_name,
      professional_id: profileUpdates.professional_id,
    }

    const { error: authError } = await withTimeout(
      supabase.auth.updateUser({ data: metadataUpdates }),
      "Timed out while syncing your account details."
    )

    if (authError) throw authError

    const nextProfile = await fetchProfile(user.id)
    setProfile(nextProfile)
    return nextProfile
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, isSuperAdmin, isContentAdmin, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
