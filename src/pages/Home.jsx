import { useEffect, useState, useRef } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { motion, useInView } from "framer-motion"
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
  Play,
  ChevronRight
} from "lucide-react"
import "./Home.css"

const WHATSAPP = "https://wa.me/254790059584?text=Hi%20Julius%2C%20I%27d%20like%20to%20book%20a%20demo%20of%20your%20platform."

const DEFAULT_SECTIONS = {
  hero: {
    enabled: true,
    order: 1,
    heading: "Transform Pharmacy Operations & Education",
    subheading: "An integrated platform combining clinic management, healthcare delivery, and professional education—all in one powerful ecosystem.",
    badge_text: "Complete Pharmacy Ecosystem",
    primary_btn_text: "Book Platform Demo",
    primary_btn_url: WHATSAPP,
    secondary_btn_text: "Start Learning",
    secondary_btn_url: "/courses",
    video_url: "/images/pharmacourse-demo.mp4"
  },
  ecosystem: {
    enabled: true,
    order: 2,
    heading: "One company. Three platforms. Built for pharmacy in Africa.",
    subheading: "AI-powered pharmacy technology for Kenyan and African healthcare",
    badge_text: "The RemedaCare Ecosystem"
  },
  pharmacyOS: {
    enabled: true,
    order: 3,
    heading: "Everything your pharmacy needs. In one desktop app.",
    subheading: "Built specifically for Kenyan retail pharmacies with SHA, eTIMS/KRA, M-Pesa, and PPB narcotics reporting.",
    badge_text: "PharmacyOS",
    primary_btn_text: "Book a Demo",
    primary_btn_url: WHATSAPP,
    video_url: "/images/pharmacyos-demo.mp4"
  },
  remedacareOS: {
    enabled: true,
    order: 4,
    heading: "From clinic to dispensary. One connected system.",
    subheading: "Full HMIS built for Kenyan hospitals with patient records, billing, MOH reports, and PharmacyOS integration.",
    badge_text: "RemedacareOS",
    primary_btn_text: "Explore RemedacareOS",
    primary_btn_url: "/remedacareos",
    video_url: "/images/remedacareos-demo.mp4"
  },
  features: {
    enabled: true,
    order: 5,
    heading: "Accelerate your career with practical skills",
    badge_text: "Key Features"
  },
  courses: {
    enabled: true,
    order: 6,
    heading: "Courses built for real-world practice",
    badge_text: "Our Curriculum",
    primary_btn_text: "View all courses",
    primary_btn_url: "/courses"
  },
  testimonials: {
    enabled: true,
    order: 7,
    heading: "Learners who finished the course",
    badge_text: "Reviews"
  },
  stats: {
    enabled: true,
    order: 8,
    heading: "Trusted by pharmacy professionals",
    badge_text: "Statistics"
  },
  faq: {
    enabled: true,
    order: 9,
    heading: "Need help getting started?",
    badge_text: "Frequently Asked Questions"
  },
  cta: {
    enabled: true,
    order: 10,
    heading: "Ready to transform your pharmacy practice?",
    subheading: "Join PharmaCourse for learning, or book a demo to see PharmacyOS and RemedacareOS in action.",
    primary_btn_text: "Start Learning Free",
    primary_btn_url: "/register",
    secondary_btn_text: "Book a Demo",
    secondary_btn_url: WHATSAPP
  }
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

// VIDEO ALWAYS RENDERS — no hover gate, error fallback built in
const ProductMockup = ({ type }) => {
  const configs = {
    pharmacyOS: {
      color: "#0F6E56", bg: "#e8f5f0", title: "PharmacyOS POS",
      rows: ["💊 Amoxicillin 500mg × 2", "🧴 Prednisolone 5mg × 30", "💉 Vitamin B Complex × 1"],
      badge: "M-Pesa ✓", total: "KES 1,240"
    },
    remedacareOS: {
      color: "#1A6BB5", bg: "#e8f0fb", title: "RemedacareOS HMIS",
      rows: ["👤 Patient: John Mwangi", "📋 Diagnosis: Hypertension", "💊 Rx: Amlodipine 5mg OD"],
      badge: "MOH ✓", total: "SHA Claim Ready"
    },
    pharmaCourse: {
      color: "#7C3AED", bg: "#f3eeff", title: "PharmaCourse",
      rows: ["📘 Module 3: Drug Interactions", "✅ Quiz: 8/10 correct", "🏆 Certificate: 72% complete"],
      badge: "CPD ✓", total: "Progress: 72%"
    }
  }
  const c = configs[type] || configs.pharmacyOS

  return (
    <div className="product-mockup">
      <div className="mockup-frame" style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
        {/* Window bar */}
        <div style={{ background: "#f4f4f4", padding: "10px 14px", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid #e8e8e8" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
          <span style={{ fontSize: 11, color: "#999", marginLeft: 8, fontFamily: "monospace" }}>{c.title}</span>
        </div>
        {/* Content */}
        <div style={{ padding: "1.25rem", background: "#fafafa" }}>
          <div style={{ background: c.bg, borderRadius: 8, padding: "10px 12px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{c.title}</span>
            <span style={{ fontSize: 10, background: c.color, color: "#fff", borderRadius: 99, padding: "2px 8px", fontWeight: 700 }}>{c.badge}</span>
          </div>
          {c.rows.map((row, i) => (
            <div key={i} style={{
              background: "#fff", border: "1px solid #eee", borderRadius: 7,
              padding: "9px 12px", marginBottom: 7, fontSize: 12, color: "#333",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              animation: `slideIn 0.4s ease ${i * 0.12}s both`
            }}>
              <span>{row}</span>
              <span style={{ fontSize: 10, color: "#aaa" }}>✓</span>
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
  const [courses, setCourses]   = useState([])
  const [activeSection, setActiveSection] = useState("hero")
  const [sections, setSections] = useState(DEFAULT_SECTIONS)
  const [loading, setLoading]   = useState(true)

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
          sectionData.forEach(s => {
            sectionsObj[s.section_key] = {
              enabled:           s.enabled,
              order:             s.order_index,
              heading:           s.heading,
              subheading:        s.subheading,
              body:              s.body,
              badge_text:        s.badge_text,
              primary_btn_text:  s.primary_btn_text,
              primary_btn_url:   s.primary_btn_url,
              secondary_btn_text:s.secondary_btn_text,
              secondary_btn_url: s.secondary_btn_url,
              video_url:         s.video_url,
              image_url:         s.image_url
            }
          })
          setSections(prev => ({ ...prev, ...sectionsObj }))
        }

        const { data: courseData } = await supabase
          .from("courses")
          .select("id, title, short_desc, description, category, is_free, price, image_url")
          .eq("is_published", true)
          .limit(3)

        if (courseData) setCourses(courseData)
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

  if (loading) return <div className="home-loading">Loading...</div>

  return (
    <div className="home">
      {/* Section nav dots */}
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

          /* ── HERO ───────────────────────────────────────────────── */
          case "hero":
            return (
              <AnimatedSection key={key}>
                <section id="hero" className="hero-section">
                  <div className="container">

                    {/* Top centered heading */}
                    <div className="hero-content-top">
                      {config.badge_text && <span className="hero-badge">{config.badge_text}</span>}
                      <h1>{config.heading || "Transform Pharmacy Operations & Education"}</h1>
                      <p>{config.subheading || ""}</p>
                    </div>

                    {/* Services row */}
                    <div className="hero-services-grid">
                      <div className="service-showcase">
                        <div className="service-icon pharmacyos"><CreditCard size={32} /></div>
                        <h3>PharmacyOS</h3>
                        <p>Complete pharmacy operations management—inventory, billing, compliance, and patient records in one unified system.</p>
                        <Link to="/pharmacyos" className="service-link">Learn More <ChevronRight size={16} /></Link>
                      </div>
                      <div className="service-showcase">
                        <div className="service-icon remedacareos"><Users size={32} /></div>
                        <h3>RemedacareOS</h3>
                        <p>Healthcare delivery platform connecting patients with pharmacists and healthcare providers for integrated care management.</p>
                        <Link to="/remedacareos" className="service-link">Learn More <ChevronRight size={16} /></Link>
                      </div>
                      <div className="service-showcase">
                        <div className="service-icon pharmacourse"><BookOpen size={32} /></div>
                        <h3>PharmaCourse</h3>
                        <p>Professional CPD courses with certification—continuous learning to stay ahead in modern pharmacy practice.</p>
                        <Link to="/courses" className="service-link">Explore Courses <ChevronRight size={16} /></Link>
                      </div>
                    </div>

                    {/*
                      HERO GRID MAIN
                      DOM order: video FIRST, text SECOND
                      Desktop CSS: grid 1fr 1fr  → video left, text right
                      Mobile CSS:  flex column   → video top (order:1), text bottom (order:2)
                      No tricks needed — DOM order matches mobile order naturally.
                    */}
                    <div className="hero-grid-main">
                      {/* VIDEO — always first in DOM */}
                      <div className="hero-visual">
                        <ProductMockup type="pharmaCourse" />
                      </div>

                      {/* TEXT — always second in DOM */}
                      <div className="hero-content">
                        <div className="hero-value-prop">
                          <h2>Why Choose Our Ecosystem?</h2>
                          <ul className="hero-benefits">
                            <li><span className="check">✓</span><div><strong>Integrated Suite:</strong> Operations, delivery, and education seamlessly connected</div></li>
                            <li><span className="check">✓</span><div><strong>Scalable Growth:</strong> Start with one module, expand as you grow</div></li>
                            <li><span className="check">✓</span><div><strong>Data-Driven:</strong> Analytics across all platforms for better decisions</div></li>
                            <li><span className="check">✓</span><div><strong>Compliance Ready:</strong> Built for regulatory requirements worldwide</div></li>
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

                    {/* Stats bar */}
                    <div className="hero-stats">
                      <div className="stat-item"><div className="stat-number">3+</div><div className="stat-label">Integrated Platforms</div></div>
                      <div className="stat-item"><div className="stat-number">100+</div><div className="stat-label">CPD Lessons</div></div>
                      <div className="stat-item"><div className="stat-number">24/7</div><div className="stat-label">System Access</div></div>
                      <div className="stat-item"><div className="stat-number">∞</div><div className="stat-label">Possibilities</div></div>
                    </div>

                  </div>
                </section>
              </AnimatedSection>
            )

          /* ── ECOSYSTEM ──────────────────────────────────────────── */
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
                        <span className="platform-status">LIVE NOW</span>
                        <h3>PharmaCourse</h3>
                        <p>Online CPD learning platform with self-paced courses, certificates, and clinical case simulations.</p>
                        <Link to="/courses" className="platform-link">Explore courses <ChevronRight size={16} /></Link>
                      </div>
                      <div className="platform-card featured">
                        <ShoppingCart size={32} />
                        <span className="platform-status">AVAILABLE</span>
                        <h3>PharmacyOS</h3>
                        <p>AI-powered dispensary management with POS, inventory, SHA claims, and M-Pesa integration.</p>
                        <Link to="/pharmacyos" className="platform-link">Explore PharmacyOS <ChevronRight size={16} /></Link>
                      </div>
                      <div className="platform-card">
                        <Building2 size={32} />
                        <span className="platform-status">AVAILABLE</span>
                        <h3>RemedacareOS</h3>
                        <p>Full hospital management system with patient records, billing, and MOH reports.</p>
                        <Link to="/remedacareos" className="platform-link">Explore RemedacareOS <ChevronRight size={16} /></Link>
                      </div>
                    </div>
                  </div>
                </section>
              </AnimatedSection>
            )

          /* ── PHARMACYOS ─────────────────────────────────────────── */
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
                            { icon: ShoppingCart, text: "Sales & POS with M-Pesa" },
                            { icon: Package,      text: "Real-time inventory management" },
                            { icon: AlertTriangle,text: "Automated expiry alerts" },
                            { icon: CreditCard,   text: "SHA & insurance claims" }
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

          /* ── REMEDACAREOS ───────────────────────────────────────── */
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
                            { icon: BarChart3,     text: "Government-compliant reports" },
                            { icon: Users,         text: "Multi-role access control" },
                            { icon: Link2,         text: "Seamless PharmacyOS integration" }
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

          /* ── FEATURES ───────────────────────────────────────────── */
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
                        { icon: BookOpen,  title: "Self-Paced Learning",      desc: "Learn at your own speed with bite-sized modules" },
                        { icon: Download,  title: "Downloadable Resources",   desc: "Clinical notes and reference materials included" },
                        { icon: Award,     title: "CPD Certificates",         desc: "Earn certificates for your professional portfolio" }
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

          /* ── COURSES ────────────────────────────────────────────── */
          case "courses":
            return (
              <AnimatedSection key={key} delay={0.5}>
                <section id="courses" className="courses-section">
                  <div className="container">
                    <div className="section-header">
                      {config.badge_text && <span className="section-badge">{config.badge_text}</span>}
                      <h2>{config.heading || "Courses built for real-world practice"}</h2>
                    </div>
                    <div className="courses-grid">
                      {courses.length > 0 ? courses.map(course => (
                        <div key={course.id} className="course-card">
                          <div className="course-thumb">
                            {course.image_url
                              ? <img src={course.image_url} alt={course.title} className="course-thumb-img" />
                              : <BookOpen size={32} />
                            }
                          </div>
                          <div className="course-body">
                            {course.category && <span className="course-category-badge">{course.category.toUpperCase()}</span>}
                            <h3>{course.title}</h3>
                            <p>
                              {(course.short_desc || course.description || "").length > 100
                                ? (course.short_desc || course.description).substring(0, 100) + "…"
                                : (course.short_desc || course.description)}
                            </p>
                            <div className="course-meta">
                              <span className="price">{course.is_free ? "Free" : `KES ${course.price}`}</span>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="empty-state">
                          <p>Courses launching soon. <Link to="/register">Register now</Link> to be notified.</p>
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
              </AnimatedSection>
            )

          /* ── TESTIMONIALS ───────────────────────────────────────── */
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
                      <div className="testimonial-card">
                        <div className="testimonial-rating">★★★★★</div>
                        <p>"This course helped me understand antimicrobial stewardship with confidence. The lessons were clear and practical."</p>
                        <small>— Dr. Amina, Clinical Pharmacist</small>
                      </div>
                      <div className="testimonial-card">
                        <div className="testimonial-rating">★★★★★</div>
                        <p>"Great structure and practical examples. I can now recommend the right therapies with more confidence."</p>
                        <small>— Hospital pharmacy professional</small>
                      </div>
                    </div>
                  </div>
                </section>
              </AnimatedSection>
            )

          /* ── STATS ──────────────────────────────────────────────── */
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

          /* ── FAQ ────────────────────────────────────────────────── */
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
                      <div className="faq-card"><h3>How can I access the courses?</h3><p>Browse the course list, register, and enroll. The first introductory lessons are free and certificate access is available once completed.</p></div>
                      <div className="faq-card"><h3>What if I don't understand a topic?</h3><p>Every course includes downloadable resources and support notes so you can review concepts anytime.</p></div>
                      <div className="faq-card"><h3>Can I study at my own pace?</h3><p>Yes. Lessons are self-paced and available anytime so you can learn around your schedule.</p></div>
                      <div className="faq-card"><h3>Who teaches the courses?</h3><p>Courses are created by experienced pharmacy educators and industry professionals.</p></div>
                    </div>
                  </div>
                </section>
              </AnimatedSection>
            )

          /* ── CTA ────────────────────────────────────────────────── */
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
