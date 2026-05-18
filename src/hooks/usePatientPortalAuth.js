import { useEffect, useMemo, useState } from "react"
import { pharmacyosClient } from "../lib/pharmacyosClient"

export function normalizePatientPhone(phone) {
  return String(phone || "").trim()
}

export function getPatientAuthMetadata(user) {
  const metadata = user?.user_metadata || {}
  const patientPhone = normalizePatientPhone(
    metadata.patient_phone ||
      metadata.phone ||
      metadata.patientPhone ||
      "",
  )

  return {
    patientPhone,
    fullName: String(
      metadata.full_name ||
        metadata.name ||
        metadata.patient_name ||
        "",
    ).trim(),
    primaryPharmacyId: String(
      metadata.primary_pharmacy_id ||
        metadata.pharmacy_id ||
        "",
    ).trim(),
  }
}

export function buildPatientAuthMetadata({
  fullName,
  phone,
  pharmacyId,
}) {
  return {
    full_name: String(fullName || "").trim(),
    patient_phone: normalizePatientPhone(phone),
    primary_pharmacy_id: String(pharmacyId || "").trim(),
  }
}

export function usePatientPortalAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function restoreSession() {
      try {
        const {
          data: { session },
          error,
        } = await pharmacyosClient.auth.getSession()

        if (error) throw error
        if (!active) return
        setUser(session?.user ?? null)
      } catch (error) {
        console.error("[PatientAuth] Session restore failed:", error)
        if (!active) return
        setUser(null)
      } finally {
        if (active) setLoading(false)
      }
    }

    void restoreSession()

    const {
      data: { subscription },
    } = pharmacyosClient.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const metadata = useMemo(() => getPatientAuthMetadata(user), [user])

  async function signOut() {
    const { error } = await pharmacyosClient.auth.signOut()
    if (error) throw error
  }

  return {
    user,
    loading,
    isAuthenticated: Boolean(user),
    patientPhone: metadata.patientPhone,
    fullName: metadata.fullName,
    primaryPharmacyId: metadata.primaryPharmacyId,
    signOut,
  }
}
