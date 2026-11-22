import { useCallback, useEffect, useRef, useState } from "react"
import { CalendarClock, Copy, Download, ImagePlus, Link2, Loader2, Send, Trash2, X as XIcon } from "lucide-react"
import { supabase } from "../../lib/supabaseClient"
import { friendlyError } from "../../lib/friendlyError"
import { confirmDialog } from "../../lib/dialog"
import { SITE_URL } from "../../lib/siteConfig"
import { BrandIcon } from "../../components/SocialIcons"
import AdminSocialKeys from "./AdminSocialKeys"
import { NETWORK_COLORS, NETWORK_NAMES } from "../../lib/socialNetworks"
import "./admin-learning.css"
import "./admin-social.css"

const POST_NETWORKS = ["facebook", "instagram", "linkedin", "x", "tiktok", "youtube"]
const LIMITS = { x: 280, instagram: 2200, tiktok: 2200, linkedin: 3000, youtube: 5000, facebook: 63206 }
const NEEDS_MEDIA = { instagram: "a poster or video", tiktok: "a video", youtube: "a video" }
const STATUS_LABEL = { draft: "Draft", scheduled: "Scheduled", publishing: "Publishing", published: "Published", partial: "Partly published", failed: "Failed" }
const STATUS_BADGE = { draft: "revoked", scheduled: "awaiting", publishing: "awaiting", published: "active", partial: "awaiting", failed: "expired" }
const MAX_MB = 100
const missingSql = (e) => /social_posts|site_social_links|does not exist|schema cache/i.test(String(e?.message || ""))
const when = (v) => (v ? new Date(v).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : "")

function shareLinks(post) {
  const url = post.link_url || SITE_URL
  const text = post.caption || post.title
  return [
    { network: "facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { network: "linkedin", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
    { network: "x", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text.slice(0, 240))}&url=${encodeURIComponent(url)}` },
    { network: "whatsapp", href: `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}` },
  ]
}

async function invokeSocial(body) {
  const { data, error } = await supabase.functions.invoke("social-publish", { body })
  if (error) {
    let message = "The publishing service is not reachable. Use the share buttons for now."
    try { const parsed = await error.context?.json?.(); if (parsed?.error) message = parsed.error } catch { /* default */ }
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

export default function AdminSocialTab() {
  const [posts, setPosts] = useState([])
  const [connection, setConnection] = useState({ state: "checking" })
  const [setupNeeded, setSetupNeeded] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const loadPosts = useCallback(async () => {
    const { data, error: e } = await supabase.from("social_posts").select("*").order("created_at", { ascending: false }).limit(50)
    if (e) { if (missingSql(e)) setSetupNeeded(true); else setError(friendlyError(e, "We could not load social posts.")); return }
    setSetupNeeded(false); setPosts(data || [])
  }, [])

  const checkConnection = useCallback(() => {
    invokeSocial({ action: "status" })
      .then((r) => setConnection(r.publisher ? { state: "on", publisher: r.publisher, linked: r.linked || [], key_ok: r.key_ok } : { state: "off", reachable: true }))
      .catch(() => setConnection({ state: "off", reachable: false }))
  }, [])

  useEffect(() => {
    void loadPosts()
    checkConnection()
  }, [loadPosts, checkConnection])

  async function publishNow(post) {
    setError(""); setNotice("")
    setPosts((list) => list.map((p) => (p.id === post.id ? { ...p, status: "publishing" } : p)))
    try {
      const r = await invokeSocial({ action: "publish", post_id: post.id })
      setNotice(r.status === "published" ? `"${post.title}" was published.` : r.status === "partial" ? `"${post.title}" was published to some networks. Check the results below.` : `"${post.title}" could not be published.`)
    } catch (e) { setError(e.message) }
    void loadPosts()
  }

  async function remove(post) {
    if (!(await confirmDialog({ title: "Delete this post?", message: "It is removed from this list. Posts already on social media stay there.", confirmLabel: "Delete", danger: true }))) return
    const { error: e } = await supabase.from("social_posts").delete().eq("id", post.id)
    if (e) setError(friendlyError(e, "We could not delete the post.")); else void loadPosts()
  }

  return (
    <div className="al-page">
      <header className="al-head">
        <div>
          <h2>Social</h2>
          <p>Create a poster or video post once and send it to your social channels. Your channel links also show in the site footer.</p>
        </div>
        <div className={`so-conn ${connection.state}`}>
          {connection.state === "checking" ? <><Loader2 size={15} className="wt-spin" aria-hidden="true" /> Checking connection…</>
            : connection.state === "on" ? <>Auto-posting on · {connection.publisher === "ayrshare" ? "Ayrshare" : "Automation webhook"}</>
              : <>Auto-posting off · share buttons only</>}
        </div>
      </header>

      {setupNeeded ? <div className="al-setup"><strong>One database step is needed.</strong> Run <code>supabase/security/2026-11-30_phase11_social.sql</code> in the Supabase SQL editor, then refresh.</div> : null}
      {!setupNeeded ? <AdminSocialKeys connection={connection} onChanged={checkConnection} /> : null}
      {error ? <p role="alert" className="al-alert">{error}</p> : null}
      {notice ? <p role="status" className="al-alert ok">{notice}</p> : null}

      {!setupNeeded ? <Composer connection={connection} onSaved={(post, publish) => { void loadPosts(); if (publish) void publishNow(post) }} /> : null}

      <section className="al-card al-block">
        <div className="al-block-head"><div><h3>Your posts</h3><p className="al-muted">Newest first. Results show per network.</p></div></div>
        {posts.length === 0 ? <p className="al-empty-cell">No posts yet. Your first post will appear here.</p> : (
          <ul className="so-posts">
            {posts.map((p) => (
              <li key={p.id} className="so-post">
                <div className="so-thumb">
                  {p.media_url ? (p.media_type === "video" ? <video src={p.media_url} muted playsInline preload="metadata" /> : <img src={p.media_url} alt="" loading="lazy" />) : <span><Link2 size={22} aria-hidden="true" /></span>}
                </div>
                <div className="so-post-main">
                  <div className="so-post-top">
                    <strong>{p.title}</strong>
                    <span className={`al-badge ${STATUS_BADGE[p.status] || ""}`}>{STATUS_LABEL[p.status] || p.status}</span>
                  </div>
                  {p.caption ? <p className="so-caption">{p.caption}</p> : null}
                  <p className="al-sub">{p.status === "scheduled" ? `Scheduled for ${when(p.scheduled_for)}` : p.published_at ? `Published ${when(p.published_at)}` : `Created ${when(p.created_at)}`}</p>
                  <div className="so-net-results">
                    {(p.networks || []).map((n) => {
                      const r = p.results?.[n]
                      return (
                        <span key={n} className={`so-net-chip ${r?.status || ""}`} title={r?.error || ""}>
                          <BrandIcon network={n} size={14} /> {NETWORK_NAMES[n]}
                          {r?.status === "published" && r.url ? <a href={r.url} target="_blank" rel="noreferrer">View</a> : r?.status ? ` · ${r.status === "sent" ? "sent" : r.status}` : ""}
                        </span>
                      )
                    })}
                    {p.results?._error ? <span className="so-net-chip failed">{p.results._error.error}</span> : null}
                  </div>
                  <div className="so-actions">
                    {connection.state === "on" && ["draft", "failed", "partial", "scheduled"].includes(p.status) ? (
                      <button type="button" className="al-btn primary" onClick={() => void publishNow(p)}><Send size={15} aria-hidden="true" /> Publish now</button>
                    ) : null}
                    {shareLinks(p).map((s) => (
                      <a key={s.network} className="so-share" href={s.href} target="_blank" rel="noopener noreferrer" title={`Share on ${NETWORK_NAMES[s.network]}`} aria-label={`Share on ${NETWORK_NAMES[s.network]}`} style={{ "--brand": NETWORK_COLORS[s.network] }}>
                        <BrandIcon network={s.network} size={16} />
                      </a>
                    ))}
                    <button type="button" className="al-btn" onClick={async () => { try { await navigator.clipboard.writeText([p.caption, p.link_url].filter(Boolean).join("\n\n")); setNotice("Caption copied.") } catch { setError("Could not copy. Select the text manually.") } }}>
                      <Copy size={15} aria-hidden="true" /> Copy caption
                    </button>
                    {p.media_url ? <a className="al-btn" href={p.media_url} download target="_blank" rel="noreferrer"><Download size={15} aria-hidden="true" /> Media</a> : null}
                    <button type="button" className="al-icon-btn so-del" onClick={() => void remove(p)} aria-label={`Delete ${p.title}`}><Trash2 size={15} /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!setupNeeded ? <Channels /> : null}
    </div>
  )
}

function Composer({ connection, onSaved }) {
  const blank = { title: "", caption: "", link_url: SITE_URL, networks: ["facebook", "linkedin"], mode: "now", scheduled_for: "" }
  const [form, setForm] = useState(blank)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState("")
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState("")
  const [error, setError] = useState("")
  const fileInput = useRef(null)

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  function pickFile(f) {
    setError("")
    if (!f) return
    if (!/^(image\/(jpeg|png|webp|gif)|video\/(mp4|quicktime|webm))$/.test(f.type)) { setError("Use a JPG, PNG, WebP or GIF poster, or an MP4, MOV or WebM video."); return }
    if (f.size > MAX_MB * 1024 * 1024) { setError(`The file is larger than ${MAX_MB} MB.`); return }
    if (preview) URL.revokeObjectURL(preview)
    setFile(f); setPreview(URL.createObjectURL(f))
  }

  const mediaType = file ? (file.type.startsWith("video/") ? "video" : "image") : null
  const toggle = (n) => setForm((f) => ({ ...f, networks: f.networks.includes(n) ? f.networks.filter((x) => x !== n) : [...f.networks, n] }))
  const text = [form.caption.trim(), form.link_url.trim()].filter(Boolean).join("\n\n")
  const problems = form.networks.flatMap((n) => {
    const out = []
    if (text.length > LIMITS[n]) out.push(`${NETWORK_NAMES[n]} allows ${LIMITS[n].toLocaleString()} characters (you have ${text.length}).`)
    if (NEEDS_MEDIA[n] && !(n === "instagram" ? file : mediaType === "video")) out.push(`${NETWORK_NAMES[n]} needs ${NEEDS_MEDIA[n]}.`)
    return out
  })

  async function save(event) {
    event.preventDefault()
    setError("")
    if (!form.title.trim()) { setError("Give the post a short title (only you see it)."); return }
    if (form.mode !== "draft" && !form.networks.length) { setError("Choose at least one network."); return }
    if (form.mode === "schedule" && !form.scheduled_for) { setError("Choose when to post."); return }
    if (form.mode !== "draft" && problems.length) { setError(problems[0]); return }
    if (form.link_url && !/^https:\/\//i.test(form.link_url.trim())) { setError("Links must start with https://"); return }
    setBusy(true)
    try {
      let mediaUrl = null
      if (file) {
        setProgress("Uploading media…")
        const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "")
        const path = `posts/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`
        const { error: upErr } = await supabase.storage.from("social-media").upload(path, file, { contentType: file.type, upsert: false })
        if (upErr) throw new Error(/bucket|not found/i.test(upErr.message) ? "Media storage is not set up yet. Run the Phase 11 SQL." : friendlyError(upErr, "The upload failed. Please try again."))
        mediaUrl = supabase.storage.from("social-media").getPublicUrl(path).data.publicUrl
      }
      setProgress("Saving…")
      const status = form.mode === "draft" ? "draft" : form.mode === "schedule" ? "scheduled" : "draft"
      const { data, error: e } = await supabase.from("social_posts").insert({
        title: form.title.trim(), caption: form.caption.trim(), link_url: form.link_url.trim() || null,
        media_url: mediaUrl, media_type: mediaUrl ? mediaType : null, networks: form.networks, status,
        scheduled_for: form.mode === "schedule" ? new Date(form.scheduled_for).toISOString() : null,
      }).select().single()
      if (e) throw new Error(friendlyError(e, "We could not save the post."))
      setForm(blank); setFile(null); setPreview(""); if (fileInput.current) fileInput.current.value = ""
      onSaved(data, form.mode === "now" && connection.state === "on")
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false); setProgress("")
    }
  }

  return (
    <form className="al-card al-block so-composer" onSubmit={save}>
      <div className="al-block-head"><div><h3>New post</h3><p className="al-muted">A poster or video with a caption and a link back to the site.</p></div></div>
      <div className="so-compose-grid">
        <div className="so-compose-main">
          <label className="al-field"><span>Title (only you see this)</span>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} placeholder="e.g. Pharmacovigilance course launch" />
          </label>
          <label className="al-field"><span>Caption</span>
            <textarea rows={6} value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} maxLength={5000} placeholder="What should people know? Add hashtags like #PharmacyKenya #CPD" />
            <small className="so-count">{text.length} characters with link{form.networks.includes("x") ? ` · X limit 280` : ""}</small>
          </label>
          <label className="al-field"><span>Link</span>
            <input type="url" value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://www.pharmacourse.co.ke/courses/..." />
          </label>
          <div className="al-field"><span>Post to</span>
            <div className="so-nets">
              {POST_NETWORKS.map((n) => {
                const on = form.networks.includes(n)
                const linked = connection.state === "on" && connection.publisher === "ayrshare" ? connection.linked.includes(n) : null
                return (
                  <button key={n} type="button" className={`so-net${on ? " on" : ""}`} aria-pressed={on} onClick={() => toggle(n)} style={{ "--brand": NETWORK_COLORS[n] }}>
                    <BrandIcon network={n} size={16} /> {NETWORK_NAMES[n]}
                    {linked === false ? <small>not linked</small> : null}
                  </button>
                )
              })}
            </div>
          </div>
          {problems.length ? <ul className="so-problems">{problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}
        </div>

        <div className="so-compose-side">
          <span className="so-label">Poster or video</span>
          <div className="so-drop" onClick={() => fileInput.current?.click()} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInput.current?.click() }} role="button" tabIndex={0}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]) }}>
            {preview ? (mediaType === "video" ? <video src={preview} controls muted playsInline /> : <img src={preview} alt="Poster preview" />) : (
              <div className="so-drop-empty"><ImagePlus size={28} aria-hidden="true" /><strong>Add a poster or video</strong><small>JPG, PNG, WebP, MP4 or MOV, up to {MAX_MB} MB. Square or 4:5 works best.</small></div>
            )}
          </div>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
          {file ? <button type="button" className="al-btn" onClick={() => { setFile(null); setPreview(""); if (fileInput.current) fileInput.current.value = "" }}><XIcon size={15} aria-hidden="true" /> Remove media</button> : null}

          <span className="so-label">When</span>
          <div className="al-seg so-when" role="radiogroup" aria-label="When to post">
            {[["now", connection.state === "on" ? "Post now" : "Save"], ["schedule", "Schedule"], ["draft", "Draft"]].map(([k, l]) => (
              <button key={k} type="button" role="radio" aria-checked={form.mode === k} className={form.mode === k ? "active" : ""} onClick={() => setForm({ ...form, mode: k })}>{l}</button>
            ))}
          </div>
          {form.mode === "schedule" ? (
            <label className="al-field"><span>Post at</span><input type="datetime-local" value={form.scheduled_for} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} /></label>
          ) : null}
          {form.mode === "schedule" && connection.state !== "on" ? <p className="al-muted small">Scheduled posts go out automatically once a publishing service is connected.</p> : null}
        </div>
      </div>
      {error ? <p role="alert" className="al-alert">{error}</p> : null}
      <div className="so-compose-foot">
        <span className="al-muted">{progress}</span>
        <button type="submit" className="al-btn primary" disabled={busy}>
          {busy ? <Loader2 size={16} className="wt-spin" aria-hidden="true" /> : form.mode === "schedule" ? <CalendarClock size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
          {busy ? "Working…" : form.mode === "draft" ? "Save draft" : form.mode === "schedule" ? "Schedule post" : connection.state === "on" ? "Publish post" : "Save post"}
        </button>
      </div>
    </form>
  )
}

function Channels() {
  const [rows, setRows] = useState([])
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from("site_social_links").select("*").order("display_order").then(({ data }) => setRows(data || []))
  }, [])
  const update = (network, patch) => setRows((list) => list.map((r) => (r.network === network ? { ...r, ...patch } : r)))

  async function saveAll() {
    setSaving(true); setMessage(""); setError("")
    for (const r of rows) {
      const url = (r.url || "").trim()
      if (url && !/^https:\/\//i.test(url)) { setError(`${NETWORK_NAMES[r.network]}: the link must start with https://`); setSaving(false); return }
    }
    const results = await Promise.all(rows.map((r) => supabase.from("site_social_links").update({ url: (r.url || "").trim() || null, show_in_footer: r.show_in_footer, updated_at: new Date().toISOString() }).eq("network", r.network)))
    setSaving(false)
    const failed = results.find((r) => r.error)
    if (failed) setError(friendlyError(failed.error, "We could not save the channel links."))
    else setMessage("Channel links saved. They show in the site footer.")
  }

  const placeholder = { facebook: "https://facebook.com/yourpage", instagram: "https://instagram.com/yourname", tiktok: "https://tiktok.com/@yourname", linkedin: "https://linkedin.com/company/yourcompany", x: "https://x.com/yourname", youtube: "https://youtube.com/@yourchannel", whatsapp: "https://whatsapp.com/channel/..." }
  return (
    <section className="al-card al-block">
      <div className="al-block-head"><div><h3>Channels</h3><p className="al-muted">Your social pages. Shown as icons in the site footer; auto-posting is connected separately.</p></div></div>
      <div className="so-channels">
        {rows.map((r) => (
          <div key={r.network} className="so-channel" style={{ "--brand": NETWORK_COLORS[r.network] }}>
            <span className="so-channel-icon"><BrandIcon network={r.network} size={18} /></span>
            <label className="al-field"><span>{NETWORK_NAMES[r.network]}</span>
              <input type="url" value={r.url || ""} onChange={(e) => update(r.network, { url: e.target.value })} placeholder={placeholder[r.network]} />
            </label>
            <label className="al-switch" title="Show in footer">
              <input type="checkbox" checked={r.show_in_footer} onChange={(e) => update(r.network, { show_in_footer: e.target.checked })} />
              <span aria-hidden="true" />
              <small>Footer</small>
            </label>
          </div>
        ))}
      </div>
      {error ? <p role="alert" className="al-alert">{error}</p> : null}
      {message ? <p role="status" className="al-alert ok">{message}</p> : null}
      <div><button type="button" className="al-btn primary" onClick={() => void saveAll()} disabled={saving}>{saving ? "Saving…" : "Save channels"}</button></div>
    </section>
  )
}
