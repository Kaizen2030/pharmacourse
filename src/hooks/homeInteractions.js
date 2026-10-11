const TILT_TARGETS = [
  ".feature-card",
  ".course-card",
  ".blog-preview-card",
  ".testimonial-card",
  ".faq-card",
  ".product-visual",
  ".pos-status-card",
  ".product-showroom-card",
]

const REVEAL_TARGETS = [
  ".feature-card",
  ".course-card",
  ".blog-preview-card",
  ".testimonial-card",
  ".faq-card",
  ".product-showroom-card",
  ".product-features > *",
]

function isCarouselItem(element) {
  return Boolean(element.closest(".mobile-carousel-track"))
}

export function initializeHomeInteractions(root) {
  if (!root) return () => {}

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)")
  const progress = document.createElement("div")
  progress.className = "home-scroll-progress"
  progress.setAttribute("aria-hidden", "true")
  document.body.append(progress)

  let revealObserver
  let isDestroyed = false

  const updateScroll = () => {
    if (isDestroyed) return
    const scrollable = document.documentElement.scrollHeight - window.innerHeight
    const amount = scrollable > 0 ? window.scrollY / scrollable : 0
    progress.style.transform = `scaleX(${Math.max(0, Math.min(1, amount))})`

    const offset = Math.min(window.scrollY * 0.08, 150)
    root.style.setProperty("--home-scroll-offset", `${offset}px`)
  }

  const resetTilt = (target) => {
    target.style.setProperty("--home-tilt-x", "0deg")
    target.style.setProperty("--home-tilt-y", "0deg")
    target.style.setProperty("--home-pointer-x", "50%")
    target.style.setProperty("--home-pointer-y", "50%")
  }

  const handlePointerMove = (event) => {
    if (reducedMotion.matches || !finePointer.matches || event.pointerType !== "mouse") return

    const target = event.target.closest(TILT_TARGETS.join(","))
    if (target && root.contains(target)) {
      const bounds = target.getBoundingClientRect()
      const x = (event.clientX - bounds.left) / bounds.width
      const y = (event.clientY - bounds.top) / bounds.height
      target.style.setProperty("--home-tilt-x", `${((0.5 - y) * 7).toFixed(2)}deg`)
      target.style.setProperty("--home-tilt-y", `${((x - 0.5) * 9).toFixed(2)}deg`)
      target.style.setProperty("--home-pointer-x", `${(x * 100).toFixed(1)}%`)
      target.style.setProperty("--home-pointer-y", `${(y * 100).toFixed(1)}%`)
    }

    const spotlight = event.target.closest(".hero-section, .cta-section")
    if (spotlight && root.contains(spotlight)) {
      const bounds = spotlight.getBoundingClientRect()
      spotlight.style.setProperty("--home-spotlight-x", `${event.clientX - bounds.left}px`)
      spotlight.style.setProperty("--home-spotlight-y", `${event.clientY - bounds.top}px`)
    }

    const button = event.target.closest(".btn-primary, .btn-secondary, .btn-whatsapp")
    if (button && root.contains(button)) {
      const bounds = button.getBoundingClientRect()
      button.style.setProperty("--home-magnetic-x", `${((event.clientX - bounds.left) / bounds.width - 0.5) * 7}px`)
      button.style.setProperty("--home-magnetic-y", `${((event.clientY - bounds.top) / bounds.height - 0.5) * 6}px`)
    }
  }

  const handlePointerOut = (event) => {
    const target = event.target.closest(TILT_TARGETS.join(","))
    if (target && root.contains(target) && !target.contains(event.relatedTarget)) resetTilt(target)

    const button = event.target.closest(".btn-primary, .btn-secondary, .btn-whatsapp")
    if (button && root.contains(button) && !button.contains(event.relatedTarget)) {
      button.style.setProperty("--home-magnetic-x", "0px")
      button.style.setProperty("--home-magnetic-y", "0px")
    }
  }

  const revealCards = () => {
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches
    const targets = root.querySelectorAll(REVEAL_TARGETS.join(","))
    targets.forEach((target, index) => {
      if (coarsePointer && isCarouselItem(target)) return
      if (target.classList.contains("home-reveal-item")) return
      target.classList.add("home-reveal-item")
      target.style.setProperty("--home-reveal-delay", `${Math.min(index % 5, 4) * 65}ms`)
      revealObserver.observe(target)
    })
  }

  const syncMotionPreferences = () => {
    root.classList.toggle("home-motion-enabled", !reducedMotion.matches)
    root.classList.toggle("home-pointer-enabled", !reducedMotion.matches && finePointer.matches)

    if (reducedMotion.matches) {
      root.querySelectorAll(".home-reveal-item").forEach((target) => target.classList.add("is-revealed"))
      revealObserver.disconnect()
    } else {
      revealCards()
    }
  }

  const contentObserver = new MutationObserver(() => {
    if (!reducedMotion.matches) revealCards()
  })
  contentObserver.observe(root, { childList: true, subtree: true })

  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      entry.target.classList.add("is-revealed")
      revealObserver.unobserve(entry.target)
    })
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" })

  root.addEventListener("pointermove", handlePointerMove, { passive: true })
  root.addEventListener("pointerout", handlePointerOut, { passive: true })
  window.addEventListener("scroll", updateScroll, { passive: true })
  window.addEventListener("resize", updateScroll, { passive: true })
  reducedMotion.addEventListener("change", syncMotionPreferences)
  finePointer.addEventListener("change", syncMotionPreferences)
  syncMotionPreferences()
  updateScroll()

  return () => {
    isDestroyed = true
    root.removeEventListener("pointermove", handlePointerMove)
    root.removeEventListener("pointerout", handlePointerOut)
    window.removeEventListener("scroll", updateScroll)
    window.removeEventListener("resize", updateScroll)
    reducedMotion.removeEventListener("change", syncMotionPreferences)
    finePointer.removeEventListener("change", syncMotionPreferences)
    contentObserver.disconnect()
    revealObserver.disconnect()
    progress.remove()
    root.classList.remove("home-motion-enabled", "home-pointer-enabled")
    root.style.removeProperty("--home-scroll-offset")
  }
}