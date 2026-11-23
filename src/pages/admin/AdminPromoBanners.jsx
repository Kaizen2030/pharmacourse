import { useEffect, useRef, useState } from "react"
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Plus, RefreshCw, RotateCcw, Save, Trash2, Upload } from "lucide-react"
import { supabase } from "../../lib/supabaseClient"
import {
  DEFAULT_PROMO_SLIDES,
  PROMO_SECTION_KEY,
  PROMO_STORAGE_BUCKET,
  parsePromoSlides,
  promoImageSrc,
  resolvePromoLink,
  serializePromoSlides,
} from "../../lib/promoBanners"
import "./admin-promo-banners.css"

const QUICK_LINKS = [
  { label: "RemedacarePOS page", url: "/remedacarepos" },
  { label: "RemedacareHMIS page", url: "/remedacarehmis" },
  { label: "All courses", url: "/courses" },
  { label: "Tutor studio (join as tutor)", url: "/tutor" },
  { label: "Register", url: "/register" },
  { label: "Workshops", url: "/workshops" },
]

function newId() {
  return `slide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export default function AdminPromoBanners() {
  const [slides, setSlides] = useState(DEFAULT_PROMO_SLIDES)
  const [enabled, setEnabled] = useState(true)
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [uploadingId, setUploadingId] = useState(null)
  const [message, setMessage] = useState(null)
  const fileInputs = useRef({})

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [row, courseList] = await Promise.all([
      supabase.from("homepage_content").select("enabled, body").eq("section_key", PROMO_SECTION_KEY).maybeSingle(),
      supabase.from("courses").select("id, slug, title, is_published").order("title"),
    ])
    if (row.data) {
      setEnabled(row.data.enabled !== false)
      setSlides(parsePromoSlides(row.data.body) || DEFAULT_PROMO_SLIDES)
    } else {
      setEnabled(true)
      setSlides(DEFAULT_PROMO_SLIDES)
    }
    setCourses(courseList.data || [])
    setDirty(false)
    setLoading(false)
  }

  function flash(type, text) {
    setMessage({ type, text })
    window.setTimeout(() => setMessage(null), 3500)
  }

  function update(id, patch) {
    setSlides((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    setDirty(true)
  }

  function move(id, delta) {
    setSlides((list) => {
      const i = list.findIndex((s) => s.id === id)
      const j = i + delta
      if (i < 0 || j < 0 || j >= list.length) return list
      const next = [...list]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
    setDirty(true)
  }

  function remove(id) {
    if (!window.confirm("Remove this poster from the carousel?")) return
    setSlides((list) => list.filter((s) => s.id !== id))
    setDirty(true)
  }

  function addSlide() {
    const id = newId()
    setSlides((list) => [...list, { id, image_url: "", alt: "", link_url: "/courses", course_match: "", enabled: true }])
    setDirty(true)
    window.setTimeout(() => fileInputs.current[id]?.click(), 0)
  }

  async function upload(id, file) {
    if (!file) return
    if (!file.type.startsWith("image/")) { flash("error", "Please choose an image file."); return }
    if (file.size > 5 * 1024 * 1024) { flash("error", "Image is over 5 MB. Use a smaller version (around 640×640 works best)."); return }
    setUploadingId(id)
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase()
    const path = `promo/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabase.storage.from(PROMO_STORAGE_BUCKET).upload(path, file, { upsert: true, contentType: file.type })
    if (error) {
      flash("error", `Upload failed: ${error.message}`)
    } else {
      const { data } = supabase.storage.from(PROMO_STORAGE_BUCKET).getPublicUrl(path)
      update(id, { image_url: data.publicUrl })
      flash("success", "Image uploaded. Click Save to publish.")
    }
    setUploadingId(null)
  }

  async function save(nextEnabled = enabled) {
    const missing = slides.filter((s) => !s.image_url)
    if (missing.length) { flash("error", "Every poster needs an image. Upload one or remove the empty card."); return }
    setSaving(true)
    const { error } = await supabase.from("homepage_content").upsert(
      {
        section_key: PROMO_SECTION_KEY,
        section_name: "Poster Ads Carousel",
        order_index: 1,
        enabled: nextEnabled,
        heading: "Poster ads",
        body: serializePromoSlides(slides),
      },
      { onConflict: "section_key" }
    )
    setSaving(false)
    if (error) { flash("error", `Save failed: ${error.message}`); return }
    setEnabled(nextEnabled)
    setDirty(false)
    flash("success", "Poster ads saved. They are live on the homepage.")
  }

  function resetDefaults() {
    if (!window.confirm("Replace the list with the original 12 posters? Your uploads stay in storage but leave the carousel.")) return
    setSlides(DEFAULT_PROMO_SLIDES)
    setDirty(true)
  }

  function linkMode(slide) {
    if (slide.course_match) return "auto"
    if (courses.some((c) => slide.link_url === `/courses/${c.slug || c.id}`)) return "course"
    return "custom"
  }

  return (
    <div className="promo-admin">
      {message && <div className={`toast toast-${message.type}`}>{message.text}</div>}

      <div className="promo-admin-head">
        <div>
          <h3>Poster Ads Carousel</h3>
          <p>
            Sliding posters under the homepage hero. They play in this order; each one opens its link when clicked.
            Square images look best (e.g. 640×640).
          </p>
        </div>
        <div className="promo-admin-actions">
          <button type="button" className="btn-secondary" onClick={() => save(!enabled)} disabled={saving || loading}>
            {enabled ? <><EyeOff size={14} /> Hide carousel</> : <><Eye size={14} /> Show carousel</>}
          </button>
          <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={14} /> Reload
          </button>
          <button type="button" className="btn-secondary" onClick={resetDefaults}>
            <RotateCcw size={14} /> Original posters
          </button>
          <button type="button" className="btn-primary" onClick={() => save()} disabled={saving || !dirty}>
            <Save size={14} /> {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </button>
        </div>
      </div>

      {!enabled && <p className="promo-admin-note">The carousel is hidden on the homepage.</p>}

      {loading ? (
        <p className="promo-admin-note"><RefreshCw size={14} className="spin" /> Loading posters…</p>
      ) : (
        <div className="promo-admin-grid">
          {slides.map((slide, i) => {
            const mode = linkMode(slide)
            const src = promoImageSrc(slide.image_url)
            return (
              <div key={slide.id} className={`promo-admin-card${slide.enabled === false ? " is-off" : ""}`}>
                <div className="promo-admin-thumb">
                  {src ? <img src={src} alt={slide.alt || ""} /> : <div className="promo-admin-empty"><ImagePlus size={28} /></div>}
                  <span className="promo-admin-pos">{i + 1}</span>
                  <button
                    type="button"
                    className="promo-admin-replace"
                    onClick={() => fileInputs.current[slide.id]?.click()}
                    disabled={uploadingId === slide.id}
                  >
                    <Upload size={14} /> {uploadingId === slide.id ? "Uploading…" : src ? "Change image" : "Upload image"}
                  </button>
                  <input
                    ref={(el) => { fileInputs.current[slide.id] = el }}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => { upload(slide.id, e.target.files?.[0]); e.target.value = "" }}
                  />
                </div>

                <div className="promo-admin-fields">
                  <label>
                    <span>Description (for screen readers)</span>
                    <input value={slide.alt} onChange={(e) => update(slide.id, { alt: e.target.value })} placeholder="e.g. NCD Masterclass – coming soon" />
                  </label>

                  <label>
                    <span>When clicked, open</span>
                    <select
                      value={mode === "course" ? slide.link_url : mode}
                      onChange={(e) => {
                        const v = e.target.value
                        if (v === "custom") update(slide.id, { course_match: "", link_url: slide.link_url || "/courses" })
                        else if (v === "auto") update(slide.id, { course_match: slide.course_match || slide.alt.split(/[–-]/)[0].trim().toLowerCase(), link_url: "/courses" })
                        else update(slide.id, { course_match: "", link_url: v })
                      }}
                    >
                      <option value="custom">A page or link…</option>
                      <option value="auto">Course matching a word in its title…</option>
                      <optgroup label="A specific course">
                        {courses.map((c) => (
                          <option key={c.id} value={`/courses/${c.slug || c.id}`}>
                            {c.title}{c.is_published ? "" : " (unpublished)"}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </label>

                  {mode === "custom" && (
                    <label>
                      <span>Link</span>
                      <input
                        list="promo-quick-links"
                        value={slide.link_url}
                        onChange={(e) => update(slide.id, { link_url: e.target.value })}
                        placeholder="/courses or https://…"
                      />
                    </label>
                  )}

                  {mode === "auto" && (
                    <label>
                      <span>Title word</span>
                      <input value={slide.course_match} onChange={(e) => update(slide.id, { course_match: e.target.value })} placeholder="e.g. antibiogram" />
                      <small>Opens: {resolvePromoLink(slide, courses.filter((c) => c.is_published))}</small>
                    </label>
                  )}
                </div>

                <div className="promo-admin-row-actions">
                  <button type="button" className="btn-icon" title="Move earlier" onClick={() => move(slide.id, -1)} disabled={i === 0}><ArrowUp size={15} /></button>
                  <button type="button" className="btn-icon" title="Move later" onClick={() => move(slide.id, 1)} disabled={i === slides.length - 1}><ArrowDown size={15} /></button>
                  <button
                    type="button"
                    className="btn-icon"
                    title={slide.enabled === false ? "Show this poster" : "Hide this poster"}
                    onClick={() => update(slide.id, { enabled: slide.enabled === false })}
                  >
                    {slide.enabled === false ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button type="button" className="btn-icon danger" title="Remove" onClick={() => remove(slide.id)}><Trash2 size={15} /></button>
                </div>
              </div>
            )
          })}

          <button type="button" className="promo-admin-add" onClick={addSlide}>
            <Plus size={22} />
            Add poster
          </button>
        </div>
      )}

      <datalist id="promo-quick-links">
        {QUICK_LINKS.map((l) => <option key={l.url} value={l.url}>{l.label}</option>)}
      </datalist>
    </div>
  )
}
