// Shared helpers for the payment Edge Functions. Secrets come from Edge Function secrets only, never the browser.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const allowedOrigin = Deno.env.get("APP_ORIGIN") || "https://www.pharmacourse.co.ke"

export const cors = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
}

export function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", ...extraHeaders } })
}

export function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL")
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!url || !key) throw new Error("Supabase server settings are missing.")
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

// The signed-in learner making the request (from their Supabase session token).
export async function requireUser(req: Request) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "")
  if (!token) return null
  const { data, error } = await serviceClient().auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

// The learner's own pending payment, re-read on the server so amount and phone cannot be changed by the browser.
export async function loadOwnPendingPayment(paymentId: string, userId: string, provider: string) {
  const db = serviceClient()
  const { data, error } = await db.from("payments").select("id, user_id, course_id, provider, status, amount_kes, phone, checkout_id").eq("id", paymentId).maybeSingle()
  if (error) throw new Error("We could not load that payment.")
  if (!data || data.user_id !== userId) throw new Error("That payment was not found.")
  if (data.provider !== provider) throw new Error("That payment uses a different method.")
  return data
}

export async function confirmPayment(paymentId: string, reference: string, amount: number, raw: Record<string, unknown>) {
  const { data, error } = await serviceClient().rpc("confirm_payment", { p_payment: paymentId, p_reference: reference, p_amount: amount, p_raw: raw })
  if (error) throw new Error(`confirm_payment failed: ${error.message}`)
  return data
}

export async function failPayment(paymentId: string, reason: string, raw: Record<string, unknown>, status = "failed") {
  await serviceClient().rpc("fail_payment", { p_payment: paymentId, p_reason: reason, p_raw: raw, p_status: status })
}

export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
