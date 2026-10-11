import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import "./ProductShowroom3D.css"

const PRODUCT_ITEMS = [
  {
    key: "pharmacourse",
    title: "Pharmacourse",
    label: "Learn",
    description: "CPD learning, clinical cases, and on-the-job practice for pharmacy teams.",
    href: "/courses",
  },
  {
    key: "pos",
    title: "RemedacarePOS",
    label: "Operate",
    description: "Dispensing, inventory, and pharmacy operations in one connected workflow.",
    href: "/remedacarepos",
  },
  {
    key: "hmis",
    title: "RemedacareHMIS",
    label: "Manage care",
    description: "Hospital records, reporting, departments, and patient flow in one view.",
    href: "/remedacarehmis",
  },
]

export default function ProductShowroom3D() {
  const [activeProduct, setActiveProduct] = useState(null)
  const [renderFailed, setRenderFailed] = useState(false)
  const activeProductRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    let cleanup = () => {}

    const loadScene = async () => {
      const canvas = document.querySelector(".product-showroom-canvas")
      if (!canvas) {
        return undefined
      }

      if (!window.WebGLRenderingContext) {
        setRenderFailed(true)
        return undefined
      }

      let cleanup = () => {}

      try {
        const { createShowroomScene } = await import("./showroomScene")
        if (cancelled) return undefined
        cleanup = createShowroomScene({
          canvas,
          reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
          activeProductRef,
          onHoverChange: (key) => {
            activeProductRef.current = key
            setActiveProduct(key)
          },
          onSelect: (route) => navigate(route),
        })
      } catch (error) {
        console.warn("ProductShowroom3D rendering failed.", error)
        if (!cancelled) setRenderFailed(true)
        return undefined
      }

      return cleanup
    }

    loadScene().then((result) => {
      if (typeof result !== "function") return
      if (cancelled) result()
      else cleanup = result
    })

    return () => {
      cancelled = true
      cleanup()
    }
  }, [navigate])

  const updateActiveProduct = (key) => {
    activeProductRef.current = key
    setActiveProduct(key)
  }

  return (
    <section className="product-showroom-3d" aria-label="Three product showroom">
      <div className="product-showroom-head">
        <div>
          <span className="section-badge">Three products</span>
          <h2>One connected care ecosystem.</h2>
        </div>
        <p>
          Pharmacourse helps teams learn. RemedacarePOS keeps pharmacies moving. RemedacareHMIS keeps
          hospitals connected.
        </p>
      </div>

      {!renderFailed ? (
        <div className="product-showroom-stage">
          <canvas className="product-showroom-canvas" aria-label="Interactive product scene" />
        </div>
      ) : null}

      <div className="product-showroom-cards" aria-live="polite">
        {PRODUCT_ITEMS.map((item) => {
          const isActive = activeProduct === item.key

          return (
            <Link
              key={item.key}
              to={item.href}
              className={`product-showroom-card ${isActive ? "is-active" : ""}`}
              onMouseEnter={() => updateActiveProduct(item.key)}
              onFocus={() => updateActiveProduct(item.key)}
              onMouseLeave={() => updateActiveProduct(null)}
              onBlur={() => updateActiveProduct(null)}
            >
              <span className="product-showroom-card-label">{item.label}</span>
              <strong>{item.title}</strong>
              <span className="product-showroom-card-copy">{item.description}</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
