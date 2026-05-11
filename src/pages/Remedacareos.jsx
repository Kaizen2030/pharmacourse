import { useState } from "react"
import { Link } from "react-router-dom"
import {
  ClipboardList, BarChart3, Users, Link2, Calendar,
  FileText, Shield, Activity, Pill, BedDouble,
  Bell, Database, CheckCircle, ArrowRight,
  Building2, ChevronRight, Stethoscope, TrendingUp, Cpu
} from "lucide-react"

const WHATSAPP = "https://wa.me/254790059584?text=Hi%20Julius%2C%20I%27d%20like%20to%20book%20a%20demo%20of%20RemedacareOS."

const modules = [
  { icon: ClipboardList, label: "Patient Records",        desc: "Complete electronic health records — visit history, diagnoses, chronic conditions, allergies & vitals." },
  { icon: BedDouble,     label: "Ward & Bed Management",  desc: "Track inpatient admissions, bed allocation, ward rounds and discharge planning." },
  { icon: BarChart3,     label: "MOH Reports",            desc: "Auto-generate Ministry of Health DHIS2-compliant reports — MOH 705A/B, 711, and 333." },
  { icon: Activity,      label: "Clinical Encounters",    desc: "Record outpatient consultations, triage data, lab requests, and treatment plans." },
  { icon: Pill,          label: "PharmacyOS Integration", desc: "Seamless connection to PharmacyOS — prescriptions flow directly to the dispensary queue." },
  { icon: Users,         label: "Multi-role Access",      desc: "Doctor, Nurse, Pharmacist, Receptionist, Lab Technician, and Admin roles with scoped permissions." },
  { icon: FileText,      label: "Billing & Invoicing",    desc: "Patient billing tied to clinical encounters. SHA, NHIF, Insurance, Cash & M-Pesa payment methods." },
  { icon: Calendar,      label: "Appointment Scheduling", desc: "Book and manage outpatient appointments. SMS/WhatsApp reminders for patients." },
  { icon: Database,      label: "Lab & Radiology",        desc: "Lab test requests, result entry, and radiology order management with result linking to patient records." },
  { icon: Shield,        label: "SHA / NHIF Claims",      desc: "Integrated SHA capitation and fee-for-service claim management for hospitals." },
  { icon: Bell,          label: "Clinical Alerts",        desc: "Drug interaction alerts, allergy warnings, and critical lab value notifications at point of care." },
  { icon: TrendingUp,    label: "Analytics Dashboard",    desc: "Hospital KPIs — daily census, revenue, top diagnoses, bed occupancy, and staff productivity." },
]

const pillars = [
  { icon: Stethoscope, title: "Clinical First",      body: "Built by a pharmacist who understands clinical workflows — not just tech." },
  { icon: Link2,        title: "Connected Ecosystem", body: "Native PharmacyOS integration. One record from prescription to dispensary." },
  { icon: Shield,       title: "Kenyan Compliant",    body: "MOH, SHA, NHIF, DHIS2, KRA — every Kenyan health system standard covered." },
  { icon: Database,     title: "Multi-tenant Cloud",  body: "Supabase row-level security isolates every hospital's data. Fully cloud-native." },
]

const compliance = [
  "MOH DHIS2-compliant reports — 705A/B, 711, 333",
  "SHA capitation & fee-for-service claim management",
  "NHIF / SHIF / PHC billing integration",
  "KRA eTIMS-linked billing per encounter",
  "PPB-aware prescribing & dispensing workflow",
  "Multi-role audit trail for every clinical action",
]

const DOT_PATTERN = `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.2' fill='%23ffffff'/%3E%3C/svg%3E")`

const css = `
  @keyframes pulse-dot {
    0%, 100% { transform: scale(1); opacity: 1; }
    50%       { transform: scale(1.5); opacity: 0.65; }
  }
  .rc-card { transition: transform 0.22s ease, box-shadow 0.22s ease; }
  .rc-card:hover { transform: translateY(-5px); box-shadow: 0 16px 36px rgba(26,58,138,0.12) !important; }
  .rc-mod { transition: all 0.2s ease; }
  .rc-mod:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(26,58,138,0.1) !important; }
  .rc-btn-white { transition: transform 0.18s ease, box-shadow 0.18s ease; }
  .rc-btn-white:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(255,255,255,0.2); }
  .rc-btn-ghost { transition: background 0.18s ease; }
  .rc-btn-ghost:hover { background: rgba(255,255,255,0.1) !important; }
`

export default function RemedacareOS() {
  const [activeModule, setActiveModule] = useState(null)
  const [hoveredModule, setHoveredModule] = useState(null)

  const BLUE = "#1a3a8a"
  const DARK = "#0c1b4d"

  return (
    <div style={{ fontFamily: "'Outfit', 'Segoe UI', sans-serif", background: "#f5f8ff", minHeight: "100vh" }}>
      <style>{css}</style>

      {/* ── HERO ── */}
      <section style={{
        position: "relative", overflow: "hidden",
        background: "linear-gradient(135deg, #080f2e 0%, #1a3a8a 55%, #2755c5 100%)",
        color: "#fff", padding: "96px 24px 72px", textAlign: "center"
      }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: DOT_PATTERN, backgroundSize: "20px 20px", opacity: 0.05, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)", width: 700, height: 400, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(39,85,197,0.4) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", maxWidth: 820, margin: "0 auto" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)",
            borderRadius: 99, fontSize: 11, fontWeight: 700, letterSpacing: 1.8,
            padding: "7px 18px", marginBottom: 28, textTransform: "uppercase"
          }}>
            RemedacareOS — Hospital Management System
          </span>

          <h1 style={{ fontSize: "clamp(2.2rem, 5.5vw, 3.6rem)", fontWeight: 800, lineHeight: 1.12, margin: "0 0 22px", letterSpacing: "-0.02em" }}>
            From clinic to dispensary.<br />One connected system.
          </h1>
          <p style={{ fontSize: 18, opacity: 0.82, maxWidth: 640, margin: "0 auto 40px", lineHeight: 1.65 }}>
            A full Hospital Management Information System built specifically for Kenyan hospitals — with native PharmacyOS integration, MOH reports, SHA claims, and AI clinical support.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="rc-btn-white" style={{
              background: "#fff", color: BLUE, fontWeight: 700,
              padding: "15px 30px", borderRadius: 10, textDecoration: "none",
              fontSize: 15, display: "flex", alignItems: "center", gap: 8,
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)"
            }}>
              Book a Demo <ArrowRight size={16} />
            </a>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="rc-btn-ghost" style={{
              background: "transparent", color: "#fff", fontWeight: 600,
              padding: "15px 30px", borderRadius: 10, textDecoration: "none",
              fontSize: 15, border: "1.5px solid rgba(255,255,255,0.35)"
            }}>
              Talk to Julius
            </a>
          </div>

          {/* Stats */}
          <div style={{
            display: "flex", justifyContent: "center", marginTop: 56, flexWrap: "wrap",
            borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 40
          }}>
            {[["12+", "HMIS Modules"], ["6", "Clinic Roles"], ["100%", "Kenyan-built"]].map(([n, l], i) => (
              <div key={l} style={{
                textAlign: "center", padding: "0 40px",
                borderRight: i < 2 ? "1px solid rgba(255,255,255,0.15)" : "none"
              }}>
                <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>{n}</div>
                <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4, color: "#fff" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOUR PILLARS ── */}
      <section style={{ padding: "80px 24px", background: "#f5f8ff" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <span style={{ color: BLUE, fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>Why RemedacareOS</span>
            <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.3rem)", fontWeight: 800, margin: "14px 0 0", color: DARK, letterSpacing: "-0.02em" }}>
              Kenya's hospital software — finally done right.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}>
            {pillars.map((p) => {
              const Icon = p.icon
              return (
                <div key={p.title} className="rc-card" style={{
                  background: "#fff", border: "1px solid #d8e2f8", borderRadius: 16,
                  padding: "28px 22px", boxShadow: "0 2px 12px rgba(26,58,138,0.05)"
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "#e8eefc", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <Icon size={20} color={BLUE} />
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: DARK, margin: "0 0 10px" }}>{p.title}</h3>
                  <p style={{ color: "#556", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{p.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── PHARMACYOS INTEGRATION HIGHLIGHT ── */}
      <section style={{ background: "#fff", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{
            background: "linear-gradient(135deg, #e8eefc 0%, #f0f5ff 100%)",
            border: "1.5px solid #c4d3f8", borderRadius: 24,
            padding: "52px 48px", display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 48, alignItems: "center",
            boxShadow: "0 8px 40px rgba(26,58,138,0.07)"
          }}>
            <div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: BLUE, color: "#fff", borderRadius: 99,
                fontSize: 12, fontWeight: 700, padding: "7px 16px", marginBottom: 20
              }}>
                <Link2 size={13} /> PharmacyOS Integration
              </div>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 800, color: DARK, margin: "0 0 14px", letterSpacing: "-0.02em" }}>
                Prescriptions flow directly to the dispensary.
              </h3>
              <p style={{ color: "#3a4d8a", fontSize: 15, lineHeight: 1.75, margin: "0 0 24px" }}>
                When a doctor issues a prescription in RemedacareOS, it lands instantly in PharmacyOS — no paper, no transcription errors, no delays. One patient. One record. Both systems.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {[
                  "Doctor issues prescription in RemedacareOS",
                  "Pharmacist sees it live in PharmacyOS",
                  "Drug dispensed, stock auto-updated",
                  "Patient billed across both systems"
                ].map((step, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: "#2a3a7a", marginBottom: 12 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: "50%", background: BLUE,
                      color: "#fff", fontSize: 11, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                    }}>{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ background: "#0c1b4d", borderRadius: 16, padding: "24px 20px", boxShadow: "0 12px 40px rgba(8,15,46,0.25)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", animation: "pulse-dot 2s ease-in-out infinite" }} />
                <span style={{ color: "#93c5fd", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>LIVE CONNECTION</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                <div style={{ color: "#93c5fd", fontSize: 10, fontWeight: 700, marginBottom: 5, letterSpacing: 0.5 }}>REMEDACAREOS · DOCTOR</div>
                <div style={{ color: "#fff", fontSize: 12, lineHeight: 1.55 }}>
                  Dr. Kamau issued: <strong style={{ color: "#86efac" }}>Amoxicillin 500mg × 21 tabs</strong><br />
                  Patient: Jane Wanjiku · Ward: OPD
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, margin: "10px 0" }}>
                <div style={{ width: 40, height: 1, background: "rgba(74,222,128,0.4)" }} />
                <ArrowRight size={16} color="#4ade80" />
                <div style={{ width: 40, height: 1, background: "rgba(74,222,128,0.4)" }} />
              </div>
              <div style={{ background: "rgba(15,110,86,0.18)", border: "1px solid rgba(15,110,86,0.38)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ color: "#5dcaa5", fontSize: 10, fontWeight: 700, marginBottom: 5, letterSpacing: 0.5 }}>PHARMACYOS · DISPENSARY QUEUE</div>
                <div style={{ color: "#a8e6cf", fontSize: 12, lineHeight: 1.55 }}>
                  ✓ Rx received · <strong>Amoxicillin 500mg</strong> · 21 tabs<br />
                  Patient: Jane Wanjiku · Ready to dispense
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MODULES GRID ── */}
      <section style={{ padding: "80px 24px", background: "#f5f8ff" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <span style={{ color: BLUE, fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>Modules</span>
            <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.3rem)", fontWeight: 800, margin: "14px 0 0", color: DARK, letterSpacing: "-0.02em" }}>
              Everything a Kenyan hospital needs.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 18 }}>
            {modules.map((m, i) => {
              const Icon = m.icon
              const isActive = activeModule === i
              const isHov = hoveredModule === i
              return (
                <div
                  key={i}
                  className="rc-mod"
                  onClick={() => setActiveModule(isActive ? null : i)}
                  onMouseEnter={() => setHoveredModule(i)}
                  onMouseLeave={() => setHoveredModule(null)}
                  style={{
                    background: "#fff", cursor: "pointer",
                    border: `1.5px solid ${isActive ? BLUE : isHov ? "#a8c4f8" : "#dde6fa"}`,
                    borderRadius: 14, padding: "22px 20px",
                    boxShadow: isActive ? "0 6px 24px rgba(26,58,138,0.15)" : isHov ? "0 4px 16px rgba(26,58,138,0.08)" : "none",
                    background: isActive ? "#eef3ff" : "#fff"
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: isActive ? "#dce8ff" : "#edf1fb", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                    <Icon size={19} color={isActive ? BLUE : "#8da4d0"} />
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: DARK, margin: "0 0 7px" }}>{m.label}</h3>
                  {isActive
                    ? <p style={{ fontSize: 13, color: "#445", lineHeight: 1.65, margin: 0 }}>{m.desc}</p>
                    : <p style={{ fontSize: 12, color: "#aaa", margin: 0 }}>Click to expand</p>
                  }
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── COMPLIANCE ── */}
      <section style={{ background: "#fff", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 64, alignItems: "center" }}>
            <div>
              <span style={{ color: BLUE, fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>Compliance</span>
              <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.1rem)", fontWeight: 800, margin: "14px 0 18px", color: DARK, letterSpacing: "-0.02em" }}>
                Built around Kenya's health system standards.
              </h2>
              <p style={{ color: "#556", fontSize: 15, lineHeight: 1.75, marginBottom: 32 }}>
                RemedacareOS handles every Kenyan regulatory requirement out of the box — from MOH reporting to SHA claims — so your clinical staff focuses on patients, not paperwork.
              </p>
              <a href={WHATSAPP} target="_blank" rel="noreferrer" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: BLUE, color: "#fff", textDecoration: "none",
                padding: "13px 24px", borderRadius: 10, fontWeight: 700, fontSize: 14,
                boxShadow: "0 4px 16px rgba(26,58,138,0.3)"
              }}>
                Book a Live Demo <ChevronRight size={16} />
              </a>
            </div>
            <div style={{ background: "#f8faff", borderRadius: 16, padding: "8px 24px", border: "1px solid #d8e2f8", boxShadow: "0 4px 20px rgba(26,58,138,0.06)" }}>
              {compliance.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 0", borderBottom: i < compliance.length - 1 ? "1px solid #e8eefa" : "none" }}>
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

      {/* ── CTA ── */}
      <section style={{
        position: "relative", overflow: "hidden",
        background: "linear-gradient(135deg, #080f2e 0%, #1a3a8a 100%)",
        padding: "80px 24px", textAlign: "center"
      }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: DOT_PATTERN, backgroundSize: "20px 20px", opacity: 0.04, pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 680, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 800, color: "#fff", margin: "0 0 18px", letterSpacing: "-0.02em" }}>
            Ready to transform your hospital's operations?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 16, lineHeight: 1.75, marginBottom: 40 }}>
            RemedacareOS is available now for Kenyan hospitals and clinics. Book a free demo and see the full HMIS live — from patient registration to MOH reporting.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="rc-btn-white" style={{
              background: "#fff", color: BLUE, fontWeight: 700,
              padding: "15px 30px", borderRadius: 10, textDecoration: "none", fontSize: 15,
              display: "flex", alignItems: "center", gap: 8,
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
            }}>
              Book Free Demo <ArrowRight size={16} />
            </a>
            <Link to="/pharmacyos" style={{
              background: "transparent", color: "#fff", fontWeight: 600,
              padding: "15px 30px", borderRadius: 10, textDecoration: "none",
              fontSize: 15, border: "1.5px solid rgba(255,255,255,0.35)",
              display: "flex", alignItems: "center", gap: 8
            }}>
              Explore PharmacyOS <ChevronRight size={15} />
            </Link>
          </div>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 28 }}>
            Built by Julius Kinyua Wanjau · Pharmacist & Software Developer · Nairobi, Kenya
          </p>
        </div>
      </section>
    </div>
  )
}
