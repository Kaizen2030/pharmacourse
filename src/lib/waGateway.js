import { supabase } from "./supabaseClient"

const BASE = (import.meta.env.VITE_WA_GATEWAY_URL || "").replace(/\/+$/, "")
export const gatewayConfigured = Boolean(BASE)

async function request(path, { method = "GET", body } = {}) {
  if (!BASE) throw new Error("Set VITE_WA_GATEWAY_URL to your self-hosted gateway address.")
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error("Sign in again to manage your WhatsApp connection.")
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || `Gateway error (${response.status})`)
  return result
}

export const waGateway = {
  list: () => request("/instances"),
  create: (id, label) => request("/instances", { method: "POST", body: { id, label } }),
  qr: (id) => request(`/instances/${encodeURIComponent(id)}/qr`),
  pair: (id, phone) => request(`/instances/${encodeURIComponent(id)}/pair`, { method: "POST", body: { phone } }),
  restart: (id) => request(`/instances/${encodeURIComponent(id)}/restart`, { method: "POST" }),
  remove: (id) => request(`/instances/${encodeURIComponent(id)}`, { method: "DELETE" }),
  send: (id, courseId, to, text) => request(`/instances/${encodeURIComponent(id)}/send`, { method: "POST", body: { courseId, to, text } }),
  broadcast: (id, courseId, text) => request(`/instances/${encodeURIComponent(id)}/broadcast`, { method: "POST", body: { courseId, text } }),
  job: (jobId) => request(`/jobs/${encodeURIComponent(jobId)}`),
}