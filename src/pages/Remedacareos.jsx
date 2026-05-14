import { useState } from "react"
import { Link } from "react-router-dom"
import {
  ClipboardList, BarChart3, Users, Link2, Calendar,
  FileText, Shield, Activity, Pill, BedDouble,
  Bell, Database, CheckCircle, ArrowRight,
  ChevronRight, Stethoscope, TrendingUp,
} from "lucide-react"

const WHATSAPP = "https://wa.me/254790059584?text=Hi%20Julius%2C%20I%27d%20like%20to%20book%20a%20demo%20of%20RemedacareOS."

const modules = [
  { icon: ClipboardList, label: "Patient Records", desc: "Complete electronic health records with visit history, diagnoses, allergies and vitals." },
  { icon: BedDouble, label: "Ward & Bed Management", desc: "Track admissions, bed allocation, ward rounds and discharge planning." },
  { icon: BarChart3, label: "MOH Reports", desc: "Auto-generate Ministry of Health DHIS2-compliant reports including MOH 705A/B, 711 and 333." },
  { icon: Activity, label: "Clinical Encounters", desc: "Record outpatient consultations, triage data, lab requests and treatment plans." },
  { icon: Pill, label: "PharmacyOS Integration", desc: "Prescriptions flow directly to the dispensary queue with no paper handoff." },
  { icon: Users, label: "Multi-role Access", desc: "Doctor, Nurse, Pharmacist, Receptionist, Lab Tech and Admin roles with scoped permissions." },
  { icon: FileText, label: "Billing & Invoicing", desc: "Patient billing tied to encounters with SHA, NHIF, Insurance, Cash and M-Pesa methods." },
  { icon: Calendar, label: "Appointment Scheduling", desc: "Book and manage outpatient appointments with reminder support." },
  { icon: Database, label: "Lab & Radiology", desc: "Lab test requests, result entry and radiology order management linked to records." },
  { icon: Shield, label: "SHA / NHIF Claims", desc: "Integrated SHA capitation and fee-for-service claim management for hospitals." },
  { icon: Bell, label: "Clinical Alerts", desc: "Drug interaction alerts, allergy warnings and critical value notifications at point of care." },
  { icon: TrendingUp, label: "Analytics Dashboard", desc: "Track census, revenue, top diagnoses, bed occupancy and staff productivity." },
]

const pillars = [
  { icon: Stethoscope, title: "Clinical First", body: "Built by a pharmacist who understands clinical workflows, not just tech." },
  { icon: Link2, title: "Connected Ecosystem", body: "Native PharmacyOS integration. One record from prescription to dispensary." },
  { icon: Shield, title: "Kenyan Compliant", body: "MOH, SHA, NHIF, DHIS2 and KRA standards are covered." },
  { icon: Database, title: "Multi-tenant Cloud", body: "Secure cloud architecture with isolated hospital data." },
]

const compliance = [
  "MOH DHIS2-compliant reports including 705A/B, 711 and 333",
  "SHA capitation and fee-for-service claim management",
  "NHIF / SHIF / PHC billing integration",
  "KRA eTIMS-linked billing per encounter",
  "PPB-aware prescribing and dispensing workflow",
  "Multi-role audit trail for every clinical action",
]

const DOT_PATTERN = `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.2' fill='%23ffffff'/%3E%3C/svg%3E")`

const css = `
  @keyframes pulse-dot {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.5); opacity: 0.65; }
  }
  .rc-card, .rc-mod {
    transition: transform 0.22s ease, box-shadow 0.22s ease;
  }
  .rc-card:hover, .rc-mod:hover {
    transform: translateY(-4px);
  }
  .rc-btn-white {
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }
  .rc-btn-white:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(255,255,255,0.2);
  }
  .rc-btn-ghost {
    transition: background 0.18s ease;
  }
  .rc-btn-ghost:hover {
    background: rgba(255,255,255,0.1) !important;
  }
  @media (max-width: 640px) {
    .rc-hero {
      padding: 74px 12px 36px !important;
    }
    .rc-hero-copy {
      font-size: 15px !important;
      line-height: 1.55 !important;
      max-width: 320px !important;
      margin: 0 auto 24px !important;
    }
    .rc-hero-badge {
      font-size: 9px !important;
      padding: 6px 10px !important;
      margin-bottom: 18px !important;
      letter-spacing: 1.2px !important;
    }
    .rc-hero-actions,
    .rc-cta-actions {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 8px !important;
      width: 100% !important;
      max-width: 320px !important;
      margin: 0 auto !important;
    }
    .rc-hero-actions a,
    .rc-cta-actions a {
      min-width: 0 !important;
      width: 100% !important;
      padding: 11px 8px !important;
      font-size: 12px !important;
      justify-content: center !important;
    }
    .rc-hero-stats {
      display: grid !important;
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 0 !important;
      margin-top: 28px !important;
      padding-top: 20px !important;
    }
    .rc-hero-stat {
      padding: 0 8px !important;
    }
    .rc-hero-stat-number {
      font-size: 22px !important;
    }
    .rc-hero-stat-label {
      font-size: 10px !important;
      line-height: 1.3 !important;
    }
    .rc-section {
      padding: 44px 12px !important;
    }
    .rc-section-heading {
      margin-bottom: 28px !important;
    }
    .rc-pillars-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 10px !important;
    }
    .rc-card {
      border-radius: 14px !important;
      padding: 14px 12px !important;
    }
    .rc-card-icon {
      width: 30px !important;
      height: 30px !important;
      margin-bottom: 10px !important;
      border-radius: 10px !important;
    }
    .rc-card-title {
      font-size: 12px !important;
      margin: 0 0 6px !important;
      line-height: 1.25 !important;
    }
    .rc-card-body {
      font-size: 11px !important;
      line-height: 1.45 !important;
    }
    .rc-integration-grid {
      grid-template-columns: 1fr 1fr !important;
      gap: 14px !important;
      padding: 18px 14px !important;
      border-radius: 18px !important;
    }
    .rc-integration-copy h3 {
      font-size: 1.05rem !important;
      margin: 0 0 10px !important;
    }
    .rc-integration-copy p,
    .rc-integration-copy li,
    .rc-integration-console {
      font-size: 11px !important;
      line-height: 1.5 !important;
    }
    .rc-modules-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 10px !important;
    }
    .rc-mod {
      border-radius: 14px !important;
      padding: 14px 10px !important;
    }
    .rc-mod-icon {
      width: 30px !important;
      height: 30px !important;
      margin-bottom: 10px !important;
    }
    .rc-mod-title {
      font-size: 11px !important;
      margin: 0 0 5px !important;
      line-height: 1.2 !important;
    }
    .rc-mod-text {
      font-size: 10px !important;
      line-height: 1.35 !important;
    }
    .rc-compliance-grid {
      grid-template-columns: 1fr !important;
      gap: 18px !important;
    }
    .rc-compliance-card {
      border-radius: 14px !important;
      padding: 8px 14px !important;
    }
    .rc-compliance-item {
      gap: 10px !important;
      padding: 12px 0 !important;
    }
    .rc-compliance-item span {
      font-size: 12px !important;
      line-height: 1.4 !important;
    }
    .rc-cta {
      padding: 44px 12px !important;
    }
  }
  @media (max-width: 420px) {
    .rc-pillars-grid,
    .rc-modules-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
    .rc-integration-grid {
      grid-template-columns: 1fr !important;
    }
  }
`

export default function RemedacareOS() {
  const [activeModule, setActiveModule] = useState(null)
  const [hoveredModule, setHoveredModule] = useState(null)

  const BLUE = "#1a3a8a"
  const DARK = "#0c1b4d"

  return (
    <div style={{ fontFamily: "'Outfit', 'Segoe UI', sans-serif", background: "#f5f8ff", minHeight: "100vh" }}>
      <style>{css}</style>

      <section className="rc-hero" style={{ position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #080f2e 0%, #1a3a8a 55%, #2755c5 100%)", color: "#fff", padding: "96px 24px 72px", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: DOT_PATTERN, backgroundSize: "20px 20px", opacity: 0.05, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)", width: 700, height: 400, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(39,85,197,0.4) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", maxWidth: 820, margin: "0 auto" }}>
          <span className="rc-hero-badge" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 99, fontSize: 11, fontWeight: 700, letterSpacing: 1.8, padding: "7px 18px", marginBottom: 28, textTransform: "uppercase" }}>
            RemedacareOS - Hospital Management System
          </span>

          <h1 style={{ fontSize: "clamp(2.2rem, 5.5vw, 3.6rem)", fontWeight: 800, lineHeight: 1.12, margin: "0 0 22px", letterSpacing: "-0.02em" }}>
            From clinic to dispensary.<br />One connected system.
          </h1>
          <p className="rc-hero-copy" style={{ fontSize: 18, opacity: 0.82, maxWidth: 640, margin: "0 auto 40px", lineHeight: 1.65 }}>
            A full Hospital Management Information System built specifically for Kenyan hospitals with native PharmacyOS integration, MOH reports, SHA claims, and AI clinical support.
          </p>

          <div className="rc-hero-actions" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="rc-btn-white" style={{ background: "#fff", color: BLUE, fontWeight: 700, padding: "15px 30px", borderRadius: 10, textDecoration: "none", fontSize: 15, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
              Book a Demo <ArrowRight size={16} />
            </a>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="rc-btn-ghost" style={{ background: "transparent", color: "#fff", fontWeight: 600, padding: "15px 30px", borderRadius: 10, textDecoration: "none", fontSize: 15, border: "1.5px solid rgba(255,255,255,0.35)" }}>
              Talk to Julius
            </a>
          </div>

          <div className="rc-hero-stats" style={{ display: "flex", justifyContent: "center", marginTop: 56, flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 40 }}>
            {[["12+", "HMIS Modules"], ["6", "Clinic Roles"], ["100%", "Kenyan-built"]].map(([n, l], i) => (
              <div key={l} className="rc-hero-stat" style={{ textAlign: "center", padding: "0 40px", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.15)" : "none" }}>
                <div className="rc-hero-stat-number" style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>{n}</div>
                <div className="rc-hero-stat-label" style={{ fontSize: 13, opacity: 0.6, marginTop: 4, color: "#fff" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rc-section" style={{ padding: "80px 24px", background: "#f5f8ff" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="rc-section-heading" style={{ textAlign: "center", marginBottom: 52 }}>
            <span style={{ color: BLUE, fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>Why RemedacareOS</span>
            <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.3rem)", fontWeight: 800, margin: "14px 0 0", color: DARK, letterSpacing: "-0.02em" }}>
              Kenya's hospital software - finally done right.
            </h2>
          </div>

          <div className="rc-pillars-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}>
            {pillars.map((pillar) => {
              const Icon = pillar.icon
              return (
                <div key={pillar.title} className="rc-card" style={{ background: "#fff", border: "1px solid #d8e2f8", borderRadius: 16, padding: "28px 22px", boxShadow: "0 2px 12px rgba(26,58,138,0.05)" }}>
                  <div className="rc-card-icon" style={{ width: 44, height: 44, borderRadius: 12, background: "#e8eefc", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <Icon size={20} color={BLUE} />
                  </div>
                  <h3 className="rc-card-title" style={{ fontSize: 15, fontWeight: 700, color: DARK, margin: "0 0 10px" }}>{pillar.title}</h3>
                  <p className="rc-card-body" style={{ color: "#556", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{pillar.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="rc-section" style={{ background: "#fff", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="rc-integration-grid" style={{ background: "linear-gradient(135deg, #e8eefc 0%, #f0f5ff 100%)", border: "1.5px solid #c4d3f8", borderRadius: 24, padding: "52px 48px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 48, alignItems: "center", boxShadow: "0 8px 40px rgba(26,58,138,0.07)" }}>
            <div className="rc-integration-copy">
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: BLUE, color: "#fff", borderRadius: 99, fontSize: 12, fontWeight: 700, padding: "7px 16px", marginBottom: 20 }}>
                <Link2 size={13} /> PharmacyOS Integration
              </div>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 800, color: DARK, margin: "0 0 14px", letterSpacing: "-0.02em" }}>
                Prescriptions flow directly to the dispensary.
              </h3>
              <p style={{ color: "#3a4d8a", fontSize: 15, lineHeight: 1.75, margin: "0 0 24px" }}>
                When a doctor issues a prescription in RemedacareOS, it lands instantly in PharmacyOS with no paper, no transcription errors and no delays.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {[
                  "Doctor issues prescription in RemedacareOS",
                  "Pharmacist sees it live in PharmacyOS",
                  "Drug dispensed and stock auto-updated",
                  "Patient billed across both systems",
                ].map((step, index) => (
                  <li key={index} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: "#2a3a7a", marginBottom: 12 }}>
                    <span style={{ width: 24, height: 24, borderRadius: "50%", background: BLUE, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{index + 1}</span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rc-integration-console" style={{ background: "#0c1b4d", borderRadius: 16, padding: "24px 20px", boxShadow: "0 12px 40px rgba(8,15,46,0.25)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", animation: "pulse-dot 2s ease-in-out infinite" }} />
                <span style={{ color: "#93c5fd", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>LIVE CONNECTION</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                <div style={{ color: "#93c5fd", fontSize: 10, fontWeight: 700, marginBottom: 5, letterSpacing: 0.5 }}>REMEDACAREOS | DOCTOR</div>
                <div style={{ color: "#fff", fontSize: 12, lineHeight: 1.55 }}>
                  Dr. Kamau issued: <strong style={{ color: "#86efac" }}>Amoxicillin 500mg x 21 tabs</strong><br />
                  Patient: Jane Wanjiku | Ward: OPD
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, margin: "10px 0" }}>
                <div style={{ width: 40, height: 1, background: "rgba(74,222,128,0.4)" }} />
                <ArrowRight size={16} color="#4ade80" />
                <div style={{ width: 40, height: 1, background: "rgba(74,222,128,0.4)" }} />
              </div>
              <div style={{ background: "rgba(15,110,86,0.18)", border: "1px solid rgba(15,110,86,0.38)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ color: "#5dcaa5", fontSize: 10, fontWeight: 700, marginBottom: 5, letterSpacing: 0.5 }}>PHARMACYOS | DISPENSARY QUEUE</div>
                <div style={{ color: "#a8e6cf", fontSize: 12, lineHeight: 1.55 }}>
                  Rx received | <strong>Amoxicillin 500mg</strong> | 21 tabs<br />
                  Patient: Jane Wanjiku | Ready to dispense
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rc-section" style={{ padding: "80px 24px", background: "#f5f8ff" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div className="rc-section-heading" style={{ textAlign: "center", marginBottom: 52 }}>
            <span style={{ color: BLUE, fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>Modules</span>
            <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.3rem)", fontWeight: 800, margin: "14px 0 0", color: DARK, letterSpacing: "-0.02em" }}>
              Everything a Kenyan hospital needs.
            </h2>
          </div>
          <div className="rc-modules-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 18 }}>
            {modules.map((module, index) => {
              const Icon = module.icon
              const isActive = activeModule === index
              const isHovered = hoveredModule === index
              return (
                <div
                  key={index}
                  className="rc-mod"
                  onClick={() => setActiveModule(isActive ? null : index)}
                  onMouseEnter={() => setHoveredModule(index)}
                  onMouseLeave={() => setHoveredModule(null)}
                  style={{ background: isActive ? "#eef3ff" : "#fff", cursor: "pointer", border: `1.5px solid ${isActive ? BLUE : isHovered ? "#a8c4f8" : "#dde6fa"}`, borderRadius: 14, padding: "22px 20px", boxShadow: isActive ? "0 6px 24px rgba(26,58,138,0.15)" : isHovered ? "0 4px 16px rgba(26,58,138,0.08)" : "none" }}
                >
                  <div className="rc-mod-icon" style={{ width: 40, height: 40, borderRadius: 10, background: isActive ? "#dce8ff" : "#edf1fb", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                    <Icon size={19} color={isActive ? BLUE : "#8da4d0"} />
                  </div>
                  <h3 className="rc-mod-title" style={{ fontSize: 14, fontWeight: 700, color: DARK, margin: "0 0 7px" }}>{module.label}</h3>
                  {isActive ? (
                    <p className="rc-mod-text" style={{ fontSize: 13, color: "#445", lineHeight: 1.65, margin: 0 }}>{module.desc}</p>
                  ) : (
                    <p className="rc-mod-text" style={{ fontSize: 12, color: "#aaa", margin: 0 }}>Click to expand</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="rc-section" style={{ background: "#fff", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="rc-compliance-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 64, alignItems: "center" }}>
            <div>
              <span style={{ color: BLUE, fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>Compliance</span>
              <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.1rem)", fontWeight: 800, margin: "14px 0 18px", color: DARK, letterSpacing: "-0.02em" }}>
                Built around Kenya's health system standards.
              </h2>
              <p style={{ color: "#556", fontSize: 15, lineHeight: 1.75, marginBottom: 32 }}>
                RemedacareOS handles every Kenyan regulatory requirement out of the box so your clinical staff can focus on patients, not paperwork.
              </p>
              <a href={WHATSAPP} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: BLUE, color: "#fff", textDecoration: "none", padding: "13px 24px", borderRadius: 10, fontWeight: 700, fontSize: 14, boxShadow: "0 4px 16px rgba(26,58,138,0.3)" }}>
                Book a Live Demo <ChevronRight size={16} />
              </a>
            </div>
            <div className="rc-compliance-card" style={{ background: "#f8faff", borderRadius: 16, padding: "8px 24px", border: "1px solid #d8e2f8", boxShadow: "0 4px 20px rgba(26,58,138,0.06)" }}>
              {compliance.map((item, index) => (
                <div key={index} className="rc-compliance-item" style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 0", borderBottom: index < compliance.length - 1 ? "1px solid #e8eefa" : "none" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#e0e8fb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <CheckCircle size={14} color={BLUE} />
                  </div>
                  <span style={{ fontSize: 15, color: "#2a3060", fontWeight: 500 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rc-cta" style={{ position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #080f2e 0%, #1a3a8a 100%)", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: DOT_PATTERN, backgroundSize: "20px 20px", opacity: 0.04, pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 680, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 800, color: "#fff", margin: "0 0 18px", letterSpacing: "-0.02em" }}>
            Ready to transform your hospital's operations?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 16, lineHeight: 1.75, marginBottom: 40 }}>
            RemedacareOS is available now for Kenyan hospitals and clinics. Book a free demo and see the full HMIS live from patient registration to MOH reporting.
          </p>
          <div className="rc-cta-actions" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="rc-btn-white" style={{ background: "#fff", color: BLUE, fontWeight: 700, padding: "15px 30px", borderRadius: 10, textDecoration: "none", fontSize: 15, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
              Book Free Demo <ArrowRight size={16} />
            </a>
            <Link to="/pharmacyos" style={{ background: "transparent", color: "#fff", fontWeight: 600, padding: "15px 30px", borderRadius: 10, textDecoration: "none", fontSize: 15, border: "1.5px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", gap: 8 }}>
              Explore PharmacyOS <ChevronRight size={15} />
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
