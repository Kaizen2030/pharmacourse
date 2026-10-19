// Sends the class-group invite by WhatsApp DM after a student enrolls.
// Run next to your gateway:  node invite-worker.js
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GATEWAY_URL (e.g. http://localhost:3000),
//      GATEWAY_WORKER_SECRET (shared secret; see GATEWAY_CHANGES.md)
import { createClient } from "@supabase/supabase-js"

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const GATEWAY = (process.env.GATEWAY_URL || "").replace(/\/+$/, "")
const SECRET = process.env.GATEWAY_WORKER_SECRET
const MAX_ATTEMPTS = 3
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const normalize = (v) => { let n = String(v || "").replace(/\D/g, ""); if (n.startsWith("0")) n = `254${n.slice(1)}`; return /^\d{9,15}$/.test(n) ? n : "" }

async function mark(id, patch) { await sb.from("whatsapp_group_invites").update(patch).eq("id", id) }

async function tick() {
  const { data: jobs } = await sb.from("whatsapp_group_invites").select("*").eq("status", "queued").order("created_at").limit(10)
  for (const job of jobs || []) {
    const [{ data: group }, { data: course }, { data: learner }] = await Promise.all([
      sb.from("course_whatsapp_groups").select("invite_url, welcome_text").eq("course_id", job.course_id).maybeSingle(),
      sb.from("courses").select("title, instructor_id").eq("id", job.course_id).maybeSingle(),
      sb.from("user_profiles").select("full_name, whatsapp_number, whatsapp_opted_in").eq("id", job.user_id).maybeSingle(),
    ])
    const to = normalize(learner?.whatsapp_number)
    if (!group || !course) { await mark(job.id, { status: "skipped", reason: "group removed" }); continue }
    if (!to || !learner?.whatsapp_opted_in) { await mark(job.id, { status: "skipped", reason: "no number or no consent" }); continue }

    const text = [`Hi ${(learner.full_name || "").split(" ")[0] || "there"} 👋`, `Welcome to *${course.title}*!`, group.welcome_text || "Join your class WhatsApp group:", group.invite_url].join("\n\n")
    try {
      const res = await fetch(`${GATEWAY}/internal/instances/${encodeURIComponent(course.instructor_id)}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-worker-secret": SECRET },
        body: JSON.stringify({ courseId: job.course_id, to, text }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `gateway ${res.status}`)
      await mark(job.id, { status: "sent", sent_at: new Date().toISOString(), attempts: job.attempts + 1 })
    } catch (err) {
      const attempts = job.attempts + 1
      await mark(job.id, { attempts, reason: String(err.message).slice(0, 200), status: attempts >= MAX_ATTEMPTS ? "failed" : "queued" })
    }
    await sleep(4000 + Math.random() * 6000) // random delay protects the tutor's number
  }
}

for (;;) {
  try { await tick() } catch (err) { console.error("invite tick failed:", err.message) }
  await sleep(15000)
}
