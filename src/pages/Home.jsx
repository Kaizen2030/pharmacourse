import { useEffect, useState, useRef } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { motion, useInView } from "framer-motion"
import SEO from "../components/SEO"
import BlogEngagementStats from "../components/BlogEngagementStats"
import { SITE_URL } from "../lib/siteConfig"
import { formatBlogDate, getBlogCategoryLabel, getBlogCoverFallback, getBlogExcerpt } from "../lib/blogHelpers"
import pharmacyosDashboard from "../assets/pharmacyos-dashboard.svg"
import pharmacourseHeroVisual from "../assets/pharmacourse-hero-visual.svg"
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

const DEFAULT_SECTIONS = {
  hero: {
    enabled: true,
    order: 1,
    heading: "Transform Pharmacy Operations & Education",
    subheading: "An integrated platform combining clinic management, healthcare delivery, and professional education in one ecosystem.",
    badge_text: "Complete Pharmacy Ecosystem",
    primary_btn_text: "Book Platform Demo",
    primary_btn_url: WHATSAPP,
    secondary_btn_text: "Start Learning",
    secondary_btn_url: "/courses",
    video_url: "/images/pharmacourse-demo.mp4",
  },
  ecosystem: {
    enabled: true,
    order: 2,
    heading: "One company. Three platforms. Built for pharmacy in Africa.",
    subheading: "AI-powered pharmacy technology for Kenyan and African healthcare",
    badge_text: "The RemedaCare Ecosystem",
  },
  pharmacyOS: {
    enabled: true,
    order: 3,
    heading: "Everything your pharmacy needs. In one desktop app.",
    subheading: "Built specifically for Kenyan retail pharmacies with SHA, eTIMS/KRA, M-Pesa, and PPB narcotics reporting.",
    badge_text: "PharmacyOS",
    primary_btn_text: "Book a Demo",
    primary_btn_url: WHATSAPP,
    video_url: "/images/pharmacyos-demo.mp4",
  },
  remedacareOS: {
    enabled: true,
    order: 4,
    heading: "From clinic to dispensary. One connected system.",
    subheading: "Full HMIS built for Kenyan hospitals with patient records, billing, MOH reports, and PharmacyOS integration.",
    badge_text: "RemedacareOS",
    primary_btn_text: "Explore RemedacareOS",
    primary_btn_url: "/remedacareos",
    video_url: "/images/remedacareos-demo.mp4",
  },
  features: {
    enabled: true,
    order: 5,
    heading: "Accelerate your career with practical skills",
    badge_text: "Key Features",
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
    enabled: true,
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
    heading: "Ready to transform your pharmacy practice?",
    subheading: "Join PharmaCourse for learning, or book a demo to see PharmacyOS and RemedacareOS in action.",
    primary_btn_text: "Start Learning Free",
    primary_btn_url: "/register",
    secondary_btn_text: "Book a Demo",
    secondary_btn_url: WHATSAPP,
  },
}

const FALLBACK_TESTIMONIALS = [
  {
    id: "fallback-1",
    author_name: "Dr. Amina",
    author_title: "Clinical Pharmacist",
    author_photo_url: "",
    rating: 5,
    review_text: "This course helped me understand antimicrobial stewardship with confidence. The lessons were clear and practical.",
  },
  {
    id: "fallback-2",
    author_name: "Hospital pharmacy professional",
    author_title: "Pharmacy Professional",
    author_photo_url: "",
    rating: 5,
    review_text: "Great structure and practical examples. I can now recommend the right therapies with more confidence.",
  },
]

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

const AnimatedSection = ({ children, delay = 0 }) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.6, delay }}
    >
      {children}
    </motion.div>
  )
}

const ProductMockup = ({ type }) => {
  const configs = {
    pharmacyOS: {
      color: "#0F6E56",
      bg: "#e8f5f0",
      title: "PharmacyOS POS",
      rows: ["Amoxicillin 500mg x 2", "Prednisolone 5mg x 30", "Vitamin B Complex x 1"],
      badge: "M-Pesa ready",
      total: "KES 1,240",
    },
    remedacareOS: {
      color: "#1A6BB5",
      bg: "#e8f0fb",
      title: "RemedacareOS HMIS",
      rows: ["Patient: John Mwangi", "Diagnosis: Hypertension", "Rx: Amlodipine 5mg OD"],
      badge: "MOH ready",
      total: "SHA claim ready",
    },
    pharmaCourse: {
      color: "#0F6E56",
      bg: "#eef8f4",
      title: "PharmaCourse",
      rows: ["Module 3: Drug Interactions", "Quiz score: 8/10", "Certificate progress: 72%"],
      badge: "CPD ready",
      total: "Progress: 72%",
    },
  }

  const c = configs[type] || configs.pharmacyOS

  if (type === "pharmaCourse") {
    return (
      <div className="product-mockup">
        <div className="mockup-frame" style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
          <img
            src={pharmacourseHeroVisual}
            alt="PharmaCourse My Learning dashboard showing learner progress, enrolled courses and certificates"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      </div>
    )
  }

  if (type === "pharmacyOS") {
    return (
      <div className="product-mockup">
        <div className="mockup-frame" style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
          <img
            src={pharmacyosDashboard}
            alt="PharmacyOS dashboard showing branch overview, revenue, inventory insights and recent sales"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      </div>
    )
  }

  if (type === "remedacareOS") {
    return (
      <div className="product-mockup">
        <div className="mockup-frame" style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
          <img
            src={remedacareDashboard}
            alt="RemedacareOS dashboard showing patient, admissions, finance and pharmacy workflow panels"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
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
  const [testimonials, setTestimonials] = useState([])
  const [latestPosts, setLatestPosts] = useState([])
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

        if (!sectionError && sectionData && sectionData.length > 0) {
          const sectionsObj = {}

          sectionData.forEach((s) => {
            sectionsObj[s.section_key] = {
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
            }
          })

          setSections((prev) => ({ ...prev, ...sectionsObj }))
        }

        const { data: courseData } = await supabase
          .from("courses")
          .select("id, slug, title, short_desc, description, category, is_free, price, image_url")
          .eq("is_published", true)
          .limit(5)

        if (courseData) setCourses(courseData)

        const { data: blogData } = await supabase
          .from("blog_posts")
          .select("*")
          .eq("is_published", true)
          .order("published_at", { ascending: false })
          .limit(5)

        if (blogData) setLatestPosts(blogData)

        const { data: testimonialData } = await supabase
          .from("testimonials")
          .select("id, author_name, author_title, author_photo_url, rating, review_text")
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(6)

        if (testimonialData) setTestimonials(testimonialData)
      } catch (err) {
        console.error("Error loading data:", err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const sortedSections = Object.entries(sections)
    .filter(([_, config]) => config.enabled)
    .sort((a, b) => (a[1].order || 999) - (b[1].order || 999))

  useEffect(() => {
    const nodes = sortedSections
      .map(([key]) => document.getElementById(key))
      .filter(Boolean)

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

  if (loading) return <div className="home-loading">Loading...</div>

  return (
    <div className="home">
      <SEO
        title="Pharmacy CPD Courses, PharmacyOS & RemedacareOS Kenya"
        description="PharmaCourse helps Kenyan pharmacy professionals learn practical skills, earn certificates, and explore PharmacyOS and RemedacareOS software."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "PharmaCourse",
          url: SITE_URL,
          logo: `${SITE_URL}/favicon.svg`,
          description:
            "Kenyan pharmacy education and health-tech platform offering CPD courses, PharmacyOS, and RemedacareOS.",
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
      </div>

      {sortedSections.map(([key, config]) => {
        switch (key) {
          case "hero":
            return (
              <AnimatedSection key={key}>
                <section id="hero" className="hero-section">
                  <div className="container">
                    <div className="hero-content-top">
                      {config.badge_text && <span className="hero-badge">{config.badge_text}</span>}
                      <h1>{config.heading || "Transform Pharmacy Operations & Education"}</h1>
                      <p>{config.subheading || ""}</p>
                    </div>

                    <div className="hero-services-grid">
                      <div className="service-showcase">
                        <div className="service-icon pharmacyos"><CreditCard size={32} /></div>
                        <h3>PharmacyOS</h3>
                        <p>Complete pharmacy operations management: inventory, billing, compliance, and patient records in one system.</p>
                        <Link to="/pharmacyos" className="service-link">Learn More <ChevronRight size={16} /></Link>
                      </div>

                      <div className="service-showcase">
                        <div className="service-icon remedacareos"><Users size={32} /></div>
                        <h3>RemedacareOS</h3>
                        <p>Healthcare delivery software connecting patients, pharmacists, and clinicians for better care coordination.</p>
                        <Link to="/remedacareos" className="service-link">Learn More <ChevronRight size={16} /></Link>
                      </div>

                      <div className="service-showcase">
                        <div className="service-icon pharmacourse"><BookOpen size={32} /></div>
                        <h3>PharmaCourse</h3>
                        <p>Professional CPD courses with certificates to help pharmacy teams keep sharpening practical skills.</p>
                        <Link to="/courses" className="service-link">Explore Courses <ChevronRight size={16} /></Link>
                      </div>
                    </div>

                    <div className="hero-grid-main">
                      <div className="hero-visual">
                        <ProductMockup type="pharmaCourse" />
                      </div>

                      <div className="hero-content">
                        <div className="hero-value-prop">
                          <h2>Why Choose Our Ecosystem?</h2>
                          <ul className="hero-benefits">
                            <li><span className="check">Core</span><div><strong>Integrated suite:</strong> operations, care delivery, and learning stay connected.</div></li>
                            <li><span className="check">Scale</span><div><strong>Scalable growth:</strong> start with one product and expand as your team grows.</div></li>
                            <li><span className="check">Data</span><div><strong>Data-led decisions:</strong> analytics across the ecosystem help you act faster.</div></li>
                            <li><span className="check">Ready</span><div><strong>Compliance ready:</strong> built for real pharmacy and clinical workflows.</div></li>
                          </ul>

                          <div className="hero-actions">
                            <a href={config.primary_btn_url || WHATSAPP} className="btn-primary">
                              {config.primary_btn_text || "Book Platform Demo"}
                            </a>
                            <Link to={config.secondary_btn_url || "/courses"} className="btn-secondary">
                              {config.secondary_btn_text || "Start Learning"}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="hero-stats">
                      <div className="stat-item"><div className="stat-number">3+</div><div className="stat-label">Integrated Platforms</div></div>
                      <div className="stat-item"><div className="stat-number">100+</div><div className="stat-label">CPD Lessons</div></div>
                      <div className="stat-item"><div className="stat-number">24/7</div><div className="stat-label">System Access</div></div>
                      <div className="stat-item"><div className="stat-number">1</div><div className="stat-label">Connected Ecosystem</div></div>
                    </div>
                  </div>
                </section>
              </AnimatedSection>
            )

          case "ecosystem":
            return (
              <AnimatedSection key={key} delay={0.1}>
                <section id="ecosystem" className="ecosystem-section">
                  <div className="container">
                    <div className="section-header">
                      {config.badge_text && <span className="section-badge">{config.badge_text}</span>}
                      <h2>{config.heading || "One company. Three platforms. Built for pharmacy in Africa."}</h2>
                      {config.subheading && <p>{config.subheading}</p>}
                    </div>

                    <div className="platform-grid">
                      <div className="platform-card">
                        <BookOpen size={32} />
                        <span className="platform-status">Live Now</span>
                        <h3>PharmaCourse</h3>
                        <p>Online CPD learning platform with self-paced courses, certificates, and clinical case simulations.</p>
                        <Link to="/courses" className="platform-link">Explore courses <ChevronRight size={16} /></Link>
                      </div>

                      <div className="platform-card featured">
                        <ShoppingCart size={32} />
                        <span className="platform-status">Available</span>
                        <h3>PharmacyOS</h3>
                        <p>AI-powered dispensary management with POS, inventory, SHA claims, and M-Pesa integration.</p>
                        <Link to="/pharmacyos" className="platform-link">Explore PharmacyOS <ChevronRight size={16} /></Link>
                      </div>

                      <div className="platform-card">
                        <Building2 size={32} />
                        <span className="platform-status">Available</span>
                        <h3>RemedacareOS</h3>
                        <p>Full hospital management system with patient records, billing, and MOH reporting.</p>
                        <Link to="/remedacareos" className="platform-link">Explore RemedacareOS <ChevronRight size={16} /></Link>
                      </div>
                    </div>
                  </div>
                </section>
              </AnimatedSection>
            )

          case "pharmacyOS":
            return (
              <AnimatedSection key={key} delay={0.2}>
                <section id="pharmacyOS" className="product-section">
                  <div className="container">
                    <div className="product-grid reverse">
                      <div className="product-heading">
                        {config.badge_text && <span className="section-badge">{config.badge_text}</span>}
                        <h2>{config.heading || "Everything your pharmacy needs. In one desktop app."}</h2>
                        {config.subheading && <p>{config.subheading}</p>}
                      </div>

                      <div className="product-visual">
                        <ProductMockup type="pharmacyOS" />
                      </div>

                      <div className="product-features">
                        <div className="feature-list">
                          {[
                            { icon: ShoppingCart, text: "Sales and POS with M-Pesa" },
                            { icon: Package, text: "Real-time inventory management" },
                            { icon: AlertTriangle, text: "Automated expiry alerts" },
                            { icon: CreditCard, text: "SHA and insurance claims" },
                          ].map((feature, idx) => (
                            <div key={idx} className="feature-item">
                              <feature.icon size={20} />
                              <span>{feature.text}</span>
                            </div>
                          ))}
                        </div>

                        <Link to="/pharmacyos" className="btn-primary">
                          {config.primary_btn_text || "Explore PharmacyOS"}
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
                    <div className="product-grid">
                      <div className="product-heading">
                        {config.badge_text && <span className="section-badge">{config.badge_text}</span>}
                        <h2>{config.heading || "From clinic to dispensary. One connected system."}</h2>
                        {config.subheading && <p>{config.subheading}</p>}
                      </div>

                      <div className="product-visual">
                        <ProductMockup type="remedacareOS" />
                      </div>

                      <div className="product-features">
                        <div className="feature-list">
                          {[
                            { icon: ClipboardList, text: "Complete patient records" },
                            { icon: BarChart3, text: "Government-compliant reports" },
                            { icon: Users, text: "Multi-role access control" },
                            { icon: Link2, text: "Seamless PharmacyOS integration" },
                          ].map((feature, idx) => (
                            <div key={idx} className="feature-item">
                              <feature.icon size={20} />
                              <span>{feature.text}</span>
                            </div>
                          ))}
                        </div>

                        <Link to="/remedacareos" className="btn-primary">
                          {config.primary_btn_text || "Explore RemedacareOS"}
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
                      <h2>{config.heading || "Accelerate your career with practical skills"}</h2>
                    </div>

                    <div className="features-grid">
                      {[
                        { icon: BookOpen, title: "Self-Paced Learning", desc: "Learn at your own speed with short, focused modules." },
                        { icon: Download, title: "Downloadable Resources", desc: "Clinical notes and reference materials included." },
                        { icon: Award, title: "CPD Certificates", desc: "Earn certificates for your professional portfolio." },
                      ].map((feature, idx) => (
                        <div key={idx} className="feature-card">
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
                        <h2>{config.heading || "Courses built for real-world practice"}</h2>
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
                              <Link key={course.id} to={`/courses/${course.slug || course.id}`} className="course-card">
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
                          ) : (
                            <div className="empty-state">
                              <p>Courses launching soon. <Link to="/register">Register now</Link> to be notified.</p>
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
                        <h2>Fresh ideas for pharmacy practice and operations</h2>
                        <p>Read quick, practical articles from the PharmaCourse team and contributors.</p>
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
                                <Link key={post.id} to={`/blog/${post.slug}`} className="blog-preview-card">
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
                                      <span>{post.author_name || "PharmaCourse Team"}</span>
                                      <span>Read more</span>
                                    </div>
                                  </div>
                                </Link>
                              )
                            })
                          ) : (
                            <div className="empty-state">
                              <p>Blog posts are on the way. Check back soon for fresh articles.</p>
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
            return (
              <AnimatedSection key={key} delay={0.6}>
                <section id="testimonials" className="testimonials-section">
                  <div className="container">
                    <div className="section-header">
                      {config.badge_text && <span className="section-badge">{config.badge_text}</span>}
                      <h2>{config.heading || "Learners who finished the course"}</h2>
                    </div>

                    <div className="testimonials-grid">
                      {(testimonials.length > 0 ? testimonials : FALLBACK_TESTIMONIALS).map((testimonial) => (
                        <div key={testimonial.id} className="testimonial-card">
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
                    </div>
                  </div>
                </section>
              </AnimatedSection>
            )

          case "stats":
            return (
              <AnimatedSection key={key} delay={0.7}>
                <section id="stats" className="stats-section">
                  <div className="container">
                    <div className="section-header">
                      {config.badge_text && <span className="section-badge">{config.badge_text}</span>}
                      <h2>{config.heading || "Trusted by pharmacy professionals"}</h2>
                    </div>

                    <div className="stats-grid">
                      <div className="stat-card"><div className="stat-number">120+</div><p>Hours of focused learning content.</p></div>
                      <div className="stat-card"><div className="stat-number">5,000+</div><p>Pharmacy professionals enrolled.</p></div>
                      <div className="stat-card"><div className="stat-number">95%</div><p>Satisfied learners after course completion.</p></div>
                      <div className="stat-card"><div className="stat-number">100%</div><p>Professional development credits available.</p></div>
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
                      <h2>{config.heading || "Need help getting started?"}</h2>
                    </div>

                    <div className="faq-grid">
                      <div className="faq-card"><h3>How can I access the courses?</h3><p>Browse the course list, register, and enroll. Introductory lessons are easy to start, and certificate access opens once you finish.</p></div>
                      <div className="faq-card"><h3>What if I do not understand a topic?</h3><p>Every course includes downloadable resources and support notes so you can review concepts anytime.</p></div>
                      <div className="faq-card"><h3>Can I study at my own pace?</h3><p>Yes. Lessons are self-paced and available anytime so you can learn around your schedule.</p></div>
                      <div className="faq-card"><h3>Who teaches the courses?</h3><p>Courses are created by experienced pharmacy educators and industry professionals.</p></div>
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
                      <h2>{config.heading || "Ready to transform your pharmacy practice?"}</h2>
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
