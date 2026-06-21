import { useState } from "react"
import { Link } from "react-router-dom"
import pharmacyosDashboard from "../assets/pharmacyos-dashboard.svg"
import pharmacyosCopilot from "../assets/pharmacyos-copilot.svg"
import SEO from "../components/SEO"
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock3,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Link2,
  Package,
  Pill,
  Shield,
  ShoppingCart,
  Smartphone,
  Stethoscope,
  Truck,
  Users,
  Video,
} from "lucide-react"

const WHATSAPP = "https://wa.me/254790059584?text=Hi%20Julius%2C%20I%27d%20like%20to%20book%20a%20demo%20of%20RemedacarePOS."

const modules = [
  { icon: ShoppingCart, label: "Sales & POS", desc: "Fast checkout with cash, M-Pesa, credit, SHA and insurer workflows from one selling screen." },
  { icon: Package, label: "Inventory Management", desc: "Track stock, expiry, controlled medicines, imports and branch-ready inventory operations." },
  { icon: Users, label: "Patients Workspace", desc: "One patient view for allergies, chronic conditions, requests, appointments, deliveries and history." },
  { icon: Video, label: "Telepharmacy Portal", desc: "Patients request medicines, upload prescriptions, book calls, accept alternatives and follow live updates online." },
  { icon: Truck, label: "Delivery Operations", desc: "Move orders through packed, dispatched and delivered with partner assignment, ETA and linked prescription context." },
  { icon: Activity, label: "Live Dashboard", desc: "Visual analytics for revenue, payment mix, patient activity, stock pressure and branch workload in real time." },
  { icon: Clock3, label: "Shifts & History", desc: "Track current shifts, older shifts, staff filters, printable reports and time-aware operational history." },
  { icon: CreditCard, label: "Claims & Debts", desc: "Run SHA, NHIF, insurer and outstanding balance workflows without breaking the pharmacy process." },
  { icon: FileSpreadsheet, label: "Compliance Exports", desc: "Support PPB, eTIMS, claims and regulator-facing reporting from the same working system." },
  { icon: Smartphone, label: "M-Pesa Visibility", desc: "Keep mobile money transactions tied to the sales ledger and reconciliation process." },
  { icon: Building2, label: "Branches", desc: "Operate multiple outlets with branch-aware analytics, branch setup, inventory rollout and patient context." },
  { icon: Bot, label: "AI Copilot", desc: "Drug guidance, dosage support and clinical prompts inside the same operating system your staff already use." },
]

const pillars = [
  { icon: Stethoscope, title: "Pharmacy-first workflow", body: "Built around what dispensaries actually do every day, not generic retail software assumptions." },
  { icon: Link2, title: "Website and app connected", body: "The patient portal and RemedacarePOS app now behave like one workflow from request to delivery." },
  { icon: Shield, title: "Kenyan compliance aware", body: "Claims, eTIMS-facing exports, dispensing traceability and controlled-drug reporting stay in view." },
  { icon: Building2, title: "Branch-ready operations", body: "Branch context, shift history, supplier flow and owner visibility support real business growth." },
]

const patientFlows = [
  {
    icon: FileText,
    title: "Prescription requests with alternatives",
    desc: "Patients can request medicines, pharmacists can offer alternatives, and patients can accept, ask for another option or request a callback.",
  },
  {
    icon: Calendar,
    title: "Appointments and telepharmacy calls",
    desc: "Book appointments, confirm virtual or phone consultations, and surface pharmacist notes and links back to the patient website.",
  },
  {
    icon: Truck,
    title: "Pickup and delivery after dispense",
    desc: "Once the medicine is ready, patients choose pickup or delivery, and the pharmacy keeps fulfillment tied to the right dispensed item.",
  },
  {
    icon: Users,
    title: "One returning patient history",
    desc: "Repeat requests from the same patient can keep building one connected history instead of fragmenting into disconnected records.",
  },
]

const compliance = [
  "PPB narcotics and controlled substances export support",
  "SHA / NHIF / SHIF / PHC / ECCIF-aware pharmacy workflows",
  "KRA eTIMS-facing sales and report preparation",
  "Prescription ledger and dispensing traceability",
  "M-Pesa-aware reconciliation and payment classification",
  "Admin and staff role separation for sensitive actions",
]

const operationsLayers = [
  {
    icon: Building2,
    title: "Branch growth without chaos",
    desc: "Support new branch rollout, branch context and operational comparison without splitting the system into separate tools.",
  },
  {
    icon: Truck,
    title: "Supplier and fulfillment discipline",
    desc: "Supplier follow-up, sourcing, delivery handoff and fulfillment choices stay closer to the actual medicine workflow.",
  },
  {
    icon: Users,
    title: "Served vs needs-action clarity",
    desc: "Staff can see who is complete and who still needs work, even when a patient reactivates because of a later delivery or follow-up step.",
  },
  {
    icon: Clock3,
    title: "Admin reporting over time",
    desc: "Shift history is designed to be searchable and printable by staff member, date window and operational period.",
  },
]

const DOT_PATTERN = `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.2' fill='%23ffffff'/%3E%3C/svg%3E")`

const css = `
  .po-card, .po-mod, .po-flow-card, .po-ops-card {
    transition: transform 0.22s ease, box-shadow 0.22s ease;
  }
  .po-card:hover, .po-mod:hover, .po-flow-card:hover, .po-ops-card:hover {
    transform: translateY(-4px);
  }
  .po-btn-white {
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }
  .po-btn-white:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(255,255,255,0.2);
  }
  .po-btn-ghost {
    transition: background 0.18s ease;
  }
  .po-btn-ghost:hover {
    background: rgba(255,255,255,0.1) !important;
  }
  @media (max-width: 640px) {
    .po-hero {
      padding: 74px 12px 36px !important;
    }
    .po-hero-copy {
      font-size: 15px !important;
      line-height: 1.55 !important;
      max-width: 320px !important;
      margin: 0 auto 24px !important;
    }
    .po-hero-badge {
      font-size: 9px !important;
      padding: 6px 10px !important;
      margin-bottom: 18px !important;
      letter-spacing: 1.2px !important;
    }
    .po-hero-actions,
    .po-cta-actions {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 8px !important;
      width: 100% !important;
      max-width: 320px !important;
      margin: 0 auto !important;
    }
    .po-hero-actions a,
    .po-cta-actions a {
      min-width: 0 !important;
      width: 100% !important;
      padding: 11px 8px !important;
      font-size: 12px !important;
      justify-content: center !important;
    }
    .po-section {
      padding: 44px 12px !important;
    }
    .po-section-heading {
      margin-bottom: 28px !important;
    }
    .po-pillars-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 10px !important;
    }
    .po-card {
      border-radius: 14px !important;
      padding: 14px 12px !important;
    }
    .po-card-icon {
      width: 30px !important;
      height: 30px !important;
      margin-bottom: 10px !important;
      border-radius: 10px !important;
    }
    .po-card-title {
      font-size: 12px !important;
      margin: 0 0 6px !important;
      line-height: 1.25 !important;
    }
    .po-card-body {
      font-size: 11px !important;
      line-height: 1.45 !important;
    }
    .po-integration-grid {
      grid-template-columns: 1fr 1fr !important;
      gap: 14px !important;
      padding: 18px 14px !important;
      border-radius: 18px !important;
    }
    .po-integration-copy h3 {
      font-size: 1.05rem !important;
      margin: 0 0 10px !important;
    }
    .po-integration-copy p,
    .po-integration-copy li {
      font-size: 11px !important;
      line-height: 1.5 !important;
    }
    .po-integration-shot {
      padding: 10px !important;
      border-radius: 14px !important;
    }
    .po-modules-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 10px !important;
    }
    .po-mod {
      border-radius: 14px !important;
      padding: 14px 10px !important;
    }
    .po-mod-icon {
      width: 30px !important;
      height: 30px !important;
      margin-bottom: 10px !important;
    }
    .po-mod-title {
      font-size: 11px !important;
      margin: 0 0 5px !important;
      line-height: 1.2 !important;
    }
    .po-mod-text {
      font-size: 10px !important;
      line-height: 1.35 !important;
    }
    .po-compliance-grid {
      grid-template-columns: 1fr !important;
      gap: 18px !important;
    }
    .po-compliance-card {
      border-radius: 14px !important;
      padding: 8px 14px !important;
    }
    .po-compliance-item {
      gap: 10px !important;
      padding: 12px 0 !important;
    }
    .po-compliance-item span {
      font-size: 12px !important;
      line-height: 1.4 !important;
    }
    .po-cta {
      padding: 44px 12px !important;
    }
  }
  @media (max-width: 420px) {
    .po-pillars-grid,
    .po-modules-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
    .po-integration-grid {
      grid-template-columns: 1fr !important;
    }
  }
`

export default function PharmacyOS() {
  const [activeModule, setActiveModule] = useState(null)
  const [hoveredModule, setHoveredModule] = useState(null)

  const GREEN = "#0F6E56"
  const DARK = "#0a2e1f"

  return (
    <div style={{ fontFamily: "'Outfit', 'Segoe UI', sans-serif", background: "#f8faf9", minHeight: "100vh" }}>
      <SEO
        title="RemedacarePOS Kenya"
        description="RemedacarePOS is a Kenyan pharmacy operating system with telepharmacy workflows, delivery coordination, patient continuity, live dashboard analytics, claims, shifts and branch-aware operations."
        path="/remedacarepos"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "RemedacarePOS",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Windows",
          description:
            "Kenyan pharmacy operating system with telepharmacy workflows, delivery coordination, patient continuity, analytics, claims and branch-aware operations.",
          offers: {
            "@type": "Offer",
            availability: "https://schema.org/InStock",
          },
          provider: {
            "@type": "Organization",
            name: "RemedacarePOS",
          },
        }}
      />

      <style>{css}</style>

      <section className="po-hero" style={{ position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #062318 0%, #0F6E56 58%, #1a9e7a 100%)", color: "#fff", padding: "96px 24px 72px", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: DOT_PATTERN, backgroundSize: "20px 20px", opacity: 0.05, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)", width: 700, height: 400, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(26,158,122,0.35) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", maxWidth: 820, margin: "0 auto" }}>
          <span className="po-hero-badge" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 99, fontSize: 11, fontWeight: 700, letterSpacing: 1.8, padding: "7px 18px", marginBottom: 28, textTransform: "uppercase" }}>
            RemedacarePOS - Dispensary Manager
          </span>

          <h1 style={{ fontSize: "clamp(2.2rem, 5.5vw, 3.6rem)", fontWeight: 800, lineHeight: 1.12, margin: "0 0 22px", letterSpacing: "-0.02em" }}>
            A connected pharmacy workflow<br />from request to dispense to delivery.
          </h1>
          <p className="po-hero-copy" style={{ fontSize: 18, opacity: 0.82, maxWidth: 650, margin: "0 auto 40px", lineHeight: 1.65 }}>
            RemedacarePOS combines live dispensing, telepharmacy response workflows, patient self-service, delivery coordination, claims visibility, branch operations, and business analytics in one connected pharmacy system.
          </p>

          <div className="po-hero-actions" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="po-btn-white" style={{ background: "#fff", color: GREEN, fontWeight: 700, padding: "15px 30px", borderRadius: 10, textDecoration: "none", fontSize: 15, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
              Book Live Walkthrough <ArrowRight size={16} />
            </a>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="po-btn-ghost" style={{ background: "transparent", color: "#fff", fontWeight: 600, padding: "15px 30px", borderRadius: 10, textDecoration: "none", fontSize: 15, border: "1.5px solid rgba(255,255,255,0.35)" }}>
              Discuss Rollout
            </a>
          </div>
        </div>
      </section>

      <section className="po-section" style={{ padding: "80px 24px", background: "#f8faf9" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="po-section-heading" style={{ textAlign: "center", marginBottom: 52 }}>
            <span style={{ color: GREEN, fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>Why RemedacarePOS</span>
            <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.3rem)", fontWeight: 800, margin: "14px 0 0", color: DARK, letterSpacing: "-0.02em" }}>
              Built for real Kenyan pharmacy operations.
            </h2>
          </div>

          <div className="po-pillars-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}>
            {pillars.map((pillar) => {
              const Icon = pillar.icon
              return (
                <div key={pillar.title} className="po-card" style={{ background: "#fff", border: "1px solid #e0ece8", borderRadius: 16, padding: "28px 22px", boxShadow: "0 2px 12px rgba(15,110,86,0.05)" }}>
                  <div className="po-card-icon" style={{ width: 44, height: 44, borderRadius: 12, background: "#e8f5f0", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <Icon size={20} color={GREEN} />
                  </div>
                  <h3 className="po-card-title" style={{ fontSize: 15, fontWeight: 700, color: DARK, margin: "0 0 10px" }}>{pillar.title}</h3>
                  <p className="po-card-body" style={{ color: "#666", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{pillar.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="po-section" style={{ background: "#fff", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="po-integration-grid" style={{ background: "linear-gradient(135deg, #e2f4ed 0%, #f0faf7 100%)", border: "1.5px solid #b8dfd3", borderRadius: 24, padding: "52px 48px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 48, alignItems: "center", boxShadow: "0 8px 40px rgba(15,110,86,0.08)" }}>
            <div className="po-integration-copy">
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: GREEN, color: "#fff", borderRadius: 99, fontSize: 12, fontWeight: 700, padding: "7px 16px", marginBottom: 20 }}>
                <Link2 size={13} /> Patient website and app connected
              </div>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 800, color: DARK, margin: "0 0 14px", letterSpacing: "-0.02em" }}>
                Patients and pharmacists now work inside one connected flow.
              </h3>
              <p style={{ color: "#3a6b57", fontSize: 15, lineHeight: 1.75, margin: "0 0 24px" }}>
                A patient can request a medicine, receive an alternative, accept it, choose pickup or delivery, and follow updates, while the pharmacist keeps everything tied to the real dispensing and delivery workflow.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {[
                  "Patient submits a request or appointment online",
                  "Pharmacist reviews it inside RemedacarePOS",
                  "Alternative, sourcing, delivery or pickup decisions are tracked clearly",
                  "The patient sees updates from the same public portal",
                ].map((step, index) => (
                  <li key={index} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: "#2a5a47", marginBottom: 12 }}>
                    <span style={{ width: 24, height: 24, borderRadius: "50%", background: GREEN, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{index + 1}</span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
            <div className="po-integration-shot" style={{ background: "#ffffff", borderRadius: 20, padding: 14, border: "1px solid #cfe5dc", boxShadow: "0 12px 36px rgba(15,110,86,0.16)" }}>
              <img
                src={pharmacyosDashboard}
                alt="RemedacarePOS dashboard showing pharmacy operations and analytics"
                style={{ display: "block", width: "100%", height: "auto", borderRadius: 14, border: "1px solid #dbe8e2" }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="po-section" style={{ padding: "80px 24px", background: "#f8faf9" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div className="po-section-heading" style={{ textAlign: "center", marginBottom: 52 }}>
            <span style={{ color: GREEN, fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>Modules</span>
            <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.3rem)", fontWeight: 800, margin: "14px 0 0", color: DARK, letterSpacing: "-0.02em" }}>
              Core pharmacy modules that expand on click.
            </h2>
          </div>

          <div className="po-modules-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 18 }}>
            {modules.map((module, index) => {
              const Icon = module.icon
              const isActive = activeModule === index
              const isHovered = hoveredModule === index

              return (
                <div
                  key={index}
                  className="po-mod"
                  onClick={() => setActiveModule(isActive ? null : index)}
                  onMouseEnter={() => setHoveredModule(index)}
                  onMouseLeave={() => setHoveredModule(null)}
                  style={{ background: isActive ? "#eef8f4" : "#fff", cursor: "pointer", border: `1.5px solid ${isActive ? GREEN : isHovered ? "#b8dfd3" : "#e0ece8"}`, borderRadius: 14, padding: "22px 20px", boxShadow: isActive ? "0 6px 24px rgba(15,110,86,0.15)" : isHovered ? "0 4px 16px rgba(15,110,86,0.08)" : "none" }}
                >
                  <div className="po-mod-icon" style={{ width: 40, height: 40, borderRadius: 10, background: isActive ? "#d7f0e6" : "#edf7f2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                    <Icon size={19} color={isActive ? GREEN : "#7db8a1"} />
                  </div>
                  <h3 className="po-mod-title" style={{ fontSize: 14, fontWeight: 700, color: DARK, margin: "0 0 7px" }}>{module.label}</h3>
                  {isActive ? (
                    <p className="po-mod-text" style={{ fontSize: 13, color: "#444", lineHeight: 1.65, margin: 0 }}>{module.desc}</p>
                  ) : (
                    <p className="po-mod-text" style={{ fontSize: 12, color: "#aaa", margin: 0 }}>Click to expand</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="po-section" style={{ background: "#fff", padding: "76px 24px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div className="po-section-heading" style={{ textAlign: "center", marginBottom: 46 }}>
            <span style={{ color: GREEN, fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>Telepharmacy workflows</span>
            <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.15rem)", fontWeight: 800, margin: "14px 0 14px", color: DARK, letterSpacing: "-0.02em" }}>
              The new patient journey is visible all the way through.
            </h2>
            <p style={{ color: "#556", fontSize: 15, lineHeight: 1.75, maxWidth: 700, margin: "0 auto" }}>
              RemedacarePOS supports the full public-to-pharmacy journey: prescription request, pharmacist review, alternative handling, pickup or delivery choice, live updates, and telepharmacy follow-up.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {patientFlows.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="po-flow-card" style={{ background: "#fff", border: "1px solid #dcebe4", borderRadius: 18, padding: "24px 22px", boxShadow: "0 6px 22px rgba(15,110,86,0.06)" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: "#e8f5f0", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <Icon size={20} color={GREEN} />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: DARK, margin: "0 0 10px" }}>{item.title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.75, color: "#556", margin: 0 }}>{item.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="po-section" style={{ background: "#fff", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="po-compliance-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 64, alignItems: "center" }}>
            <div>
              <span style={{ color: GREEN, fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>Compliance</span>
              <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.1rem)", fontWeight: 800, margin: "14px 0 18px", color: DARK, letterSpacing: "-0.02em" }}>
                Built for pharmacists who need speed, control, and patient continuity.
              </h2>
              <p style={{ color: "#666", fontSize: 15, lineHeight: 1.75, marginBottom: 32 }}>
                RemedacarePOS brings together live dashboard visibility, controlled dispensing workflows, patient continuity, and the Kenyan pharmacy safeguards that matter in daily operations.
              </p>
              <a href={WHATSAPP} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: GREEN, color: "#fff", textDecoration: "none", padding: "13px 24px", borderRadius: 10, fontWeight: 700, fontSize: 14, boxShadow: "0 4px 16px rgba(15,110,86,0.3)" }}>
                Book a Live Demo <ChevronRight size={16} />
              </a>
            </div>
            <div className="po-compliance-card" style={{ background: "#fff", borderRadius: 16, padding: "8px 24px", border: "1px solid #e0ece8", boxShadow: "0 4px 20px rgba(15,110,86,0.06)" }}>
              {compliance.map((item, index) => (
                <div key={index} className="po-compliance-item" style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 0", borderBottom: index < compliance.length - 1 ? "1px solid #edf2ef" : "none" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#e8f5f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <CheckCircle size={14} color={GREEN} />
                  </div>
                  <span style={{ fontSize: 15, color: "#2a3a30", fontWeight: 500 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="po-section" style={{ padding: "76px 24px", background: "#f4faf7" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div className="po-section-heading" style={{ textAlign: "center", marginBottom: 46 }}>
            <span style={{ color: GREEN, fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>Operational growth</span>
            <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.15rem)", fontWeight: 800, margin: "14px 0 14px", color: DARK, letterSpacing: "-0.02em" }}>
              The platform is now behaving more like an operating system.
            </h2>
            <p style={{ color: "#556", fontSize: 15, lineHeight: 1.75, maxWidth: 700, margin: "0 auto" }}>
              Branches, shifts, queue scaling, delivery handling and patient continuity are all evolving together instead of being isolated features.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {operationsLayers.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="po-ops-card" style={{ background: "#fff", border: "1px solid #dcebe4", borderRadius: 18, padding: "24px 22px", boxShadow: "0 6px 22px rgba(15,110,86,0.06)" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: "#e8f5f0", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <Icon size={20} color={GREEN} />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: DARK, margin: "0 0 10px" }}>{item.title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.75, color: "#556", margin: 0 }}>{item.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="po-section" style={{ padding: "80px 24px", background: "#f8faf9" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="po-integration-grid" style={{ background: "linear-gradient(135deg, #e2f4ed 0%, #f0faf7 100%)", border: "1.5px solid #b8dfd3", borderRadius: 24, padding: "52px 48px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 48, alignItems: "center", boxShadow: "0 8px 40px rgba(15,110,86,0.08)" }}>
            <div className="po-integration-copy">
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: GREEN, color: "#fff", borderRadius: 99, fontSize: 12, fontWeight: 700, padding: "7px 16px", marginBottom: 20 }}>
                <Bot size={13} /> AI Copilot
              </div>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 800, color: DARK, margin: "0 0 14px", letterSpacing: "-0.02em" }}>
                AI guidance is part of the workflow, not a disconnected add-on.
              </h3>
              <p style={{ color: "#3a6b57", fontSize: 15, lineHeight: 1.75, margin: "0 0 24px" }}>
                Use the copilot for drug questions, dosage guidance and clinical prompts while staying inside the same app that runs dispensing, patient follow-up and branch operations.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {[
                  "Ask dosage and interaction questions quickly",
                  "Support branch staff with embedded guidance",
                  "Keep clinical support close to inventory and dispensing context",
                  "Reduce workflow switching during busy pharmacy hours",
                ].map((step, index) => (
                  <li key={index} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: "#2a5a47", marginBottom: 12 }}>
                    <span style={{ width: 24, height: 24, borderRadius: "50%", background: GREEN, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{index + 1}</span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
            <div className="po-integration-shot" style={{ background: "#ffffff", borderRadius: 20, padding: 14, border: "1px solid #cfe5dc", boxShadow: "0 12px 36px rgba(15,110,86,0.16)" }}>
              <img
                src={pharmacyosCopilot}
                alt="RemedacarePOS copilot view"
                style={{ display: "block", width: "100%", height: "auto", borderRadius: 14, border: "1px solid #dbe8e2" }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="po-cta" style={{ position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #062318 0%, #0F6E56 100%)", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: DOT_PATTERN, backgroundSize: "20px 20px", opacity: 0.04, pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 680, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 800, color: "#fff", margin: "0 0 18px", letterSpacing: "-0.02em" }}>
            Ready to modernise how the pharmacy actually works?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 16, lineHeight: 1.75, marginBottom: 40 }}>
            Book a live walkthrough and see how RemedacarePOS handles telepharmacy, dispensing, inventory, delivery coordination, branch workflows, and claims in one pharmacy operating system.
          </p>
          <div className="po-cta-actions" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="po-btn-white" style={{ background: "#fff", color: GREEN, fontWeight: 700, padding: "15px 30px", borderRadius: 10, textDecoration: "none", fontSize: 15, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
              Book POS Walkthrough <ArrowRight size={16} />
            </a>
            <Link to="/courses" style={{ background: "transparent", color: "#fff", fontWeight: 600, padding: "15px 30px", borderRadius: 10, textDecoration: "none", fontSize: 15, border: "1.5px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", gap: 8 }}>
              Explore RemedacarePOS <ChevronRight size={15} />
            </Link>
          </div>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 28 }}>
            Built by Julius Kinyua Wanjau | Pharmacist & Software Developer | Nairobi, Kenya
          </p>
        </div>
      </section>
    </div>
  )
}
