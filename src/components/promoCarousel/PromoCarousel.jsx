import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { supabase } from "../../lib/supabaseClient"
import {
  DEFAULT_PROMO_SLIDES,
  PROMO_SECTION_KEY,
  parsePromoSlides,
  promoImageSrc,
  resolvePromoLink,
} from "../../lib/promoBanners"
import "./PromoCarousel.css"

const AUTOPLAY_MS = 3800
const SLIDE_MS = 650

function isExternal(url) {
  return /^https?:\/\//i.test(url) || url.startsWith("mailto:") || url.startsWith("tel:")
}

function PromoCard({ slide, href, index, isActive }) {
  const content = (
    <>
      <img
        src={promoImageSrc(slide.image_url)}
        alt={slide.alt || "Promotion"}
        width="640"
        height="640"
        loading={index < 5 ? "eager" : "lazy"}
        decoding="async"
        draggable="false"
      />
      <span className="promo-card-shine" aria-hidden="true" />
    </>
  )
  const className = `promo-card${isActive ? " is-active" : ""}`
  const tabIndex = index < 0 ? -1 : undefined
  const hidden = index < 0 ? true : undefined

  if (isExternal(href)) {
    return (
      <a className={className} href={href} target="_blank" rel="noreferrer noopener" tabIndex={tabIndex} aria-hidden={hidden}>
        {content}
      </a>
    )
  }
  return (
    <Link className={className} to={href} tabIndex={tabIndex} aria-hidden={hidden}>
      {content}
    </Link>
  )
}

export default function PromoCarousel() {
  const [slides, setSlides] = useState(DEFAULT_PROMO_SLIDES)
  const [visible, setVisible] = useState(true)
  const [courses, setCourses] = useState([])
  const [index, setIndex] = useState(0)
  const [animate, setAnimate] = useState(true)
  const [paused, setPaused] = useState(false)
  const [step, setStep] = useState(0)
  const trackRef = useRef(null)
  const dragRef = useRef(null)
  const suppressClickRef = useRef(false)
  const [reduceMotion] = useState(
    () => typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
  )

  useEffect(() => {
    let active = true
    supabase
      .from("homepage_content")
      .select("enabled, body")
      .eq("section_key", PROMO_SECTION_KEY)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active || error || !data) return
        setVisible(data.enabled !== false)
        const parsed = parsePromoSlides(data.body)
        if (parsed?.length) setSlides(parsed)
      })
    supabase
      .from("courses")
      .select("id, slug, title")
      .eq("is_published", true)
      .then(({ data }) => { if (active && data) setCourses(data) })
    return () => { active = false }
  }, [])

  const live = useMemo(() => slides.filter((s) => s.enabled !== false), [slides])
  const count = live.length
  // Slides are repeated so the strip can loop forever without a visible jump,
  // with enough copies to fill the view even when only a few posters are live.
  const strip = useMemo(() => {
    if (count < 2) return live
    const copies = Math.max(2, Math.ceil((count + 5) / count))
    return Array.from({ length: copies }, () => live).flat()
  }, [live, count])

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return undefined
    const measure = () => {
      const first = track.children[0]
      const second = track.children[1]
      if (first && second) setStep(second.offsetLeft - first.offsetLeft)
      else if (first) setStep(first.offsetWidth)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(track)
    return () => observer.disconnect()
  }, [strip.length])

  const indexRef = useRef(0)
  useEffect(() => { indexRef.current = index }, [index])

  const go = useCallback((delta) => {
    if (count < 2) return
    const current = indexRef.current
    if (reduceMotion) {
      setIndex((((current + delta) % count) + count) % count)
      return
    }
    if (delta < 0 && current === 0) {
      // Jump to the cloned copy of slide 1 without animating, then slide back one.
      setAnimate(false)
      setIndex(count)
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setAnimate(true)
        setIndex(count - 1)
      }))
      return
    }
    setAnimate(true)
    setIndex(Math.min(current + delta, count))
  }, [count, reduceMotion])

  useEffect(() => {
    if (paused || reduceMotion || count < 2) return undefined
    const timer = window.setInterval(() => go(1), AUTOPLAY_MS)
    return () => window.clearInterval(timer)
  }, [paused, reduceMotion, count, go])

  function onTransitionEnd(event) {
    if (event.target !== trackRef.current || event.propertyName !== "transform") return
    if (indexRef.current >= count) {
      // Landed on the cloned first slide: snap back to the real one invisibly.
      setAnimate(false)
      setIndex(indexRef.current - count)
    }
  }

  useEffect(() => {
    if (animate) return undefined
    let inner = 0
    const outer = requestAnimationFrame(() => { inner = requestAnimationFrame(() => setAnimate(true)) })
    return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner) }
  }, [animate])

  function onPointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return
    dragRef.current = { x: event.clientX, y: event.clientY, dx: 0, moved: false }
    suppressClickRef.current = false
    if (event.pointerType !== "mouse") setPaused(true)
  }

  function onPointerMove(event) {
    const drag = dragRef.current
    if (!drag) return
    drag.dx = event.clientX - drag.x
    if (Math.abs(drag.dx) > 8 && Math.abs(drag.dx) > Math.abs(event.clientY - drag.y)) drag.moved = true
  }

  function onPointerUp(event) {
    const drag = dragRef.current
    dragRef.current = null
    if (event.pointerType !== "mouse") setPaused(false)
    if (!drag?.moved) return
    suppressClickRef.current = true
    if (drag.dx < -40) go(1)
    else if (drag.dx > 40) go(-1)
  }

  function onClickCapture(event) {
    // A swipe should not also open the poster underneath.
    if (suppressClickRef.current) {
      event.preventDefault()
      suppressClickRef.current = false
    }
  }

  if (!visible || count === 0) return null

  const activeDot = index % count

  return (
    <section className="promo-carousel" aria-roledescription="carousel" aria-label="Featured products and courses">
      <div className="container">
        <div
          className="promo-viewport"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => { setPaused(false); dragRef.current = null }}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { dragRef.current = null; setPaused(false) }}
          onClickCapture={onClickCapture}
        >
          <div
            className="promo-track"
            ref={trackRef}
            onTransitionEnd={onTransitionEnd}
            style={{
              transform: `translate3d(${-index * step}px, 0, 0)`,
              transition: animate && !reduceMotion ? `transform ${SLIDE_MS}ms cubic-bezier(.22,.8,.24,1)` : "none",
            }}
          >
            {strip.map((slide, i) => (
              <div className="promo-slide" key={`${slide.id}-${i}`} role="group" aria-label={`${(i % count) + 1} of ${count}`}>
                <PromoCard
                  slide={slide}
                  href={resolvePromoLink(slide, courses)}
                  index={i < count ? i : -1}
                  isActive={i % count === activeDot}
                />
              </div>
            ))}
          </div>

          {count > 1 && (
            <>
              <button type="button" className="promo-arrow prev" aria-label="Previous poster" onClick={() => go(-1)}>
                <ChevronLeft size={22} />
              </button>
              <button type="button" className="promo-arrow next" aria-label="Next poster" onClick={() => go(1)}>
                <ChevronRight size={22} />
              </button>
            </>
          )}
        </div>

        {count > 1 && (
          <div className="promo-dots" role="tablist" aria-label="Choose poster">
            {live.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={i === activeDot}
                aria-label={`Go to poster ${i + 1}`}
                className={`promo-dot${i === activeDot ? " active" : ""}`}
                onClick={() => { setAnimate(true); setIndex(i) }}
              >
                {i === activeDot && !paused && !reduceMotion && (
                  <span key={index} className="promo-dot-fill" style={{ animationDuration: `${AUTOPLAY_MS}ms` }} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
