/**
 * Framework-free "3D feel" layer for the homepage.
 * - scroll progress bar + scroll depth variable (--sp, --sy)
 * - 3D tilt + glare on cards (mouse only)
 * - magnetic buttons (mouse only)
 * - cursor spotlight + drifting aurora in hero / CTA (mouse only)
 * - 3D scroll-reveal for cards (all devices, skipped for reduced motion)
 * Everything is added through classes / CSS variables, so no JSX has to change.
 */

const TILT = ".feature-card, .course-card, .blog-preview-card, .testimonial-card, .showroom-card"
const MAGNET = ".btn-primary, .btn-secondary, .btn-whatsapp, .showroom-link"
const REVEAL = ".feature-card, .course-card, .blog-preview-card, .testimonial-card, .faq-card, .showroom-card"
const SPOT_SECTIONS = ".hero-section, .cta-section"

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

export function setupHomeInteractions(root, win = window) {
  const doc = win.document
  const reduced = win.matchMedia("(prefers-reduced-motion: reduce)").matches
  const finePointer = win.matchMedia("(hover: hover) and (pointer: fine)").matches
  const cleanups = []
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts)
    cleanups.push(() => target.removeEventListener(type, fn, opts))
  }

  /* ---- scroll progress + depth ---- */
  const bar = doc.createElement("div")
  bar.className = "home-progress"
  bar.setAttribute("aria-hidden", "true")
  root.appendChild(bar)
  cleanups.push(() => bar.remove())

  let scrollTick = 0
  const onScroll = () => {
    if (scrollTick) return
    scrollTick = win.requestAnimationFrame(() => {
      scrollTick = 0
      const max = doc.documentElement.scrollHeight - win.innerHeight
      root.style.setProperty("--sp", max > 0 ? (win.scrollY / max).toFixed(4) : "0")
      root.style.setProperty("--sy", Math.round(win.scrollY).toString())
    })
  }
  on(win, "scroll", onScroll, { passive: true })
  onScroll()

  /* ---- 3D scroll reveal ---- */
  let io = null
  let mo = null
  if (!reduced && "IntersectionObserver" in win) {
    io = new win.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const el = entry.target
          io.unobserve(el)
          el.classList.add("is-in")
          const delay = 1100 + Number(el.style.getPropertyValue("--rv-i") || 0) * 70
          win.setTimeout(() => {
            el.classList.remove("reveal-3d", "is-in")
            el.style.removeProperty("--rv-i")
          }, delay)
        })
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    )
    const mark = (el) => {
      if (el.dataset.rv) return
      if (win.innerWidth < 900 && el.closest(".mobile-carousel-track")) {
        el.dataset.rv = "skip"
        return
      }
      el.dataset.rv = "1"
      const siblings = el.parentElement ? Array.from(el.parentElement.children) : []
      el.style.setProperty("--rv-i", String(Math.min(Math.max(siblings.indexOf(el), 0), 6)))
      el.classList.add("reveal-3d")
      io.observe(el)
    }
    const scan = () => root.querySelectorAll(REVEAL).forEach(mark)
    scan()
    let scanTick = 0
    mo = new win.MutationObserver(() => {
      if (scanTick) return
      scanTick = win.requestAnimationFrame(() => {
        scanTick = 0
        scan()
        if (finePointer) addSpotLayers()
      })
    })
    mo.observe(root, { childList: true, subtree: true })
    cleanups.push(() => { io.disconnect(); mo.disconnect() })
  }

  /* ---- mouse-only effects ---- */
  function addSpotLayers() {
    root.querySelectorAll(SPOT_SECTIONS).forEach((section) => {
      if (section.querySelector(":scope > .spot-layer")) return
      const layer = doc.createElement("div")
      layer.className = "spot-layer"
      layer.setAttribute("aria-hidden", "true")
      layer.innerHTML = "<i></i><i></i><i></i>"
      section.prepend(layer)
    })
  }

  if (finePointer && !reduced) {
    addSpotLayers()

    let tiltEl = null
    let magEl = null
    let last = null
    let moveTick = 0
    const glared = new WeakSet()

    const prepareTilt = (el) => {
      el.classList.add("tilt-3d", "is-tilting")
      if (!glared.has(el)) {
        glared.add(el)
        if (win.getComputedStyle(el).position === "static") el.style.position = "relative"
        const glare = doc.createElement("span")
        glare.className = "tilt-glare"
        glare.setAttribute("aria-hidden", "true")
        el.appendChild(glare)
      }
    }
    const releaseTilt = (el) => {
      if (!el) return
      el.classList.remove("is-tilting")
      el.style.removeProperty("--tilt-x")
      el.style.removeProperty("--tilt-y")
    }
    const releaseMagnet = (el) => {
      if (!el) return
      el.classList.add("mag-release")
      el.style.removeProperty("--mag-x")
      el.style.removeProperty("--mag-y")
      win.setTimeout(() => el.classList.remove("mag-release", "magnetic"), 420)
    }

    const apply = () => {
      moveTick = 0
      if (!last) return
      const { clientX, clientY } = last
      if (tiltEl) {
        const r = tiltEl.getBoundingClientRect()
        const px = clamp((clientX - r.left) / r.width, 0, 1)
        const py = clamp((clientY - r.top) / r.height, 0, 1)
        tiltEl.style.setProperty("--tilt-x", `${((0.5 - py) * 10).toFixed(2)}deg`)
        tiltEl.style.setProperty("--tilt-y", `${((px - 0.5) * 12).toFixed(2)}deg`)
        tiltEl.style.setProperty("--glare-x", `${(px * 100).toFixed(1)}%`)
        tiltEl.style.setProperty("--glare-y", `${(py * 100).toFixed(1)}%`)
      }
      if (magEl) {
        const r = magEl.getBoundingClientRect()
        const dx = clamp((clientX - (r.left + r.width / 2)) / (r.width / 2), -1, 1)
        const dy = clamp((clientY - (r.top + r.height / 2)) / (r.height / 2), -1, 1)
        magEl.style.setProperty("--mag-x", `${(dx * 7).toFixed(1)}px`)
        magEl.style.setProperty("--mag-y", `${(dy * 5).toFixed(1)}px`)
      }
      const section = last.target.closest?.(SPOT_SECTIONS)
      if (section) {
        const r = section.getBoundingClientRect()
        section.style.setProperty("--mx", `${clientX - r.left}px`)
        section.style.setProperty("--my", `${clientY - r.top}px`)
      }
    }

    on(root, "pointermove", (e) => {
      if (e.pointerType && e.pointerType !== "mouse") return
      const nextTilt = e.target.closest?.(TILT) || null
      if (nextTilt !== tiltEl) {
        releaseTilt(tiltEl)
        tiltEl = nextTilt
        if (tiltEl) prepareTilt(tiltEl)
      }
      const nextMag = e.target.closest?.(MAGNET) || null
      if (nextMag !== magEl) {
        releaseMagnet(magEl)
        magEl = nextMag
        if (magEl) magEl.classList.add("magnetic")
      }
      last = e
      if (!moveTick) moveTick = win.requestAnimationFrame(apply)
    })
    on(root, "pointerleave", () => {
      releaseTilt(tiltEl)
      releaseMagnet(magEl)
      tiltEl = null
      magEl = null
    })
    cleanups.push(() => { if (moveTick) win.cancelAnimationFrame(moveTick) })
    cleanups.push(() => {
      root.querySelectorAll(".spot-layer, .tilt-glare").forEach((n) => n.remove())
      root.querySelectorAll(".tilt-3d").forEach((n) => n.classList.remove("tilt-3d", "is-tilting"))
    })
  }

  return () => {
    if (scrollTick) win.cancelAnimationFrame(scrollTick)
    cleanups.reverse().forEach((fn) => fn())
  }
}
