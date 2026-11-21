import { useEffect, useRef, useState } from "react"
import { pharmacyosClient } from "./pharmacyosClient"

const REFRESH_EVENT = "patient-portal:refresh"
const LIVE_TABLES = ["prescription_requests", "appointments", "deliveries", "patient_notifications"]

// Ask any open portal page to reload its data (e.g. right after the account is confirmed).
export function requestPatientPortalRefresh() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(REFRESH_EVENT))
}

// Calls onChange whenever the pharmacy updates one of this patient's requests, appointments, deliveries or
// notifications. Supabase Realtime only delivers rows the signed-in patient is allowed to read.
// Returns "live" | "connecting" | "off" so the page can say whether updates are instant.
export function usePatientPortalLive(onChange, enabled) {
  const [state, setState] = useState("off")
  const callbackRef = useRef(onChange)
  callbackRef.current = onChange

  useEffect(() => {
    if (typeof window === "undefined") return undefined
    let timer = null
    const fire = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => callbackRef.current?.(), 400)
    }
    window.addEventListener(REFRESH_EVENT, fire)
    return () => { window.removeEventListener(REFRESH_EVENT, fire); window.clearTimeout(timer) }
  }, [])

  useEffect(() => {
    if (!enabled) { setState("off"); return undefined }
    let channel = null
    let cancelled = false
    let timer = null
    const fire = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => callbackRef.current?.(), 400)
    }

    setState("connecting")
    pharmacyosClient.rpc("patient_portal_account_status").then(({ data, error }) => {
      if (cancelled) return
      const phone = !error ? data?.phone : null
      if (!phone) { setState("off"); return }
      channel = pharmacyosClient.channel(`patient-portal-${phone}`)
      for (const table of LIVE_TABLES) {
        channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `patient_phone=eq.${phone}` }, fire)
      }
      channel.subscribe((status) => {
        if (cancelled) return
        if (status === "SUBSCRIBED") setState("live")
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setState("off")
      })
    })

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      if (channel) pharmacyosClient.removeChannel(channel)
    }
  }, [enabled])

  return state
}
