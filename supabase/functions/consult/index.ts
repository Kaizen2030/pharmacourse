import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const allowedOrigin = Deno.env.get("APP_ORIGIN") || "*"
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
}

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" }
const publicStunUrls = (Deno.env.get("PUBLIC_STUN_URLS") || "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders })
}

function fail(error: string, status: number) {
  return response({ error }, status)
}

function normalizePhone(value: unknown) {
  return String(value || "").replace(/[^\d+]/g, "")
}

function buildIceServers() {
  const servers: Array<{ urls: string | string[]; username?: string; credential?: string }> = publicStunUrls.map((urls) => ({ urls }))
  const turnUrls = (Deno.env.get("TURN_URLS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
  const username = Deno.env.get("TURN_USERNAME") || ""
  const credential = Deno.env.get("TURN_CREDENTIAL") || ""

  if (turnUrls.length && username && credential) {
    servers.push({ urls: turnUrls, username, credential })
  }

  return servers
}

function isActiveAppointment(status: unknown) {
  return !["cancelled", "canceled", "completed", "closed", "no_show"].includes(String(status || "").toLowerCase())
}

function isVideoAppointment(type: unknown) {
  return String(type || "").toLowerCase() === "video_consultation"
}

async function getUser(req: Request, url: string, anonKey: string) {
  const authorization = req.headers.get("Authorization")
  if (!authorization?.startsWith("Bearer ")) return null

  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) return null
  return data.user
}

async function getAppointment(admin: ReturnType<typeof createClient>, appointmentId: string) {
  const { data, error } = await admin
    .from("appointments")
    .select("id, pharmacy_id, patient_id, patient_phone, appointment_type, slot_datetime, status")
    .eq("id", appointmentId)
    .maybeSingle()

  if (error) throw error
  return data
}

async function isStaff(admin: ReturnType<typeof createClient>, pharmacyId: string, userId: string) {
  const { data, error } = await admin.rpc("consult_is_staff", {
    p_pharmacy_id: pharmacyId,
    p_user_id: userId,
  })
  if (error) throw error
  return data === true
}

async function isAppointmentPatient(admin: ReturnType<typeof createClient>, appointment: Record<string, unknown>, user: Record<string, any>) {
  const metadata = user.user_metadata || {}
  const accountPhone = normalizePhone(metadata.patient_phone || metadata.phone || metadata.patientPhone)
  const appointmentPhone = normalizePhone(appointment.patient_phone)

  if (accountPhone && appointmentPhone && accountPhone === appointmentPhone) return true
  if (!appointment.patient_id) return false

  const { data, error } = await admin
    .from("patients")
    .select("id, phone")
    .eq("id", appointment.patient_id)
    .maybeSingle()
  if (error) throw error

  return Boolean(data && accountPhone && normalizePhone(data.phone) === accountPhone)
}

async function getOrCreateSession(admin: ReturnType<typeof createClient>, appointment: Record<string, any>, userId: string) {
  const appointmentId = String(appointment.id)
  const existing = await admin.from("consult_sessions").select("*").eq("appointment_id", appointmentId).maybeSingle()
  if (existing.error) throw existing.error

  if (existing.data?.status === "live") return existing.data

  const signalSecret = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "")
  const { data, error } = await admin
    .from("consult_sessions")
    .upsert({
      appointment_id: appointmentId,
      pharmacy_id: String(appointment.pharmacy_id),
      patient_id: appointment.patient_id ? String(appointment.patient_id) : null,
      status: "live",
      signal_secret: signalSecret,
      started_by: userId,
      started_at: new Date().toISOString(),
      ended_at: null,
      duration_seconds: null,
    }, { onConflict: "appointment_id" })
    .select("*")
    .single()

  if (error) throw error
  return data
}

function sessionPayload(session: Record<string, any>, role: "patient" | "staff") {
  return {
    appointmentId: session.appointment_id,
    role,
    topic: `consult:${session.appointment_id}:${session.signal_secret}`,
    iceServers: buildIceServers(),
    startedAt: session.started_at,
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return fail("method_not_allowed", 405)

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  if (!supabaseUrl || !serviceRoleKey || !anonKey) return fail("service_not_configured", 500)

  try {
    const user = await getUser(req, supabaseUrl, anonKey)
    if (!user) return fail("unauthorized", 401)

    const body = await req.json().catch(() => ({}))
    const action = String(body.action || "")
    const appointmentId = String(body.appointment_id || "").trim()
    if (!appointmentId || !["start", "join", "end"].includes(action)) return fail("invalid_request", 400)

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const appointment = await getAppointment(admin, appointmentId)
    if (!appointment) return fail("not_found", 404)
    if (!isVideoAppointment(appointment.appointment_type) || !isActiveAppointment(appointment.status)) {
      return fail("appointment_closed", 409)
    }

    const pharmacyId = String(appointment.pharmacy_id)
    const staff = await isStaff(admin, pharmacyId, user.id)

    if (action === "start") {
      if (!staff) return fail("forbidden", 403)
      const session = await getOrCreateSession(admin, appointment, user.id)
      return response(sessionPayload(session, "staff"))
    }

    if (action === "end") {
      if (!staff) return fail("forbidden", 403)
      const { data: session, error: sessionError } = await admin.from("consult_sessions").select("started_at, status").eq("appointment_id", appointmentId).maybeSingle()
      if (sessionError) throw sessionError
      if (!session || session.status === "ended") return response({ ended: true })

      const endedAt = new Date()
      const durationSeconds = Math.max(0, Math.round((endedAt.getTime() - new Date(session.started_at).getTime()) / 1000))
      const { error } = await admin.from("consult_sessions").update({
        status: "ended",
        ended_at: endedAt.toISOString(),
        duration_seconds: durationSeconds,
      }).eq("appointment_id", appointmentId)
      if (error) throw error
      return response({ ended: true })
    }

    if (staff) return fail("forbidden", 403)
    if (!(await isAppointmentPatient(admin, appointment, user))) return fail("forbidden", 403)

    const { data: session, error: sessionError } = await admin.from("consult_sessions").select("*").eq("appointment_id", appointmentId).maybeSingle()
    if (sessionError) throw sessionError
    if (!session || session.status !== "live") return fail("not_started", 409)

    if (!session.patient_joined_at) {
      const { error } = await admin.from("consult_sessions").update({ patient_joined_at: new Date().toISOString() }).eq("appointment_id", appointmentId)
      if (error) throw error
    }

    return response(sessionPayload(session, "patient"))
  } catch (error) {
    console.error("[consult] request failed", error)
    return fail("server_error", 500)
  }
})
