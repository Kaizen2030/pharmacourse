import { useState } from "react"
import { Link } from "react-router-dom"
import {
  ShoppingCart, Package, AlertTriangle, CreditCard,
  FileText, BarChart3, Settings, Cpu, Shield,
  Building2, CheckCircle, ChevronRight, ArrowRight,
  Receipt, Smartphone, TrendingUp
} from "lucide-react"

const WHATSAPP = "https://wa.me/254790059584?text=Hi%20Julius%2C%20I%27d%20like%20to%20book%20a%20demo%20of%20PharmacyOS."

const modules = [
  { icon: ShoppingCart,  label: "Sales & POS",            desc: "Multi-item cart, M-Pesa, Cash, Credit, SHA & Insurance payments. Receipt generation on every sale.", color: "#0F6E56" },
  { icon: Package,       label: "Inventory Management",   desc: "Real-time stock tracking with PPB controlled substance classification, low-stock alerts & CSV export.", color: "#1A6BB5" },
  { icon: AlertTriangle, label: "Expiry Alerts",          desc: "Daily auto-monitoring with Expired / Urgent / Monitor / OK severity tiers. One-click dispose workflow.", color: "#E09B00" },
  { icon: CreditCard,    label: "Credit & Debts",         desc: "Log credit sales, track outstanding balances, aged debt analysis, and Mark-Paid workflow.", color: "#7C3AED" },
  { icon: FileText,      label: "Prescriptions",          desc: "Full prescription ledger with Rx/2026/XXXX numbering, patient tracking & dispenser attribution.", color: "#0F6E56" },
  { icon: Smartphone,    label: "M-Pesa Transactions",    desc: "Live M-Pesa transaction log synced from your sales ledger. STK Push capability included.", color: "#00B300" },
  { icon: Building2,     label: "SHA Claims",             desc: "Track SHA, SHIF, NHIF, PHC and ECCIF claims. Bulk CSV download for SHA portal submission.", color: "#1A6BB5" },
  { icon: Shield,        label: "Insurance Claims",       desc: "Manage AAR, Jubilee, Britam, Madison, CIC, UAP & Resolution claims with batch download.", color: "#E24B4A" },
  { icon: Receipt,       label: "eTIMS / KRA Compliance", desc: "Auto-generate KRA-compliant CSV reports for every sale. Ready for manual eTIMS portal upload.", color: "#E09B00" },
  { icon: BarChart3,     label: "Reports & Analytics",    desc: "Sales bar charts, Top Drugs rankings, monthly summaries & PPB Narcotics CSV for regulatory submission.", color: "#7C3AED" },
  { icon: Settings,      label: "Settings & Roles",       desc: "Owner-protected settings. Manage pharmacy profile, PPB licence, KRA PIN, M-Pesa Paybill & staff roles.", color: "#0F6E56" },
  { icon: Cpu,           label: "AI Drug Advisor",        desc: "AI-powered chatbot for drug dosage, interactions & contraindications. Image upload supported.", color: "#1A6BB5" },
]

const compliance = [
  "PPB Narcotics & Controlled Substances Report",
  "SHA / NHIF / SHIF / PHC / ECCIF Claims",
  "KRA eTIMS Electronic Tax Invoices",
  "Prescription Ledger (Rx/2026/XXXX format)",
  "M-Pesa Paybill & Till Integration",
  "Multi-role Access Control (Admin / Pharmacist)",
]

const whyCards = [
  { emoji: "🏥", title: "SHA & NHIF Ready",    body: "Process SHA, SHIF, NHIF, PHC and ECCIF claims from the same screen you use for cash sales." },
  { emoji: "📊", title: "eTIMS / KRA Built-in", body: "Auto-generate compliant CSV reports per sale. Stay KRA-compliant without extra work." },
  { emoji: "💊", title: "PPB Narcotics Report", body: "One-click PPB Narcotics & Controlled Substances CSV for regulatory submission." },
  { emoji: "📱", title: "M-Pesa Integrated",   body: "Live M-Pesa transaction log, STK Push capability, and Paybill/Till reconciliation." },
]

const DOT_PATTERN = `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.2' fill='%23ffffff'/%3E%3C/svg%3E")`

const css = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-dot {
    0%, 100% { transform: scale(1); opacity: 1; }
    50%       { transform: scale(1.4); opacity: 0.7; }
  }
  .pharmacyos-card {
    transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
  }
  .pharmacyos-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 16px 36px rgba(15,110,86,0.13) !important;
  }
  .module-card {
    transition: all 0.2s ease;
  }
  .module-card:hover {
    transform: translateY(-3px);
  }
  .cta-btn-primary {
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }
  .cta-btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(255,255,255,0.25);
  }
  .cta-btn-outline {
    transition: background 0.18s ease;
  }
  .cta-btn-outline:hover {
    background: rgba(255,255,255,0.1) !important;
  }
`

export default function PharmacyOS() {
  const [activeModule, setActiveModule] = useState(null)
  const [hoveredModule, setHoveredModule] = useState(null)

  return (
    <div style={{ fontFamily: "'Outfit', 'Segoe UI', sans-serif", background: "#f8faf9", minHeight: "100vh" }}>
      <style>{css}</style>

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section style={{
        position: "relative", overflow: "hidden",
        background: "linear-gradient(135deg, #062318 0%, #0F6E56 58%, #1a9e7a 100%)",
        color: "#fff", padding: "96px 24px 72px", textAlign: "center"
      }}>
        {/* dot overlay */}
        <div style={{
          position: "absolute", inset: 0, backgroundImage: DOT_PATTERN,
          backgroundSize: "20px 20px", opacity: 0.06, pointerEvents: "none"
        }} />
        {/* radial glow */}
        <div style={{
          position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)",
          width: 700, height: 400, borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(26,158,122,0.35) 0%, transparent 70%)",
          pointerEvents: "none"
        }} />

        <div style={{ position: "relative", maxWidth: 800, margin: "0 auto" }}>
          <span style={{
            display: "inline-block", background: "rgba(255,255,255,0.14)",
            border: "1px solid rgba(255,255,255,0.28)", borderRadius: 99,
            fontSize: 11, fontWeight: 700, letterSpacing: 1.8,
            padding: "7px 18px", marginBottom: 28, textTransform: "uppercase"
          }}>
            PharmacyOS — Dispensary Manager v4.0
          </span>

          <h1 style={{
            fontSize: "clamp(2.2rem, 5.5vw, 3.6rem)", fontWeight: 800,
            lineHeight: 1.12, margin: "0 0 22px", letterSpacing: "-0.02em"
          }}>
            The complete pharmacy<br />management system for Kenya.
          </h1>
          <p style={{ fontSize: 18, opacity: 0.82, maxWidth: 600, margin: "0 auto 40px", lineHeight: 1.65 }}>
            AI-powered pharmacy workflow for fast counters, accurate stock, and compliant reporting.<br />
            SHA-ready, eTIMS/KRA compliant, with M-Pesa and PPB support.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="cta-btn-primary" style={{
              background: "#fff", color: "#0F6E56", fontWeight: 700,
              padding: "15px 30px", borderRadius: 10, textDecoration: "none",
              fontSize: 15, display: "flex", alignItems: "center", gap: 8,
              boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
            }}>
              Book a Free Demo <ArrowRight size={16} />
            </a>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="cta-btn-outline" style={{
              background: "transparent", color: "#fff", fontWeight: 600,
              padding: "15px 30px", borderRadius: 10, textDecoration: "none",
              fontSize: 15, border: "1.5px solid rgba(255,255,255,0.38)"
            }}>
              Request Pricing
            </a>
          </div>

          {/* ── FIXED STAT BAR ── */}
          <div style={{
            display: "flex", gap: 0, justifyContent: "center", marginTop: 56, flexWrap: "wrap",
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 24, padding: "22px 12px", backdropFilter: "blur(10px)"
          }}>
            {[["12", "Modules"], ["3", "Platforms Supported"], ["100%", "Kenya-built"]].map(([n, l], i) => (
              <div key={l} style={{
                textAlign: "center", padding: "0 36px", color: "#fff",
                borderRight: i < 2 ? "1px solid rgba(255,255,255,0.18)" : "none"
              }}>
                <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em" }}>{n}</div>
                <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY PHARMACYOS ──────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", background: "#f8faf9" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <span style={{ color: "#0F6E56", fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>
              Built for Kenya
            </span>
            <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.3rem)", fontWeight: 800, margin: "14px 0 18px", color: "#0a2e1f", letterSpacing: "-0.02em" }}>
              Solving real problems in Kenyan pharmacy
            </h2>
            <p style={{ color: "#556", fontSize: 16, maxWidth: 640, margin: "0 auto", lineHeight: 1.75 }}>
              Kenya's retail pharmacies deal with fragmented records, PPB compliance pressure, SHA claims paperwork, and M-Pesa integrations that don't talk to each other. PharmacyOS solves all of this in one app.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
            {whyCards.map(c => (
              <div key={c.title} className="pharmacyos-card" style={{
                background: "#fff", border: "1px solid #e0ece8", borderRadius: 16,
                padding: "28px 24px", boxShadow: "0 2px 12px rgba(15,110,86,0.05)"
              }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{c.emoji}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0a2e1f", margin: "0 0 10px" }}>{c.title}</h3>
                <p style={{ color: "#666", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 12 MODULES GRID ──────────────────────────────────────────── */}
      <section style={{ background: "#fff", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <span style={{ color: "#0F6E56", fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>
              Everything in one app
            </span>
            <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.3rem)", fontWeight: 800, margin: "14px 0 0", color: "#0a2e1f", letterSpacing: "-0.02em" }}>
              12 powerful modules. Zero compromises.
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 18 }}>
            {modules.map((m, i) => {
              const Icon = m.icon
              const isActive = activeModule === i
              const isHovered = hoveredModule === i
              return (
                <div
                  key={i}
                  className="module-card"
                  onClick={() => setActiveModule(isActive ? null : i)}
                  onMouseEnter={() => setHoveredModule(i)}
                  onMouseLeave={() => setHoveredModule(null)}
                  style={{
                    border: `1.5px solid ${isActive ? m.color : isHovered ? `${m.color}60` : "#e8ede9"}`,
                    borderRadius: 14, padding: "22px 20px", cursor: "pointer",
                    background: isActive ? `${m.color}08` : "#fafcfb",
                    boxShadow: isActive
                      ? `0 6px 24px ${m.color}28`
                      : isHovered ? `0 4px 16px ${m.color}14` : "none"
                  }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: 11,
                    background: `${m.color}18`, display: "flex",
                    alignItems: "center", justifyContent: "center", marginBottom: 14
                  }}>
                    <Icon size={20} color={m.color} />
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0a2e1f", margin: "0 0 7px" }}>{m.label}</h3>
                  {isActive
                    ? <p style={{ fontSize: 13, color: "#444", lineHeight: 1.65, margin: 0 }}>{m.desc}</p>
                    : <p style={{ fontSize: 12, color: "#aaa", margin: 0 }}>Click to expand</p>
                  }
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── COMPLIANCE CHECKLIST ────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", background: "#f8faf9" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 64, alignItems: "center"
          }}>
            <div>
              <span style={{ color: "#0F6E56", fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>Compliance</span>
              <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.1rem)", fontWeight: 800, margin: "14px 0 18px", color: "#0a2e1f", letterSpacing: "-0.02em" }}>
                Stay compliant with every Kenyan authority.
              </h2>
              <p style={{ color: "#666", fontSize: 15, lineHeight: 1.75, marginBottom: 32 }}>
                PharmacyOS is built around Kenya's specific regulatory requirements — from PPB narcotics reporting to KRA eTIMS. Every report you need is one click away.
              </p>
              <a href={WHATSAPP} target="_blank" rel="noreferrer" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "#0F6E56", color: "#fff", textDecoration: "none",
                padding: "13px 24px", borderRadius: 10, fontWeight: 700, fontSize: 14,
                boxShadow: "0 4px 16px rgba(15,110,86,0.3)",
                transition: "box-shadow 0.2s ease"
              }}>
                See a Live Demo <ChevronRight size={16} />
              </a>
            </div>
            <div style={{
              background: "#fff", borderRadius: 16, padding: "8px 24px",
              border: "1px solid #e0ece8", boxShadow: "0 4px 20px rgba(15,110,86,0.06)"
            }}>
              {compliance.map((item, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 14,
                  padding: "16px 0", borderBottom: i < compliance.length - 1 ? "1px solid #edf2ef" : "none"
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: "#e8f5f0", display: "flex", alignItems: "center",
                    justifyContent: "center", flexShrink: 0, marginTop: 1
                  }}>
                    <CheckCircle size={14} color="#0F6E56" />
                  </div>
                  <span style={{ fontSize: 15, color: "#2a3a30", fontWeight: 500 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── OUTCOMES ────────────────────────────────────────────────── */}
      <section style={{ background: "#fff", padding: "72px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ color: "#0F6E56", fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>
              Real pharmacy outcomes
            </span>
            <h2 style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 800, margin: "14px 0 0", color: "#0a2e1f", letterSpacing: "-0.02em" }}>
              Built for speed, accuracy and trust.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {[
              { icon: ShoppingCart, title: "Faster checkout", desc: "Complete a sale, collect M-Pesa, and print receipts in seconds without manual price entry." },
              { icon: Package, title: "Inventory you can trust", desc: "Auto update stock, expiry and PPB controls so your shelves always match the register." },
              { icon: CreditCard, title: "Claims done right", desc: "Process SHA/NHIF, insurance and eTIMS reports from the same workflow with fewer mistakes." },
              { icon: TrendingUp, title: "Better pharmacy margins", desc: "Spot fast-moving products, reduce losses and keep the business healthy with instant analytics." }
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <div key={i} style={{ background: "#f8faf9", borderRadius: 18, padding: "28px 22px", border: "1px solid #e9f2ed" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 14, background: "#e6f4ef", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <Icon size={20} color="#0F6E56" />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0a2e1f", margin: "0 0 10px" }}>{item.title}</h3>
                  <p style={{ fontSize: 14, color: "#556", lineHeight: 1.75, margin: 0 }}>{item.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── AI DRUG ADVISOR HIGHLIGHT ────────────────────────────────── */}
      <section style={{ padding: "80px 24px", background: "#f8faf9" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{
            background: "linear-gradient(135deg, #e2f4ed 0%, #f0faf7 100%)",
            border: "1.5px solid #b8dfd3", borderRadius: 24, padding: "52px 48px",
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 48, alignItems: "center",
            boxShadow: "0 8px 40px rgba(15,110,86,0.08)"
          }}>
            <div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "#0F6E56", color: "#fff", borderRadius: 99,
                fontSize: 12, fontWeight: 700, padding: "7px 16px", marginBottom: 20
              }}>
                <Cpu size={14} /> Powered by AI Integration
              </div>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0a2e1f", margin: "0 0 14px", letterSpacing: "-0.02em" }}>
                AI Drug Advisor built right in.
              </h3>
              <p style={{ color: "#3a6b57", fontSize: 15, lineHeight: 1.75, margin: "0 0 24px" }}>
                Ask about drug dosages, interactions, contraindications, or upload images of medicine boxes for instant analysis — all powered by AI integration.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {[
                  "Natural language clinical queries",
                  "Image upload (medicine boxes, prescriptions)",
                  "Context-aware of your pharmacy's inventory",
                  "One-click quick queries for common drugs"
                ].map(item => (
                  <li key={item} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#2a5a47", marginBottom: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#d0ede4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <CheckCircle size={13} color="#0F6E56" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{
              background: "#0a2e1f", borderRadius: 16, padding: "24px 20px",
              fontFamily: "'Fira Code', 'Courier New', monospace", fontSize: 13, color: "#a8e6cf",
              boxShadow: "0 12px 40px rgba(6,35,24,0.3)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", animation: "pulse-dot 2s ease-in-out infinite" }} />
                <span style={{ color: "#5dcaa5", fontSize: 11, letterSpacing: 1, fontWeight: 700 }}>AI DRUG ADVISOR</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px", marginBottom: 10, color: "#fff", fontSize: 13 }}>
                What is the adult dose for Amoxicillin for a chest infection?
              </div>
              <div style={{ background: "#0F6E5622", border: "1px solid #0F6E5644", borderRadius: 10, padding: "12px 14px", lineHeight: 1.65, fontSize: 12 }}>
                <strong style={{ color: "#5dcaa5" }}>PharmacyOS AI:</strong> For community-acquired pneumonia, the standard adult dose is Amoxicillin 500mg three times daily for 5–7 days. High-dose therapy (875mg BD) may apply for severe infections...
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 7, flexWrap: "wrap" }}>
                {["Amoxicillin dose", "Warfarin interactions", "Cipro in children"].map(q => (
                  <span key={q} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.13)", borderRadius: 99, padding: "5px 11px", fontSize: 11, color: "#a8e6cf" }}>{q}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section style={{ background: "#fff", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 800, color: "#0a2e1f", margin: "0 0 18px", letterSpacing: "-0.02em" }}>
            Ready to modernise your pharmacy?
          </h2>
          <p style={{ color: "#666", fontSize: 16, lineHeight: 1.75, marginBottom: 40 }}>
            PharmacyOS is available now for Kenyan retail pharmacies. Book a free demo and see the full system live — from POS to PPB reporting.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" style={{
              background: "#0F6E56", color: "#fff", fontWeight: 700,
              padding: "15px 30px", borderRadius: 10, textDecoration: "none", fontSize: 15,
              display: "flex", alignItems: "center", gap: 8,
              boxShadow: "0 4px 20px rgba(15,110,86,0.3)"
            }}>
              Book Free Demo <ArrowRight size={16} />
            </a>
            <Link to="/courses" style={{
              background: "transparent", color: "#0F6E56", fontWeight: 600,
              padding: "15px 30px", borderRadius: 10, textDecoration: "none",
              fontSize: 15, border: "1.5px solid #0F6E56"
            }}>
              Explore PharmaCourse
            </Link>
          </div>
          <p style={{ color: "#bbb", fontSize: 13, marginTop: 24 }}>
            Built by Julius Kinyua Wanjau · Pharmacist & Software Developer · Nairobi, Kenya
          </p>
        </div>
      </section>
    </div>
  )
}
