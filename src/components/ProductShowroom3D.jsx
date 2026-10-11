import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import remedacareposMark from "../assets/remedacarepos-mark.png"
import remedacarehmisMark from "../assets/remedacarehmis-mark.png"
import "./ProductShowroom3D.css"

const PRODUCTS = [
  {
    key: "learning",
    index: "01 / LEARN",
    kicker: "Professional development",
    title: "Pharmacourse",
    text: "Practical CPD courses, clinical case simulations, and certificates designed for pharmacy professionals.",
    href: "/courses",
    action: "Explore courses",
    mark: "/favicon.svg",
  },
  {
    key: "pos",
    index: "02 / OPERATE",
    kicker: "Pharmacy operations",
    title: "RemedacarePOS",
    text: "Dispensing, inventory, patient requests, claims, and branch operations for pharmacies.",
    href: "/remedacarepos",
    action: "Explore RemedacarePOS",
    mark: remedacareposMark,
  },
  {
    key: "hmis",
    index: "03 / MANAGE CARE",
    kicker: "Hospital management",
    title: "RemedacareHMIS",
    text: "Patient records, clinical departments, reporting, finance, and hospital operations in one HMIS.",
    href: "/remedacarehmis",
    action: "Explore RemedacareHMIS",
    mark: remedacarehmisMark,
  },
]

/**
 * Interactive 3D "Choose what your team needs" section.
 * Pass the heading element as children so the page keeps its own heading animation.
 */
export default function ProductShowroom3D({ badge, subheading, children }) {
  const mountRef = useRef(null)
  const hoverRef = useRef(-1)
  const [hovered, setHovered] = useState(-1)
  const [failed, setFailed] = useState(false)
  const navigate = useNavigate()

  const setHover = useCallback((index) => {
    if (hoverRef.current === index) return
    hoverRef.current = index
    setHovered(index)
  }, [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined
    let cancelled = false
    let dispose

    import("./showroomScene.js")
      .then((scene) => {
        if (cancelled) return
        dispose = scene.createShowroom(mount, {
          hoverRef,
          setHover,
          onOpen: (index) => navigate(PRODUCTS[index].href),
        })
      })
      .catch((error) => {
        console.warn("3D showroom unavailable, showing cards only.", error)
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
      if (dispose) dispose()
    }
  }, [navigate, setHover])

  return (
    <section id="ecosystem" className="showroom">
      <div className="showroom-inner">
        <div className="showroom-header">
          <div>
            {badge && <span className="showroom-badge">{badge}</span>}
            {children}
          </div>
          {subheading && <p>{subheading}</p>}
        </div>

        {!failed && (
          <div className="showroom-stage">
            <div
              ref={mountRef}
              className="showroom-canvas"
              role="img"
              aria-label="Interactive 3D scene: an open book for Pharmacourse, a glass cube holding a capsule for RemedacarePOS, and a connected network for RemedacareHMIS"
            />
            <span className="showroom-hint">Move your mouse · click an object to open it</span>
          </div>
        )}

        <div className="showroom-cards">
          {PRODUCTS.map((product, i) => (
            <article
              key={product.key}
              className={`showroom-card showroom-card-${product.key} ${hovered === i ? "is-active" : ""}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(-1)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(-1)}
            >
              <div className="showroom-card-top">
                <span>{product.index}</span>
                <img src={product.mark} alt="" />
              </div>
              <p className="showroom-kicker">{product.kicker}</p>
              <h3>{product.title}</h3>
              <p className="showroom-text">{product.text}</p>
              <Link to={product.href} className="showroom-link">
                {product.action} <ChevronRight size={16} />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
