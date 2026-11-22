// Publishes a social post from Admin > Blog & site > Social. Deployed automatically by .github/workflows/deploy-functions.yml.
// Keys: a super admin pastes the Ayrshare API key or a Make.com / Zapier / n8n webhook link in Admin > Social
// (saved encrypted in Supabase Vault, read here with the server key). Edge Function secrets with the same meaning
// also work and take priority: AYRSHARE_API_KEY, SOCIAL_WEBHOOK_URL, SOCIAL_WEBHOOK_SECRET, SOCIAL_CRON_TOKEN.
//
// Calls (POST):
//   { action: "status" }               admin: which publisher is set up and which networks are linked
//   { action: "publish", post_id }     admin: publish now
//   { action: "run-scheduled" }        scheduler (header x-cron-token): publish posts that are due
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"
import { cors, json, serviceClient, timingSafeEqual } from "../_shared/payments.ts"

const env = (k: string) => Deno.env.get(k) || ""
const AYRSHARE_PLATFORM: Record<string, string> = { facebook: "facebook", instagram: "instagram", tiktok: "tiktok", linkedin: "linkedin", x: "twitter", youtube: "youtube" }

async function isAdmin(req: Request) {
  const auth = req.headers.get("Authorization") || ""
  if (!auth) return false
  // Uses the caller's own session, so the database decides (including the admin two-step rule).
  const client = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const { data, error } = await client.rpc("is_admin")
  return !error && data === true
}

type Cfg = { ayrshare_api_key?: string; webhook_url?: string; webhook_secret?: string; cron_token?: string }

async function loadConfig(): Promise<Cfg> {
  let fromVault: Cfg = {}
  try {
    const { data } = await serviceClient().rpc("get_social_config")
    if (data && typeof data === "object") fromVault = data as Cfg
  } catch { /* Vault step not run yet: secrets only */ }
  const fromEnv: Cfg = {}
  const map: Record<keyof Cfg, string> = { ayrshare_api_key: "AYRSHARE_API_KEY", webhook_url: "SOCIAL_WEBHOOK_URL", webhook_secret: "SOCIAL_WEBHOOK_SECRET", cron_token: "SOCIAL_CRON_TOKEN" }
  for (const [k, name] of Object.entries(map)) if (env(name)) fromEnv[k as keyof Cfg] = env(name)
  return { ...fromVault, ...fromEnv }
}

function publisher(c: Cfg) {
  if (c.ayrshare_api_key) return "ayrshare"
  if (c.webhook_url) return "webhook"
  return null
}

async function hmacHex(key: string, message: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(message))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

type Post = { id: string; title: string; caption: string; link_url: string | null; media_url: string | null; media_type: string | null; networks: string[] }

async function send(c: Cfg, post: Post) {
  const text = [post.caption?.trim(), post.link_url].filter(Boolean).join("\n\n")
  const results: Record<string, { status: string; url?: string; error?: string }> = {}
  const mode = publisher(c)
  if (!mode) throw new Error("Auto-posting is not connected yet. Paste your Ayrshare key or automation link under Auto-posting, or use the share buttons.")
  if (!post.networks?.length) throw new Error("Choose at least one network.")

  if (mode === "ayrshare") {
    const res = await fetch("https://api.ayrshare.com/api/post", {
      method: "POST",
      headers: { Authorization: `Bearer ${c.ayrshare_api_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        post: text,
        platforms: post.networks.map((n) => AYRSHARE_PLATFORM[n]).filter(Boolean),
        ...(post.media_url ? { mediaUrls: [post.media_url], isVideo: post.media_type === "video" } : {}),
        ...(post.networks.includes("youtube") ? { youTubeOptions: { title: post.title.slice(0, 100), visibility: "public" } } : {}),
      }),
    })
    const body = await res.json().catch(() => ({}))
    const ids = Array.isArray(body.postIds) ? body.postIds : []
    for (const n of post.networks) {
      const hit = ids.find((p: { platform: string }) => p.platform === AYRSHARE_PLATFORM[n])
      const err = (Array.isArray(body.errors) ? body.errors : []).find((e: { platform: string }) => e.platform === AYRSHARE_PLATFORM[n])
      results[n] = hit && hit.status === "success" ? { status: "published", url: hit.postUrl } : { status: "failed", error: String(err?.message || body.message || "Not posted") }
    }
  } else {
    const payload = JSON.stringify({ id: post.id, title: post.title, caption: post.caption, link: post.link_url, text, media_url: post.media_url, media_type: post.media_type, networks: post.networks, sent_at: new Date().toISOString() })
    const res = await fetch(c.webhook_url as string, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Pharmacourse-Signature": await hmacHex(c.webhook_secret || "unsigned", payload) },
      body: payload,
    })
    for (const n of post.networks) results[n] = res.ok ? { status: "sent", url: undefined } : { status: "failed", error: `Automation replied ${res.status}` }
  }
  return results
}

async function publishPost(c: Cfg, postId: string) {
  const db = serviceClient()
  const { data: post, error } = await db.from("social_posts").select("id, title, caption, link_url, media_url, media_type, networks, status").eq("id", postId).maybeSingle()
  if (error || !post) throw new Error("That post was not found.")
  if (post.status === "publishing") throw new Error("This post is already being published.")
  await db.from("social_posts").update({ status: "publishing", updated_at: new Date().toISOString() }).eq("id", postId)
  try {
    const results = await send(c, post as Post)
    const states = Object.values(results).map((r) => r.status)
    const ok = states.filter((s) => s !== "failed").length
    const status = ok === states.length ? "published" : ok > 0 ? "partial" : "failed"
    await db.from("social_posts").update({ status, results, published_at: ok ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", postId)
    return { status, results }
  } catch (e) {
    await db.from("social_posts").update({ status: "failed", results: { _error: { status: "failed", error: (e as Error).message } }, updated_at: new Date().toISOString() }).eq("id", postId)
    throw e
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)
  let body: { action?: string; post_id?: string }
  try { body = await req.json() } catch { return json({ error: "Bad request" }, 400) }
  const c = await loadConfig()

  if (body.action === "run-scheduled") {
    const token = req.headers.get("x-cron-token") || ""
    if (!c.cron_token || !timingSafeEqual(token, c.cron_token)) return json({ error: "Forbidden" }, 403)
    const { data: due } = await serviceClient().rpc("due_social_posts")
    const done = []
    for (const p of due || []) {
      try { done.push({ id: p.id, ...(await publishPost(c, p.id)) }) } catch (e) { done.push({ id: p.id, error: (e as Error).message }) }
    }
    return json({ published: done.length, done })
  }

  if (!(await isAdmin(req))) return json({ error: "Admins only." }, 403)

  if (body.action === "status") {
    const mode = publisher(c)
    let linked: string[] = []
    let keyOk = true
    if (mode === "ayrshare") {
      const res = await fetch("https://api.ayrshare.com/api/user", { headers: { Authorization: `Bearer ${c.ayrshare_api_key}` } })
      keyOk = res.ok
      const u = await res.json().catch(() => ({}))
      const reverse = Object.fromEntries(Object.entries(AYRSHARE_PLATFORM).map(([k, v]) => [v, k]))
      linked = (u.activeSocialAccounts || []).map((p: string) => reverse[p]).filter(Boolean)
    }
    return json({ publisher: mode, linked, key_ok: keyOk })
  }

  if (body.action === "publish" && body.post_id) {
    try { return json(await publishPost(c, body.post_id)) } catch (e) { return json({ error: (e as Error).message }, 400) }
  }
  return json({ error: "Unknown action." }, 400)
})
