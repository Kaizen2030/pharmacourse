import { Fragment, useEffect, useState, useRef } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { useInView } from "framer-motion"
import SEO from "../components/SEO"
import BlogEngagementStats from "../components/BlogEngagementStats"
import ThreeProductScroll from "../components/ThreeProductScroll"
import { SITE_URL } from "../lib/siteConfig"
import { formatBlogDate, getBlogCategoryLabel, getBlogCoverFallback, getBlogExcerpt } from "../lib/blogHelpers"
import pharmacyosDashboard from "../assets/pharmacyos-dashboard.svg"
import pharmacourseHeroVisual from "../assets/pharmacourse-hero-visual.svg"
import remedacarehmisMark from "../assets/remedacarehmis-mark.png"
import remedacareposMark from "../assets/remedacarepos-mark.png"
import remedacareDashboard from "../assets/remedacare-dashboard.svg"
import {
  BookOpen,
  Download,
  Award,
  ShoppingCart,
  Package,
  AlertTriangle,
  Building2,
  ClipboardList,
  CreditCard,
  BarChart3,
  Users,
  Link2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import "./Home.css"

const WHATSAPP = "https://wa.me/254790059584?text=Hi%20Julius%2C%20I%27d%20like%20to%20book%20a%20demo%20of%20your%20platform."
const HERO_ART_MODES = ["learn", "practice", "care"]

const HOMEPAGE_BRAND_REPLACEMENTS = [
  { pattern: /RemedacareHMS/g, replacement: "RemedacareHMIS" },
  { pattern: /RemedacareOS/g, replacement: "RemedacareHMIS" },
  { pattern: /\bPharmacyOS\b/g, replacement: "RemedacarePOS" },
]

const DEFAULT_SECTIONS = {
  hero: {
    enabled: true,
    order: 1,
    heading: "Better learning. Smarter pharmacy. Stronger hospitals.",
    subheading: "Learn and grow with Pharmacourse. Run your pharmacy with RemedacarePOS. Manage hospital operations with RemedacareHMIS.",
    badge_text: "Three distinct products",
    primary_btn_text: "Explore Products",
    primary_btn_url: "#ecosystem",
    secondary_btn_text: "Start Learning",
    secondary_btn_url: "/courses",
    video_url: "/images/pharmacourse-demo.mp4",
  },
  ecosystem: {
    enabled: true,
    order: 2,
    heading: "Choose what your team needs.",
    subheading: "Learn. Run a pharmacy. Manage hospital care.",
    badge_text: "Our products",
  },
  pharmacyOS: {
    enabled: true,
    order: 3,
    heading: "Run your pharmacy with confidence.",
    subheading: "Built for Kenyan pharmacies with telepharmacy, dispensing, inventory, claims, delivery coordination, M-Pesa, eTIMS/KRA, and PPB control in one workflow.",
    badge_text: "RemedacarePOS",
    primary_btn_text: "Book a Demo",
    primary_btn_url: WHATSAPP,
    video_url: "/images/pharmacyos-demo.mp4",
  },
  remedacareOS: {
    enabled: true,
    order: 4,
    heading: "A complete hospital information system.",
    subheading: "RemedacareHMIS supports hospital teams with patient records, clinical departments, laboratory, radiology, chronic care, finance, claims, and reporting.",
    badge_text: "RemedacareHMIS",
    primary_btn_text: "Explore RemedacareHMIS",
    primary_btn_url: "/remedacarehmis",
    video_url: "/images/remedacareos-demo.mp4",
  },
  features: {
    enabled: true,
    order: 5,
    heading: "Accelerate your career with practical skills",
    badge_text: "Pharmacourse Learning",
  },
  courses: {
    enabled: true,
    order: 6,
    heading: "Courses built for real-world practice",
    badge_text: "Our Curriculum",
    primary_btn_text: "View all courses",
    primary_btn_url: "/courses",
  },
  testimonials: {
    enabled: true,
    order: 7,
    heading: "Learners who finished the course",
    badge_text: "Reviews",
  },
  stats: {
    enabled: false,
    order: 8,
    heading: "Trusted by pharmacy professionals",
    badge_text: "Statistics",
  },
  faq: {
    enabled: true,
    order: 9,
    heading: "Need help getting started?",
    badge_text: "Frequently Asked Questions",
  },
  cta: {
    enabled: true,
    order: 10,
    heading: "Ready to modernise the way your team delivers care?",
    subheading: "Start learning with Pharmacourse, or book a live walkthrough of RemedacarePOS and RemedacareHMIS.",
    primary_btn_text: "Start Learning Free",
    primary_btn_url: "/register",
    secondary_btn_text: "Book a Demo",
    secondary_btn_url: WHATSAPP,
  },
}

function normalizeHomepageText(value) {
  if (typeof value !== "string") return value

  let normalized = value.trim()

  if (/one company\.\s*three platforms\./i.test(normalized)) {
    normalized = normalized.replace(
      /one company\.\s*three platforms\.\s*/i,
      "Three distinct products: Pharmacourse for learning, RemedacarePOS for pharmacy operations, and RemedacareHMIS for hospital management. "
    )
  }

  HOMEPAGE_BRAND_REPLACEMENTS.forEach(({ pattern, replacement }) => {
    normalized = normalized.replace(pattern, replacement)
  })

  return normalized.replace(/\s{2,}/g, " ").trim()
}

function normalizeHomepageSection(sectionKey, sectionConfig) {
  const merged = { ...DEFAULT_SECTIONS[sectionKey], ...sectionConfig }
  const normalized = Object.fromEntries(
    Object.entries(merged).map(([key, value]) => [key, normalizeHomepageText(value)])
  )

  if (sectionKey === "pharmacyOS") {
    normalized.badge_text = "RemedacarePOS"
  }

  if (sectionKey === "remedacareOS") {
    normalized.badge_text = "RemedacareHMIS"
    normalized.primary_btn_text = normalized.primary_btn_text || "Explore RemedacareHMIS"
    if (/clinic.*dispensary|dispensary.*clinic/i.test(normalized.heading || "")) {
      normalized.heading = DEFAULT_SECTIONS.remedacareOS.heading
    }
  }

  if (sectionKey === "hero") {
    if (/^three distinct products:/i.test(normalized.heading || "") || /transform pharmacy operations|connected ecosystem|integrated suite|purpose-built tools for pharmacy learning and care delivery/i.test(normalized.heading || "")) {
      normalized.heading = DEFAULT_SECTIONS.hero.heading
    }

    if (/brings together|connected ecosystem|integrated platform|integrated suite|clinic management|across the ecosystem|pharmacourse is for professional learning.*remedacarepos is for pharmacy operations/i.test(normalized.subheading || "")) {
      normalized.subheading = DEFAULT_SECTIONS.hero.subheading
    }

    if (/ecosystem|platform/i.test(normalized.badge_text || "")) {
      normalized.badge_text = DEFAULT_SECTIONS.hero.badge_text
    }

    if (/book platform demo/i.test(normalized.primary_btn_text || "")) {
      normalized.primary_btn_text = DEFAULT_SECTIONS.hero.primary_btn_text
      normalized.primary_btn_url = DEFAULT_SECTIONS.hero.primary_btn_url
    }
  }

  if (sectionKey === "ecosystem") {
    if (/^three distinct products:/i.test(normalized.heading || "") || /one company|connected products|three platforms/i.test(normalized.heading || "")) {
      normalized.heading = DEFAULT_SECTIONS.ecosystem.heading
    }

    normalized.subheading = DEFAULT_SECTIONS.ecosystem.subheading

    normalized.badge_text = DEFAULT_SECTIONS.ecosystem.badge_text
  }

  if (sectionKey === "cta" && /RemedacarePOS.*for learning/i.test(normalized.subheading || "")) {
    normalized.subheading = DEFAULT_SECTIONS.cta.subheading
  }

  if (sectionKey === "features") {
    normalized.badge_text = DEFAULT_SECTIONS.features.badge_text
  }

  if (sectionKey === "stats") {
    normalized.enabled = false
  }

  return normalized
}

function getTestimonialInitials(name) {
  const parts = `${name || ""}`.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  if (parts.length === 0) return "PC"
  return parts.map((part) => part[0].toUpperCase()).join("")
}

function getTruncatedReview(text) {
  const normalized = `${text || ""}`.trim()
  if (normalized.length <= 160) return normalized
  return `${normalized.slice(0, 160)}...`
}

function getSnapIndex(container) {
  if (!container || container.children.length === 0) return 0

  const items = Array.from(container.children)
  const currentOffset = container.scrollLeft

  let closestIndex = 0
  let closestDistance = Infinity

  items.forEach((item, index) => {
    const distance = Math.abs(item.offsetLeft - currentOffset)
    if (distance < closestDistance) {
      closestDistance = distance
      closestIndex = index
    }
  })

  return closestIndex
}

function scrollToSnapItem(trackRef, index) {
  const track = trackRef.current
  const target = track?.children?.[index]
  if (!track || !target) return

  track.scrollTo({
    left: target.offsetLeft,
    behavior: "smooth",
  })
}

function handleCard3DPointerMove(event) {
  if (event.pointerType !== "mouse") return
  const bounds = event.currentTarget.getBoundingClientRect()
  const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5
  const vertical = (event.clientY - bounds.top) / bounds.height - 0.5
  event.currentTarget.style.setProperty("--card-tilt-x", `${(-vertical * 7).toFixed(2)}deg`)
  event.currentTarget.style.setProperty("--card-tilt-y", `${(horizontal * 9).toFixed(2)}deg`)
}

function resetCard3DTilt(event) {
  event.currentTarget.style.setProperty("--card-tilt-x", "0deg")
  event.currentTarget.style.setProperty("--card-tilt-y", "0deg")
}

const AnimatedSection = ({ children, delay = 0 }) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <div
      ref={ref}
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? "translateY(0)" : "translateY(50px)",
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

function KineticLetters({ text }) {
  const words = text.split(" ")
  let letterIndex = 0

  return (
    <span aria-hidden="true">
      {words.map((word, wordIndex) => (
        <Fragment key={`${word}-${wordIndex}`}>
          {wordIndex > 0 && <span className="kinetic-heading-space"> </span>}
          <span className="kinetic-heading-word" style={{ "--word-index": wordIndex }}>
            {Array.from(word).map((character, index) => (
              <span
                key={`${character}-${index}`}
                className="kinetic-heading-letter"
                style={{ "--letter-index": letterIndex++ }}
              >
                {character}
              </span>
            ))}
          </span>
        </Fragment>
      ))}
    </span>
  )
}

function KineticHeading({ as = "h2", children, className = "" }) {
  const text = `${children ?? ""}`
  const headingClass = `kinetic-heading ${className}`.trim()

  if (as === "h1") {
    return <h1 className={headingClass} aria-label={text}><KineticLetters text={text} /></h1>
  }

  return <h2 className={headingClass} aria-label={text}><KineticLetters text={text} /></h2>
}

function ScrollKineticHeading({ children, className = "" }) {
  const headingRef = useRef(null)
  const isInView = useInView(headingRef, { once: false, amount: 0.12 })
  const text = `${children ?? ""}`
  const headingClass = `kinetic-heading scroll-kinetic-heading ${isInView ? "is-visible" : ""} ${className}`.trim()

  return (
    <h2 ref={headingRef} className={headingClass} aria-label={text}>
      <KineticLetters text={text} />
    </h2>
  )
}

function ScrollShowroom({ children, className = "" }) {
  const showroomRef = useRef(null)
  const isInView = useInView(showroomRef, { once: false, amount: 0.18 })
  const showroomClass = `scroll-showroom ${className} ${isInView ? "is-visible" : ""}`.trim()

  return <div ref={showroomRef} className={showroomClass}>{children}</div>
}

function Hero3DArt({ sharedScene = false }) {
  const mountRef = useRef(null)
  const [mode, setMode] = useState("learn")
  const modeRef = useRef("learn")

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    if (sharedScene || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined

    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return
      setMode((current) => {
        const index = HERO_ART_MODES.indexOf(current)
        return HERO_ART_MODES[(index + 1) % HERO_ART_MODES.length]
      })
    }, 5200)

    return () => window.clearInterval(timer)
  }, [sharedScene])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    let cancelled = false
    let disposeScene

    const initializeScene = async () => {
      const THREE = await import("three")
      if (cancelled) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xe7f4f0)
    scene.fog = new THREE.Fog(0xe7f4f0, 10, 22)

    const camera = new THREE.PerspectiveCamera(32, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.set(0, 2.1, 7.2)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    const ambient = new THREE.HemisphereLight(0xffffff, 0xdbece6, 1.4)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6)
    keyLight.position.set(3, 6, 5)
    scene.add(ambient, keyLight)

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(5.2, 5.6, 0.5, 48),
      new THREE.MeshStandardMaterial({ color: 0xe5f4ef, roughness: 0.96, metalness: 0.05 })
    )
    floor.position.y = -2.35
    floor.visible = false
    scene.add(floor)

    const shelfBack = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 2.6, 0.24),
      new THREE.MeshStandardMaterial({ color: 0xdfece7, roughness: 0.8 })
    )
    shelfBack.position.set(0, 0.3, -2.6)
    shelfBack.visible = false
    scene.add(shelfBack)

    const body = new THREE.Group()
    body.position.y = -0.15
    scene.add(body)

    const skinMaterial = new THREE.MeshStandardMaterial({ color: 0x8f5a3e, roughness: 0.8 })
    const coatMaterial = new THREE.MeshStandardMaterial({ color: 0xf5f7f9, roughness: 0.9 })
    const shirtMaterial = new THREE.MeshStandardMaterial({ color: 0x9ebfe4, roughness: 0.7 })
    const pantsMaterial = new THREE.MeshStandardMaterial({ color: 0x2e5d9e, roughness: 0.8 })
    const hairMaterial = new THREE.MeshStandardMaterial({ color: 0x2d1f1a, roughness: 0.9 })
    const labelMaterial = new THREE.MeshStandardMaterial({ color: 0x2c9d87, roughness: 0.7, metalness: 0.2 })
    const capsuleMaterial = new THREE.MeshStandardMaterial({ color: 0xfd6a55, roughness: 0.5, metalness: 0.15 })
    const metalMaterial = new THREE.MeshStandardMaterial({ color: 0xb5c6d4, roughness: 0.7, metalness: 0.6 })

    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.8, 0.72), coatMaterial)
    torso.position.y = 1.8
    body.add(torso)

    const shirt = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.15, 0.48), shirtMaterial)
    shirt.position.set(0, 1.8, 0.18)
    body.add(shirt)

    const hips = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.7, 0.6), pantsMaterial)
    hips.position.set(0, 0.8, 0)
    body.add(hips)

    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.2, 0.42), pantsMaterial)
    leftLeg.position.set(-0.27, -0.2, 0)
    const rightLeg = leftLeg.clone()
    rightLeg.position.x = 0.27
    body.add(leftLeg, rightLeg)

    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.2, 0.7), new THREE.MeshStandardMaterial({ color: 0xf4e9d6, roughness: 0.9 }))
    leftShoe.position.set(-0.27, -1.08, 0.12)
    const rightShoe = leftShoe.clone()
    rightShoe.position.x = 0.27
    body.add(leftShoe, rightShoe)

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.56, 32, 32), skinMaterial)
    head.position.set(0, 3.15, 0)
    body.add(head)

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.58, 24, 24), hairMaterial)
    hair.position.set(0, 3.42, -0.04)
    hair.scale.set(1.08, 0.85, 1.08)
    body.add(hair)

    const forehead = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.72), hairMaterial)
    forehead.position.set(0, 3.44, 0.25)
    body.add(forehead)

    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }))
    leftEye.position.set(-0.16, 3.18, 0.46)
    const rightEye = leftEye.clone()
    rightEye.position.x = 0.16
    body.add(leftEye, rightEye)

    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 16, Math.PI), new THREE.MeshStandardMaterial({ color: 0xc36d7a }))
    smile.rotation.z = Math.PI
    smile.position.set(0, 2.98, 0.48)
    body.add(smile)

    const leftGlass = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.08), new THREE.MeshStandardMaterial({ color: 0x2a374a, transparent: true, opacity: 0.8 }))
    leftGlass.position.set(-0.18, 3.18, 0.52)
    const rightGlass = leftGlass.clone()
    rightGlass.position.x = 0.18
    body.add(leftGlass, rightGlass)

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.24, 18), skinMaterial)
    neck.position.set(0, 2.5, 0)
    body.add(neck)

    const coatCollar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.42), new THREE.MeshStandardMaterial({ color: 0xf0dfe5 }))
    coatCollar.position.set(0, 2.32, 0.2)
    body.add(coatCollar)

    const leftArmPivot = new THREE.Group()
    leftArmPivot.position.set(-1.02, 2.52, 0)
    body.add(leftArmPivot)

    const rightArmPivot = new THREE.Group()
    rightArmPivot.position.set(1.02, 2.52, 0)
    body.add(rightArmPivot)

    const armGeometry = new THREE.CapsuleGeometry(0.17, 0.9, 6, 12)
    const leftArm = new THREE.Mesh(armGeometry, skinMaterial)
    leftArm.position.y = -0.55
    leftArmPivot.add(leftArm)

    const rightArm = new THREE.Mesh(armGeometry, skinMaterial)
    rightArm.position.y = -0.55
    rightArmPivot.add(rightArm)

    const leftForearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.7, 5, 12), skinMaterial)
    leftForearm.position.set(-0.12, -1.2, 0.12)
    leftArmPivot.add(leftForearm)

    const rightForearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.7, 5, 12), skinMaterial)
    rightForearm.position.set(0.12, -1.2, 0.12)
    rightArmPivot.add(rightForearm)

    const stethoscope = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.02, 12, 36), metalMaterial)
    stethoscope.rotation.x = Math.PI / 2
    stethoscope.position.set(0, 2.2, 0.12)
    body.add(stethoscope)

    const stethoscopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 12), metalMaterial)
    stethoscopeTube.rotation.z = Math.PI / 2
    stethoscopeTube.position.set(0.25, 1.42, 0.1)
    body.add(stethoscopeTube)

    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.04), labelMaterial)
    badge.position.set(0, 1.72, 0.39)
    body.add(badge)

    const clipboard = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.08, 0.06), new THREE.MeshStandardMaterial({ color: 0xf9fbff, roughness: 0.85 }))
    clipboard.position.set(1.4, 1.6, 0.4)
    clipboard.rotation.z = -0.4
    clipboard.rotation.y = -0.4
    clipboard.visible = false
    body.add(clipboard)

    const pillBottle = new THREE.Group()
    const bottleBody = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.8, 20), new THREE.MeshStandardMaterial({ color: 0xf4a261, roughness: 0.6 }))
    bottleBody.position.y = 0.55
    const bottleCap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 18), new THREE.MeshStandardMaterial({ color: 0xe76f51, roughness: 0.8 }))
    bottleCap.position.y = 1.1
    const capsule = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 18), capsuleMaterial)
    capsule.rotation.z = Math.PI / 2
    capsule.position.set(0.2, 0.6, -0.15)
    pillBottle.add(bottleBody, bottleCap, capsule)
    pillBottle.rotation.z = -0.4
    pillBottle.position.set(1.4, 1.65, 0.3)
    pillBottle.visible = false
    body.add(pillBottle)

    body.visible = false
    const art = new THREE.Group()
    art.position.set(0, 1.65, 0)
    scene.add(art)

    const coreMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x17a582,
      roughness: 0.22,
      metalness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.16,
    })
    const coralMaterial = new THREE.MeshPhysicalMaterial({ color: 0xff765e, roughness: 0.25, metalness: 0.12, clearcoat: 0.8 })
    const goldMaterial = new THREE.MeshPhysicalMaterial({ color: 0xffc857, roughness: 0.25, metalness: 0.18, clearcoat: 0.8 })
    const blueMaterial = new THREE.MeshPhysicalMaterial({ color: 0x528ad8, roughness: 0.24, metalness: 0.16, clearcoat: 0.8 })
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0x4b9e91, transparent: true, opacity: 0.56 })

    const centralForm = new THREE.Mesh(new THREE.TorusKnotGeometry(0.78, 0.25, 180, 24, 2, 3), coreMaterial)
    centralForm.rotation.set(0.25, -0.4, 0.2)
    art.add(centralForm)

    const nucleus = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 2), new THREE.MeshPhysicalMaterial({
      color: 0xf5fff9,
      roughness: 0.08,
      metalness: 0.12,
      transmission: 0.35,
      thickness: 0.8,
      clearcoat: 1,
    }))
    art.add(nucleus)

    const orbitRings = []
    ;[
      { radius: 1.42, color: 0x28a78f, rotation: [0.3, 0.35, 0.1] },
      { radius: 1.72, color: 0xf4b84b, rotation: [1.25, -0.42, 0.55] },
      { radius: 1.15, color: 0xe76f5a, rotation: [0.72, 1.05, -0.6] },
    ].forEach(({ radius, color, rotation }) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.018, 12, 128),
        new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.45, transparent: true, opacity: 0.82 })
      )
      ring.rotation.set(...rotation)
      art.add(ring)
      orbitRings.push(ring)
    })

    const atomPositions = [
      new THREE.Vector3(-1.6, 0.62, 0.2),
      new THREE.Vector3(1.48, 0.88, -0.15),
      new THREE.Vector3(0.2, -1.48, 0.55),
      new THREE.Vector3(-1.05, -0.9, -0.45),
      new THREE.Vector3(1.18, -0.92, 0.25),
    ]
    const atomMaterials = [coralMaterial, goldMaterial, blueMaterial, coreMaterial, coralMaterial]
    const atoms = atomPositions.map((position, index) => {
      const atom = new THREE.Mesh(new THREE.SphereGeometry(index === 2 ? 0.28 : 0.2, 32, 24), atomMaterials[index])
      atom.position.copy(position)
      art.add(atom)
      return atom
    })

    ;[
      [0, 1], [0, 3], [1, 4], [2, 3], [2, 4], [0, 2],
    ].forEach(([start, end], index) => {
      const from = atomPositions[start]
      const to = atomPositions[end]
      const midpoint = from.clone().add(to).multiplyScalar(0.5)
      midpoint.z += index % 2 ? 0.55 : -0.55
      const curve = new THREE.QuadraticBezierCurve3(from, midpoint, to)
      const line = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.014, 8, false), lineMaterial)
      art.add(line)
    })

    const capsuleForms = [
      { position: [-1.78, -0.18, 0.45], color: coralMaterial, rotation: [0.35, 0.2, -0.7] },
      { position: [1.82, -0.1, -0.3], color: blueMaterial, rotation: [0.25, -0.4, 0.6] },
      { position: [0.04, 1.82, -0.2], color: goldMaterial, rotation: [1.1, 0.3, 0.15] },
    ].map(({ position, color, rotation }) => {
      const capsuleForm = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.62, 8, 20), color)
      capsuleForm.position.set(...position)
      capsuleForm.rotation.set(...rotation)
      art.add(capsuleForm)
      return capsuleForm
    })

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(2.15, 0.008, 8, 160),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 })
    )
    halo.rotation.set(0.2, 0.1, 0.45)
    art.add(halo)

    const pointLight = new THREE.PointLight(0x63d9b4, 20, 8)
    pointLight.position.set(-2.5, 2.4, 2.5)
    scene.add(pointLight)
    const warmLight = new THREE.PointLight(0xffa279, 12, 7)
    warmLight.position.set(2.5, -1.4, 2)
    scene.add(warmLight)

    const orbit = { yaw: 0.45, pitch: 0.18, distance: 7.2 }
    const scrollProgress = { value: 0 }
    const heroSection = mount.closest(".hero-section")
    let pointerDown = false
    let lastX = 0
    let lastY = 0

    const updateScrollProgress = () => {
      if (!heroSection) return
      scrollProgress.value = THREE.MathUtils.clamp(
        -heroSection.getBoundingClientRect().top / (window.innerHeight * 0.8),
        0,
        1
      )
    }
    window.addEventListener("scroll", updateScrollProgress, { passive: true })
    updateScrollProgress()

    function updateCamera() {
      const x = Math.sin(orbit.yaw) * Math.cos(orbit.pitch) * orbit.distance
      const y = Math.sin(orbit.pitch) * orbit.distance + 1.7
      const z = Math.cos(orbit.yaw) * Math.cos(orbit.pitch) * orbit.distance
      camera.position.set(x, y, z)
      camera.lookAt(0, 1.6, 0)
    }

    function updateArtwork(time) {
      const motionScale = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.12 : 1
      const selectedMode = HERO_ART_MODES.indexOf(modeRef.current)
      const modeColors = [0x17a582, 0x528ad8, 0xff765e]
      const seconds = time * 0.001
      const scrollTurn = scrollProgress.value * Math.PI * 0.85
      art.rotation.y = Math.sin(seconds * 0.28) * 0.13 + selectedMode * 0.7 + scrollTurn
      art.rotation.x = Math.sin(seconds * 0.36) * 0.06 + scrollProgress.value * 0.52
      art.position.y = 1.65 + Math.sin(seconds * 0.8) * 0.1 * motionScale
      centralForm.rotation.x += 0.002 * motionScale
      centralForm.rotation.z -= 0.0025 * motionScale
      centralForm.scale.setScalar(1 - scrollProgress.value * 0.1 + Math.sin(seconds * 1.8) * 0.035 * motionScale)
      coreMaterial.color.setHex(modeColors[selectedMode] || modeColors[0])
      orbitRings.forEach((ring, index) => {
        ring.rotation.z += (index % 2 ? 0.0016 : -0.0012) * motionScale
      })
      atoms.forEach((atom, index) => {
        atom.position.y = atomPositions[index].y + Math.sin(seconds * 1.2 + index) * 0.12 * motionScale
      })
      capsuleForms.forEach((capsuleForm, index) => {
        capsuleForm.rotation.y += (index % 2 ? 0.003 : -0.002) * motionScale
      })
      pointLight.color.setHex(modeColors[selectedMode] || modeColors[0])
    }

    const handlePointerDown = (event) => {
      pointerDown = true
      lastX = event.clientX
      lastY = event.clientY
      renderer.domElement.setPointerCapture(event.pointerId)
    }

    const handlePointerMove = (event) => {
      if (!pointerDown) return
      const deltaX = (event.clientX - lastX) * 0.006
      const deltaY = (event.clientY - lastY) * 0.004
      orbit.yaw -= deltaX
      orbit.pitch = THREE.MathUtils.clamp(orbit.pitch - deltaY, -0.75, 0.75)
      lastX = event.clientX
      lastY = event.clientY
    }

    const handlePointerUp = (event) => {
      pointerDown = false
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId)
      }
    }

    const handleWheel = (event) => {
      if (!event.ctrlKey) return
      event.preventDefault()
      orbit.distance = THREE.MathUtils.clamp(orbit.distance + event.deltaY * 0.008, 5.5, 11.5)
    }

    const handleClick = () => {
      setMode((current) => {
        const index = HERO_ART_MODES.indexOf(current)
        return HERO_ART_MODES[(index + 1) % HERO_ART_MODES.length]
      })
    }

    renderer.domElement.addEventListener("pointerdown", handlePointerDown)
    renderer.domElement.addEventListener("pointermove", handlePointerMove)
    renderer.domElement.addEventListener("pointerup", handlePointerUp)
    renderer.domElement.addEventListener("pointerleave", handlePointerUp)
    renderer.domElement.addEventListener("wheel", handleWheel, { passive: false })
    renderer.domElement.addEventListener("click", handleClick)

    let frameId
    const animate = (time) => {
      updateCamera()
      updateArtwork(time)
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }

    animate()

    const resizeObserver = new ResizeObserver(() => {
      const width = mount.clientWidth || 420
      const height = mount.clientHeight || 480
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    })
    resizeObserver.observe(mount)

    disposeScene = () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      window.removeEventListener("scroll", updateScrollProgress)
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown)
      renderer.domElement.removeEventListener("pointermove", handlePointerMove)
      renderer.domElement.removeEventListener("pointerup", handlePointerUp)
      renderer.domElement.removeEventListener("pointerleave", handlePointerUp)
      renderer.domElement.removeEventListener("wheel", handleWheel)
      renderer.domElement.removeEventListener("click", handleClick)
      mount.removeChild(renderer.domElement)
      renderer.dispose()
    }

    }

    initializeScene().catch((error) => console.error("Failed to initialize homepage 3D art:", error))
    return () => {
      cancelled = true
      disposeScene?.()
    }
  }, [])

  if (sharedScene) return null

  return (
    <div className="hero-3d-shell">
      <div ref={mountRef} className="hero-3d-canvas" aria-label="Interactive three-dimensional healthcare molecular artwork" />
      <div className="hero-3d-controls">
        {[
          { key: "learn", label: "Learn" },
          { key: "practice", label: "Practice" },
          { key: "care", label: "Care" },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            className={mode === item.key ? "active" : ""}
            onClick={() => setMode(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const ProductMockup = ({ type, videoUrl, imageSrc, imageAlt }) => {
  const [videoFailed, setVideoFailed] = useState(false)
  const configs = {
    pharmacyOS: {
      color: "#0F6E56",
      bg: "#e8f5f0",
      title: "RemedacarePOS",
      rows: ["Amoxicillin 500mg x 2", "Prednisolone 5mg x 30", "Vitamin B Complex x 1"],
      badge: "M-Pesa ready",
      total: "KES 1,240",
    },
    remedacareOS: {
      color: "#1A6BB5",
      bg: "#e8f0fb",
      title: "RemedacareHMIS",
      rows: ["Patient: John Mwangi", "Diagnosis: Hypertension", "Rx: Amlodipine 5mg OD"],
      badge: "MOH ready",
      total: "SHA claim ready",
    },
    pharmaCourse: {
      color: "#0F6E56",
      bg: "#eef8f4",
      title: "Pharmacourse",
      rows: ["Course: Antimicrobial Stewardship", "Learning progress: 72%", "Certificate: In progress"],
      badge: "CPD learning",
      total: "Learn at your pace",
    },
  }

  const c = configs[type] || configs.pharmacyOS
  const fallbackImageSrc = imageSrc || pharmacourseHeroVisual
  const visualAlt = imageAlt || `${c.title || "Product"} dashboard preview`

  useEffect(() => {
    setVideoFailed(false)
  }, [videoUrl])

  const mediaStyle = { width: "100%", height: "auto", display: "block" }

  const renderMedia = () => (
    videoUrl && !videoFailed ? (
      <video
        key={videoUrl}
        src={videoUrl}
        poster={fallbackImageSrc}
        controls
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={visualAlt}
        onError={() => setVideoFailed(true)}
        style={mediaStyle}
        className="homepage-media"
      />
    ) : (
      <img
        src={fallbackImageSrc}
        alt={visualAlt}
        style={mediaStyle}
        className="homepage-media"
      />
    )
  )

  if (type === "pharmaCourse") {
    return (
      <div className="product-mockup">
        {renderMedia()}
      </div>
    )
  }

  if (type === "pharmacyOS") {
    return (
      <div className="product-mockup">
        {renderMedia()}
      </div>
    )
  }

  if (type === "remedacareOS") {
    return (
      <div className="product-mockup">
        {renderMedia()}
      </div>
    )
  }

  return (
    <div className="product-mockup">
      <div className="mockup-frame" style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
        <div style={{ background: "#f4f4f4", padding: "10px 14px", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid #e8e8e8" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
          <span style={{ fontSize: 11, color: "#999", marginLeft: 8, fontFamily: "monospace" }}>{c.title}</span>
        </div>

        <div style={{ padding: "1.25rem", background: "#fafafa" }}>
          <div style={{ background: c.bg, borderRadius: 8, padding: "10px 12px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{c.title}</span>
            <span style={{ fontSize: 10, background: c.color, color: "#fff", borderRadius: 99, padding: "2px 8px", fontWeight: 700 }}>{c.badge}</span>
          </div>

          {c.rows.map((row, i) => (
            <div
              key={i}
              style={{
                background: "#fff",
                border: "1px solid #eee",
                borderRadius: 7,
                padding: "9px 12px",
                marginBottom: 7,
                fontSize: 12,
                color: "#333",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                animation: `slideIn 0.4s ease ${i * 0.12}s both`,
              }}
            >
              <span>{row}</span>
              <span style={{ fontSize: 10, color: "#aaa" }}>Done</span>
            </div>
          ))}

          <div style={{ marginTop: 12, background: c.color, color: "#fff", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 700, textAlign: "center" }}>
            {c.total}
          </div>
        </div>
      </div>

      <style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }`}</style>
    </div>
  )
}

export default function Home() {
  const [courses, setCourses] = useState([])
  const [activeCourseArtifact, setActiveCourseArtifact] = useState(0)
  const [capsuleBurst, setCapsuleBurst] = useState(0)
  const [coursesError, setCoursesError] = useState(false)
  const [testimonials, setTestimonials] = useState([])
  const [testimonialsError, setTestimonialsError] = useState(false)
  const [latestPosts, setLatestPosts] = useState([])
  const [postsError, setPostsError] = useState(false)
  const [activeSection, setActiveSection] = useState("hero")
  const [activeCourseIndex, setActiveCourseIndex] = useState(0)
  const [activePostIndex, setActivePostIndex] = useState(0)
  const [sections, setSections] = useState(DEFAULT_SECTIONS)
  const [loading, setLoading] = useState(true)
  const courseTrackRef = useRef(null)
  const blogTrackRef = useRef(null)

  useEffect(() => {
    async function loadData() {
      try {
        const { data: sectionData, error: sectionError } = await supabase
          .from("homepage_content")
          .select("*")
          .eq("enabled", true)
          .order("order_index")

        if (sectionError) {
          console.error("Failed to load homepage sections:", sectionError)
        }

        if (!sectionError && sectionData && sectionData.length > 0) {
          const sectionsObj = {}

          sectionData.forEach((s) => {
            sectionsObj[s.section_key] = normalizeHomepageSection(s.section_key, {
              enabled: s.enabled,
              order: s.order_index,
              heading: s.heading,
              subheading: s.subheading,
              body: s.body,
              badge_text: s.badge_text,
              primary_btn_text: s.primary_btn_text,
              primary_btn_url: s.primary_btn_url,
              secondary_btn_text: s.secondary_btn_text,
              secondary_btn_url: s.secondary_btn_url,
              video_url: s.video_url,
              image_url: s.image_url,
            })
          })

          setSections((prev) => ({ ...prev, ...sectionsObj }))
        }

        const { data: courseData, error: courseLoadError } = await supabase
          .from("courses")
          .select("*")
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(4)

        if (courseLoadError) {
          console.error("Failed to load homepage courses:", courseLoadError)
          setCoursesError(true)
        } else {
          setCourses(courseData || [])
        }

        const { data: blogData, error: blogLoadError } = await supabase
          .from("blog_posts")
          .select("*")
          .eq("is_published", true)
          .order("published_at", { ascending: false })
          .limit(3)

        if (blogLoadError) {
          console.error("Failed to load homepage blog posts:", blogLoadError)
          setPostsError(true)
        } else {
          setLatestPosts(blogData || [])
        }

        const { data: testimonialData, error: testimonialLoadError } = await supabase
          .from("testimonials")
          .select("id, author_name, author_title, author_photo_url, rating, review_text")
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(6)

        if (testimonialLoadError) {
          console.error("Failed to load homepage testimonials:", testimonialLoadError)
          setTestimonialsError(true)
        } else {
          setTestimonials(testimonialData || [])
        }
      } catch (err) {
        console.error("Error loading data:", err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const sortedSections = Object.entries(sections)
    .filter(([, config]) => config.enabled)
    .sort((a, b) => (a[1].order || 999) - (b[1].order || 999))

  useEffect(() => {
    const nodes = [
      ...sortedSections.map(([key]) => document.getElementById(key)),
      document.getElementById("three-products-scroll"),
    ].filter(Boolean)

    if (nodes.length === 0) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        if (visible?.target?.id) {
          setActiveSection(visible.target.id)
        }
      },
      {
        threshold: [0.25, 0.45, 0.65],
        rootMargin: "-30% 0px -42% 0px",
      }
    )

    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [sortedSections])

  useEffect(() => {
    setActiveCourseIndex(0)
    if (courseTrackRef.current) courseTrackRef.current.scrollLeft = 0
  }, [courses.length])

  useEffect(() => {
    setActivePostIndex(0)
    if (blogTrackRef.current) blogTrackRef.current.scrollLeft = 0
  }, [latestPosts.length])

  function goToCourse(index) {
    setActiveCourseIndex(index)
    scrollToSnapItem(courseTrackRef, index)
  }

  function goToPost(index) {
    setActivePostIndex(index)
    scrollToSnapItem(blogTrackRef, index)
  }

  return (
    <div className="home">
      <SEO
        title="Pharmacourse | RemedacarePOS & RemedacareHMIS Kenya"
        description="Learn with Pharmacourse, simplify pharmacy operations with RemedacarePOS, and connect hospital workflows with RemedacareHMIS."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Pharmacourse",
          url: SITE_URL,
          logo: `${SITE_URL}/favicon.svg`,
          description:
            "Three distinct services for Kenyan healthcare teams: Pharmacourse professional learning, RemedacarePOS pharmacy software, and RemedacareHMIS hospital management.",
        }}
      />

      <div className="section-nav">
        {sortedSections.map(([key]) => (
          <button
            key={key}
            className={`section-dot ${activeSection === key ? "active" : ""}`}
            onClick={() => document.getElementById(key)?.scrollIntoView({ behavior: "smooth" })}
            title={key}
          />
        ))}
        {sections.ecosystem?.enabled && (
          <button
            className={`section-dot ${activeSection === "three-products-scroll" ? "active" : ""}`}
            onClick={() => document.getElementById("three-products-scroll")?.scrollIntoView({ behavior: "smooth" })}
            title="3D product experience"
            aria-label="Go to 3D product experience"
          />
        )}
      </div>

      {sortedSections.map(([key, config]) => {
        switch (key) {
          case "hero":
            return (
              <AnimatedSection key={key}>
                <section id="hero" className="hero-section">
                  <div className="container">
                    <div className="hero-content-top">
                      <div className="hero-3d-layout">
                        <div className="hero-copy-panel">
                          {config.badge_text && <span className="hero-badge">{config.badge_text}</span>}
                          <KineticHeading as="h1">{config.heading || DEFAULT_SECTIONS.hero.heading}</KineticHeading>
                          <p>{config.subheading || ""}</p>

                          <div className="hero-actions">
                            <Link to="/courses" className="btn-primary">
                              Explore Pharmacourse <ChevronRight size={17} />
                            </Link>
                            <a href="#ecosystem" className="hero-text-link">
                              Meet the products <span aria-hidden="true">↓</span>
                            </a>
                          </div>
                        </div>

                        <Hero3DArt />
                      </div>
                    </div>
                  </div>
                </section>
              </AnimatedSection>
            )

          case "ecosystem":
            return (
              <Fragment key={key}>
                <AnimatedSection delay={0.1}>
                  <section id="ecosystem" className="ecosystem-section">
                    <div className="container">
                      <ScrollShowroom className="platform-showroom">
                        <div className="section-header">
                          {config.badge_text && <span className="section-badge">{config.badge_text}</span>}
                          <ScrollKineticHeading>{config.heading || "Choose what your team needs."}</ScrollKineticHeading>
                          {config.subheading && <p>{config.subheading}</p>}
                        </div>

                        <div className="platform-console">
                          <div className="platform-grid">
                          <article className="platform-card platform-card-learning" style={{ "--platform-index": 0 }}>
                          <div className="platform-card-topline">
                            <span className="platform-index">01 / LEARN</span>
                            <img src="/favicon.svg" alt="" className="platform-mark" />
                          </div>
                          <div className="platform-sculpture platform-sculpture-learning" aria-hidden="true">
                            <div className="sculpture-book">
                              <span className="sculpture-book-page left" />
                              <span className="sculpture-book-page right" />
                              <span className="sculpture-book-spine" />
                            </div>
                          </div>
                          <div className="platform-card-copy">
                            <p className="platform-kicker">Professional development</p>
                            <h3>Pharmacourse</h3>
                            <p>Practical CPD courses, clinical case simulations, and certificates designed for pharmacy professionals.</p>
                          </div>
                          <Link to="/courses" className="platform-link">Explore courses <ChevronRight size={16} /></Link>
                        </article>

                        <article className="platform-card platform-card-pos" style={{ "--platform-index": 1 }}>
                          <div className="platform-card-topline">
                            <span className="platform-index">02 / OPERATE</span>
                            <img src={remedacareposMark} alt="" className="platform-mark" />
                          </div>
                          <div className="platform-sculpture platform-sculpture-pos" aria-hidden="true">
                            <div className="sculpture-capsule"><span /></div>
                          </div>
                          <div className="platform-card-copy">
                            <p className="platform-kicker">Pharmacy operations</p>
                            <h3>RemedacarePOS</h3>
                            <p>Dispensing, inventory, patient requests, claims, and branch operations for pharmacies.</p>
                          </div>
                          <Link to="/remedacarepos" className="platform-link">Explore RemedacarePOS <ChevronRight size={16} /></Link>
                        </article>

                        <article className="platform-card platform-card-hmis" style={{ "--platform-index": 2 }}>
                          <div className="platform-card-topline">
                            <span className="platform-index">03 / MANAGE CARE</span>
                            <img src={remedacarehmisMark} alt="" className="platform-mark" />
                          </div>
                          <div className="platform-sculpture platform-sculpture-hmis" aria-hidden="true">
                            <div className="sculpture-network">
                              <span className="network-line line-one" />
                              <span className="network-line line-two" />
                              <span className="network-line line-three" />
                              <span className="network-node node-one" />
                              <span className="network-node node-two" />
                              <span className="network-node node-three" />
                              <span className="network-node node-four" />
                              <span className="network-node node-core" />
                            </div>
                          </div>
                          <div className="platform-card-copy">
                            <p className="platform-kicker">Hospital management</p>
                            <h3>RemedacareHMIS</h3>
                            <p>Patient records, clinical departments, reporting, finance, and hospital operations in one HMIS.</p>
                          </div>
                          <Link to="/remedacarehmis" className="platform-link">Explore RemedacareHMIS <ChevronRight size={16} /></Link>
                        </article>
                      </div>
                        <div className="platform-console-deck" aria-hidden="true" />
                      </div>
                    </ScrollShowroom>
                    </div>
                  </section>
                </AnimatedSection>
                <ThreeProductScroll />
              </Fragment>
            )

          case "pharmacyOS":
            return (
              <AnimatedSection key={key} delay={0.2}>
                <section id="pharmacyOS" className="product-section">
                  <div className="container">
                    <div className="product-grid reverse">
                      <div className="product-heading">
                        {config.badge_text && <span className="section-badge">{config.badge_text}</span>}
                        <ScrollKineticHeading>{config.heading || "Everything your pharmacy needs. In one desktop app."}</ScrollKineticHeading>
                        {config.subheading && <p>{config.subheading}</p>}
                      </div>

                      <div className="product-visual product-visual-pos" onPointerMove={handleCard3DPointerMove} onPointerLeave={resetCard3DTilt}>
                        <div className="pos-3d-scene">
                          <div className="pos-terminal">
                            <div className="pos-terminal-frame">
                              <div className="pos-terminal-screen">
                                <ProductMockup
                                  type="pharmacyOS"
                                  videoUrl={config.video_url}
                                  imageSrc={config.image_url || pharmacyosDashboard}
                                  imageAlt="RemedacarePOS dashboard showing branch overview, revenue, inventory insights and recent sales"
                                />
                              </div>
                              <div className="pos-terminal-chin">
                                <span>RemedacarePOS</span>
                                <i aria-hidden="true" />
                              </div>
                            </div>
                            <div className="pos-terminal-neck" />
                            <div className="pos-terminal-base" />
                          </div>

                          <div className="pos-scene-status" aria-label="RemedacarePOS integrations">
                            <div className="pos-status-card pos-status-payments" style={{ "--feature-index": 0 }}>
                              <CreditCard size={17} aria-hidden="true" />
                              <span><small>PAYMENTS</small><strong>M-Pesa ready</strong></span>
                            </div>
                            <div className="pos-status-card pos-status-stock" style={{ "--feature-index": 1 }}>
                              <Package size={17} aria-hidden="true" />
                              <span><small>INVENTORY</small><strong>Branch stock</strong></span>
                            </div>
                            <div className="pos-status-card pos-status-alerts" style={{ "--feature-index": 2 }}>
                              <AlertTriangle size={17} aria-hidden="true" />
                              <span><small>CONTROL</small><strong>Expiry alerts</strong></span>
                            </div>
                            <div className="pos-status-card pos-status-claims" style={{ "--feature-index": 3 }}>
                              <Building2 size={17} aria-hidden="true" />
                              <span><small>COMPLIANCE</small><strong>SHA · eTIMS · PPB</strong></span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="product-features">
                        <div className="feature-list">
                          {[
                            { icon: ShoppingCart, text: "Dispensing and POS with M-Pesa" },
                            { icon: Package, text: "Live inventory and branch stock control" },
                            { icon: AlertTriangle, text: "Telepharmacy and patient request workflow" },
                            { icon: CreditCard, text: "SHA, insurance, and compliance reporting" },
                          ].map((feature, idx) => (
                            <div key={idx} className="feature-item" style={{ "--feature-index": idx }}>
                              <feature.icon size={20} />
                              <span>{feature.text}</span>
                            </div>
                          ))}
                        </div>

                        <Link to="/remedacarepos" className="btn-primary">
                          {config.primary_btn_text || "Explore RemedacarePOS"}
                        </Link>
                      </div>
                    </div>
                  </div>
                </section>
              </AnimatedSection>
            )

          case "remedacareOS":
            return (
              <AnimatedSection key={key} delay={0.3}>
                <section id="remedacareOS" className="product-section alt">
                  <div className="container">
                    <div className="hmis-showcase">
                      <div className="hmis-visual-wrap">
                        <div className="hmis-monitor-shell">
                          <div className="hmis-monitor-bezel">
                            <ProductMockup
                              type="remedacareOS"
                              videoUrl={config.video_url}
                              imageSrc={config.image_url || remedacareDashboard}
                              imageAlt="RemedacareHMIS dashboard showing patient, admissions, finance and pharmacy workflow panels"
                            />
                          </div>
                          <div className="hmis-monitor-stand" aria-hidden="true" />
                          <div className="hmis-monitor-base" aria-hidden="true" />
                        </div>
                      </div>

                      <div className="hmis-story-card">
                        {config.badge_text && <span className="section-badge">{config.badge_text}</span>}
                        <ScrollKineticHeading>{config.heading || "A complete hospital information system."}</ScrollKineticHeading>
                        {config.subheading && <p>{config.subheading}</p>}

                        <div className="hmis-list">
                          {[
                            { icon: ClipboardList, text: "Care pathways and chronic disease follow-up" },
                            { icon: BarChart3, text: "Finance, claims, and executive visibility" },
                            { icon: Users, text: "Antibiogram, AMS, and clinical decision support" },
                            { icon: Link2, text: "Seamless RemedacarePOS integration" },
                          ].map((feature, idx) => (
                            <div key={idx} className="hmis-list-item" style={{ "--feature-index": idx }}>
                              <feature.icon size={18} />
                              <span>{feature.text}</span>
                            </div>
                          ))}
                        </div>

                        <Link to="/remedacarehmis" className="btn-primary">
                          {config.primary_btn_text || "Explore RemedacareHMIS"}
                        </Link>
                      </div>
                    </div>
                  </div>
                </section>
              </AnimatedSection>
            )

          case "features":
            return (
              <AnimatedSection key={key} delay={0.4}>
                <section id="features" className="features-section">
                  <div className="container">
                    <div className="section-header">
                      {config.badge_text && <span className="section-badge">{config.badge_text}</span>}
                      <KineticHeading>{config.heading || "Accelerate your career with practical skills"}</KineticHeading>
                    </div>

                    <div className="learning-scene" aria-hidden="true">
                      <div className="learning-book"><span /><span /><i /></div>
                      <div className="learning-certificate"><Award size={28} /><i /><i /><b>CPD</b></div>
                      <div className="learning-pdf learning-pdf-one"><i /><i /><i /></div>
                      <div className="learning-pdf learning-pdf-two"><i /><i /><i /></div>
                      <span className="learning-orbit learning-orbit-one" />
                      <span className="learning-orbit learning-orbit-two" />
                    </div>

                    <div className="features-grid">
                      {[
                        { icon: BookOpen, title: "Self-Paced Learning", desc: "Learn at your own speed with short, focused modules." },
                        { icon: Download, title: "Downloadable Resources", desc: "Clinical notes and reference materials included." },
                        { icon: Award, title: "CPD Certificates", desc: "Earn certificates for your professional portfolio." },
                      ].map((feature, idx) => (
                        <div
                          key={idx}
                          className="feature-card"
                          onPointerMove={handleCard3DPointerMove}
                          onPointerLeave={resetCard3DTilt}
                        >
                          <feature.icon size={24} />
                          <h3>{feature.title}</h3>
                          <p>{feature.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </AnimatedSection>
            )

          case "courses":
            return (
              <AnimatedSection key={key} delay={0.5}>
                <>
                  <section id="courses" className="courses-section">
                    <div className="container">
                      <div className="section-header">
                        {config.badge_text && <span className="section-badge">{config.badge_text}</span>}
                        <KineticHeading>{config.heading || "Courses built for real-world practice"}</KineticHeading>
                      </div>

                      <div className="course-artifact-stage">
                        <div className={`course-artifact course-artifact-${activeCourseArtifact}`} aria-hidden="true">
                          <span className="artifact-orbit artifact-orbit-one" />
                          <span className="artifact-orbit artifact-orbit-two" />
                          <span className="artifact-core" />
                          <span className="artifact-node artifact-node-one" />
                          <span className="artifact-node artifact-node-two" />
                          <span className="artifact-node artifact-node-three" />
                          <span className="artifact-leaf" />
                          <span className="artifact-podium"><i /><i /><i /></span>
                          <span className="artifact-helix"><i /><i /><i /><i /><i /><i /></span>
                        </div>
                        <div className="course-artifact-controls" role="group" aria-label="Explore course themes">
                          {["Molecule", "Botanical", "Practice", "DNA"].map((label, index) => (
                            <button
                              key={label}
                              type="button"
                              className={activeCourseArtifact === index ? "active" : ""}
                              aria-pressed={activeCourseArtifact === index}
                              onClick={() => {
                                setActiveCourseArtifact(index)
                                window.dispatchEvent(new CustomEvent("homepage-course-artifact", { detail: index }))
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mobile-carousel-shell">
                        <div
                          ref={courseTrackRef}
                          className="courses-grid mobile-carousel-track"
                          onScroll={(event) => {
                            const nextIndex = getSnapIndex(event.currentTarget)
                            setActiveCourseIndex((current) => (current === nextIndex ? current : nextIndex))
                          }}
                        >
                          {courses.length > 0 ? (
                            courses.map((course) => (
                              <Link
                                key={course.id}
                                to={`/courses/${course.slug || course.id}`}
                                className="course-card"
                                onPointerMove={handleCard3DPointerMove}
                                onPointerLeave={resetCard3DTilt}
                              >
                                <div className="course-thumb">
                                  {course.image_url ? (
                                    <img src={course.image_url} alt={course.title} className="course-thumb-img" />
                                  ) : (
                                    <BookOpen size={32} />
                                  )}
                                </div>

                                <div className="course-body">
                                  {course.category && <span className="course-category-badge">{course.category.toUpperCase()}</span>}
                                  <h3>{course.title}</h3>
                                  <p>
                                    {(course.short_desc || course.description || "").length > 100
                                      ? `${(course.short_desc || course.description).substring(0, 100)}...`
                                      : (course.short_desc || course.description)}
                                  </p>
                                  <div className="course-meta">
                                    <span className="price">{course.is_free ? "Free" : `KES ${course.price}`}</span>
                                  </div>
                                </div>
                              </Link>
                            ))
                          ) : coursesError ? (
                            <div className="empty-state">
                              <p>We could not load courses right now. <Link to="/courses">Browse all courses</Link>.</p>
                            </div>
                          ) : loading ? (
                            <div className="empty-state">
                              <p>Loading courses...</p>
                            </div>
                          ) : (
                            <div className="empty-state">
                              <p>No published courses are available right now. <Link to="/courses">Browse all courses</Link>.</p>
                            </div>
                          )}
                        </div>

                        {courses.length > 1 && (
                          <div className="mobile-carousel-nav" aria-label="Course navigation">
                            <button
                              type="button"
                              className="mobile-carousel-button"
                              aria-label="Previous course"
                              onClick={() => goToCourse(Math.max(0, activeCourseIndex - 1))}
                              disabled={activeCourseIndex === 0}
                            >
                              <ChevronLeft size={18} />
                            </button>

                            <div className="mobile-carousel-dots">
                              {courses.map((course, index) => (
                                <button
                                  key={course.id}
                                  type="button"
                                  className={`mobile-carousel-dot${activeCourseIndex === index ? " active" : ""}`}
                                  aria-label={`Go to course ${index + 1}`}
                                  aria-pressed={activeCourseIndex === index}
                                  onClick={() => goToCourse(index)}
                                />
                              ))}
                            </div>

                            <button
                              type="button"
                              className="mobile-carousel-button"
                              aria-label="Next course"
                              onClick={() => goToCourse(Math.min(courses.length - 1, activeCourseIndex + 1))}
                              disabled={activeCourseIndex === courses.length - 1}
                            >
                              <ChevronRight size={18} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div style={{ textAlign: "center", marginTop: "2rem" }}>
                        <Link to={config.primary_btn_url || "/courses"} className="btn-secondary">
                          {config.primary_btn_text || "View all courses"}
                        </Link>
                      </div>
                    </div>
                  </section>

                  <section className="blog-preview-section">
                    <div className="container">
                      <div className="section-header">
                        <span className="section-badge">Latest from the Blog</span>
                        <KineticHeading>Practical ideas for pharmacy teams</KineticHeading>
                        <p>Insights on clinical practice, technology, and healthcare operations.</p>
                      </div>

                      <div className="blog-story-scene" aria-hidden="true">
                        <div className="blog-page blog-page-back"><i /><i /><i /><i /></div>
                        <div className="blog-page blog-page-mid"><i /><i /><i /><i /></div>
                        <div className="blog-page blog-page-front"><i /><i /><i /><i /></div>
                        <div className="blog-iv"><span /><i /><b /></div>
                        <span className="blog-story-glint" />
                      </div>

                      <div className="mobile-carousel-shell">
                        <div
                          ref={blogTrackRef}
                          className="blog-preview-grid mobile-carousel-track"
                          onScroll={(event) => {
                            const nextIndex = getSnapIndex(event.currentTarget)
                            setActivePostIndex((current) => (current === nextIndex ? current : nextIndex))
                          }}
                        >
                          {latestPosts.length > 0 ? (
                            latestPosts.map((post) => {
                              const categoryLabel = getBlogCategoryLabel(post.category)

                              return (
                                <Link
                                  key={post.id}
                                  to={`/blog/${post.slug}`}
                                  className="blog-preview-card"
                                  onPointerMove={handleCard3DPointerMove}
                                  onPointerLeave={resetCard3DTilt}
                                >
                                  {post.cover_image_url ? (
                                    <img src={post.cover_image_url} alt={post.title} className="blog-preview-image" />
                                  ) : (
                                    <div
                                      className="blog-preview-image blog-preview-image-fallback"
                                      style={{ background: getBlogCoverFallback(post.category) }}
                                    >
                                      <span>{categoryLabel}</span>
                                    </div>
                                  )}

                                  <div className="blog-preview-body">
                                    <div className="blog-preview-meta">
                                      <span className="blog-preview-badge">{categoryLabel}</span>
                                      <span>{formatBlogDate(post.published_at || post.created_at)}</span>
                                    </div>
                                    <h3>{post.title}</h3>
                                    <p>{getBlogExcerpt(post)}</p>
                                    <BlogEngagementStats
                                      className="blog-preview-stats"
                                      viewCount={post.view_count}
                                      likeCount={post.like_count}
                                    />
                                    <div className="blog-preview-footer">
                                      {post.author_name && <span>{post.author_name}</span>}
                                      <span>Read more</span>
                                    </div>
                                  </div>
                                </Link>
                              )
                            })
                          ) : postsError ? (
                            <div className="empty-state">
                              <p>We could not load articles right now. <Link to="/blog">Browse all articles</Link>.</p>
                            </div>
                          ) : loading ? (
                            <div className="empty-state">
                              <p>Loading articles...</p>
                            </div>
                          ) : (
                            <div className="empty-state">
                              <p>No published articles are available right now. <Link to="/blog">Browse all articles</Link>.</p>
                            </div>
                          )}
                        </div>

                        {latestPosts.length > 1 && (
                          <div className="mobile-carousel-nav" aria-label="Article navigation">
                            <button
                              type="button"
                              className="mobile-carousel-button"
                              aria-label="Previous article"
                              onClick={() => goToPost(Math.max(0, activePostIndex - 1))}
                              disabled={activePostIndex === 0}
                            >
                              <ChevronLeft size={18} />
                            </button>

                            <div className="mobile-carousel-dots">
                              {latestPosts.map((post, index) => (
                                <button
                                  key={post.id}
                                  type="button"
                                  className={`mobile-carousel-dot${activePostIndex === index ? " active" : ""}`}
                                  aria-label={`Go to article ${index + 1}`}
                                  aria-pressed={activePostIndex === index}
                                  onClick={() => goToPost(index)}
                                />
                              ))}
                            </div>

                            <button
                              type="button"
                              className="mobile-carousel-button"
                              aria-label="Next article"
                              onClick={() => goToPost(Math.min(latestPosts.length - 1, activePostIndex + 1))}
                              disabled={activePostIndex === latestPosts.length - 1}
                            >
                              <ChevronRight size={18} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div style={{ textAlign: "center", marginTop: "2rem" }}>
                        <Link to="/blog" className="btn-secondary">View all articles</Link>
                      </div>
                    </div>
                  </section>
                </>
              </AnimatedSection>
            )

          case "testimonials":
            if (!testimonialsError && testimonials.length === 0) return null

            return (
              <AnimatedSection key={key} delay={0.6}>
                <section id="testimonials" className="testimonials-section">
                  <div className="container">
                    <div className="section-header">
                      {config.badge_text && <span className="section-badge">{config.badge_text}</span>}
                      <KineticHeading>{config.heading || "Learners who finished the course"}</KineticHeading>
                    </div>

                    <div className="testimonials-grid">
                      {testimonials.map((testimonial) => (
                        <div
                          key={testimonial.id}
                          className="testimonial-card"
                          onPointerMove={handleCard3DPointerMove}
                          onPointerLeave={resetCard3DTilt}
                        >
                          <div className="testimonial-rating" aria-label={`${testimonial.rating || 5} star rating`}>
                            {"★".repeat(Math.max(1, Math.min(5, testimonial.rating || 5)))}
                          </div>
                          <p>"{getTruncatedReview(testimonial.review_text)}"</p>
                          <div className="testimonial-author">
                            {testimonial.author_photo_url ? (
                              <img
                                src={testimonial.author_photo_url}
                                alt={testimonial.author_name}
                                className="testimonial-avatar"
                              />
                            ) : (
                              <div className="testimonial-avatar testimonial-avatar-fallback">
                                {getTestimonialInitials(testimonial.author_name)}
                              </div>
                            )}
                            <div>
                              <strong>{testimonial.author_name}</strong>
                              <small>{testimonial.author_title}</small>
                            </div>
                          </div>
                        </div>
                      ))}
                      {testimonialsError && <div className="empty-state">Learner reviews could not be loaded right now.</div>}
                    </div>
                  </div>
                </section>
              </AnimatedSection>
            )

          case "faq":
            return (
              <AnimatedSection key={key} delay={0.8}>
                <section id="faq" className="faq-section">
                  <div className="container">
                    <div className="section-header">
                      {config.badge_text && <span className="section-badge">{config.badge_text}</span>}
                      <KineticHeading>{config.heading || "Need help getting started?"}</KineticHeading>
                    </div>

                    <div className="faq-grid">
                      <details className="faq-card" onToggle={(event) => window.dispatchEvent(new CustomEvent("homepage-faq-toggle", { detail: event.currentTarget.open }))} onPointerMove={handleCard3DPointerMove} onPointerLeave={resetCard3DTilt}><summary>How can I access the courses?</summary><p>Browse the course list, register, and enroll. Introductory lessons are easy to start, and certificate access opens once you finish.</p></details>
                      <details className="faq-card" onToggle={(event) => window.dispatchEvent(new CustomEvent("homepage-faq-toggle", { detail: event.currentTarget.open }))} onPointerMove={handleCard3DPointerMove} onPointerLeave={resetCard3DTilt}><summary>What if I do not understand a topic?</summary><p>Every course includes downloadable resources and support notes so you can review concepts anytime.</p></details>
                      <details className="faq-card" onToggle={(event) => window.dispatchEvent(new CustomEvent("homepage-faq-toggle", { detail: event.currentTarget.open }))} onPointerMove={handleCard3DPointerMove} onPointerLeave={resetCard3DTilt}><summary>Can I study at my own pace?</summary><p>Yes. Lessons are self-paced and available anytime so you can learn around your schedule.</p></details>
                      <details className="faq-card" onToggle={(event) => window.dispatchEvent(new CustomEvent("homepage-faq-toggle", { detail: event.currentTarget.open }))} onPointerMove={handleCard3DPointerMove} onPointerLeave={resetCard3DTilt}><summary>Who teaches the courses?</summary><p>Courses are created by experienced pharmacy educators and industry professionals.</p></details>
                    </div>
                  </div>
                </section>
              </AnimatedSection>
            )

          case "cta":
            return (
              <AnimatedSection key={key} delay={0.9}>
                <section id="cta" className="cta-section">
                  <div className="container">
                    <div className="cta-content">
                      <button
                        type="button"
                        className={`cta-capsule-orbit${capsuleBurst ? " is-bursting" : ""}`}
                        aria-label="Open the capsule"
                        onClick={() => {
                          setCapsuleBurst((current) => current + 1)
                          window.dispatchEvent(new Event("homepage-cta-burst"))
                        }}
                      >
                        <span key={`capsule-${capsuleBurst}`} className="cta-capsule"><i /></span>
                        <span key={`confetti-${capsuleBurst}`} className="cta-capsule-confetti" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
                      </button>
                      <KineticHeading>{config.heading || "Ready to transform your pharmacy practice?"}</KineticHeading>
                      {config.subheading && <p>{config.subheading}</p>}
                      <div className="cta-buttons">
                        <Link to={config.primary_btn_url || "/register"} className="btn-primary">
                          {config.primary_btn_text || "Start Learning Free"}
                        </Link>
                        <a href={config.secondary_btn_url || WHATSAPP} className="btn-whatsapp">
                          {config.secondary_btn_text || "Book a Demo"}
                        </a>
                      </div>
                    </div>
                  </div>
                </section>
              </AnimatedSection>
            )

          default:
            return null
        }
      })}
    </div>
  )
}
