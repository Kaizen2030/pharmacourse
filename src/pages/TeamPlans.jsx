import { useEffect, useState } from "react"
import { Building2, CheckCircle2, ChevronRight, ShieldCheck, Users } from "lucide-react"
import SEO from "../components/SEO"
import { supabase } from "../lib/supabaseClient"
import "./TeamPlans.css"

const WHATSAPP_DEMO_LINK = "https://wa.me/254790059584?text=Hi%20Julius%2C%20I%27d%20like%20to%20enquire%20about%20team%20plans."

const DEFAULT_PRICING_TIERS = [
  {
    tier: "starter",
    name: "Starter",
    seats: 5,
    price_kes: null,
    description: "A practical starting plan for independent pharmacies and smaller care teams.",
    features: ["CPD tracking dashboard", "Certificate management", "WhatsApp support"],
    is_visible: true,
    featured: false,
  },
  {
    tier: "growth",
    name: "Growth",
    seats: 20,
    price_kes: null,
    description: "Built for busy retail chains, hospital pharmacy units, and expanding operations teams.",
    features: ["CPD tracking dashboard", "Certificate management", "WhatsApp support"],
    is_visible: true,
    featured: true,
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    seats: null,
    price_kes: null,
    description: "For health systems, multi-branch pharmacy groups, and organizations needing full rollout support.",
    features: ["CPD tracking dashboard", "Certificate management", "WhatsApp support"],
    is_visible: true,
    featured: false,
  },
]

const HOW_IT_WORKS = [
  {
    title: "Enroll team",
    description: "Choose a plan, share your staff list, and get your team set up for learning in one coordinated rollout.",
    icon: Users,
  },
  {
    title: "Track progress",
    description: "Monitor completion, CPD momentum, and readiness across branches or departments from one view.",
    icon: ShieldCheck,
  },
  {
    title: "Download certificates",
    description: "Generate completion records and certificates quickly when learners finish the required training paths.",
    icon: Building2,
  },
]

function getTierDisplayName(tier) {
  if (tier === "starter") return "Starter"
  if (tier === "growth") return "Growth"
  if (tier === "enterprise") return "Enterprise"
  return tier || "Plan"
}

function sortPricingTiers(rows) {
  const order = ["starter", "growth", "enterprise"]
  return [...rows].sort((a, b) => order.indexOf(a.tier) - order.indexOf(b.tier))
}

function normalizePricingRows(rows) {
  const visibleRows = (rows || []).filter((row) => row.is_visible !== false)
  if (visibleRows.length === 0) return DEFAULT_PRICING_TIERS

  return sortPricingTiers(visibleRows).map((row) => ({
    ...row,
    name: getTierDisplayName(row.tier),
    featured: row.tier === "growth",
    features: Array.isArray(row.features) && row.features.length > 0
      ? row.features
      : ["CPD tracking dashboard", "Certificate management", "WhatsApp support"],
  }))
}

export default function TeamPlans() {
  const [pricingTiers, setPricingTiers] = useState(DEFAULT_PRICING_TIERS)

  useEffect(() => {
    let isActive = true

    async function loadPricing() {
      const { data, error } = await supabase
        .from("team_plan_pricing")
        .select("tier, seats, price_kes, description, features, is_visible")

      if (!isActive || error) return
      setPricingTiers(normalizePricingRows(data || []))
    }

    loadPricing()

    return () => {
      isActive = false
    }
  }, [])

  return (
    <div className="page team-plans-page">
      <SEO
        title="Team Plans"
        description="Bulk pharmacy training plans for pharmacies and hospitals that need team-wide CPD compliance, progress tracking, and certificate management."
        path="/team-plans"
        type="website"
      />

      <div className="page-header">
        <div className="container-wide team-plans-hero">
          <div className="detail-badge">Bulk Learning</div>
          <h1>Train your entire pharmacy team</h1>
          <p>
            Bulk CPD compliance, SHA readiness, and structured team learning for pharmacies, hospitals, and
            organizations already running RemedacarePOS or RemedacareHMS.
          </p>
          <a href={WHATSAPP_DEMO_LINK} target="_blank" rel="noreferrer" className="btn btn-primary">
            Enquire on WhatsApp
          </a>
        </div>
      </div>

      <div className="container-wide team-plans-layout">
        <section className="team-plans-section">
          <div className="team-plans-section-heading">
            <h2>Pricing tiers</h2>
            <p>Choose the team plan that matches your pharmacy footprint and compliance goals.</p>
          </div>

          <div className="team-plans-grid">
            {pricingTiers.map((tier) => (
              <article
                key={tier.tier || tier.name}
                className={`card team-plan-card${tier.featured ? " featured" : ""}`}
              >
                <div className="team-plan-card-top">
                  <div>
                    <span className="team-plan-name">{tier.name}</span>
                    <h3>{tier.price_kes == null ? "Custom pricing" : `KES ${Number(tier.price_kes).toLocaleString()}/month`}</h3>
                    <p className="team-plan-description">{tier.description}</p>
                  </div>
                  <span className="team-plan-seats">{tier.seats ? `${tier.seats} seats` : "Unlimited seats"}</span>
                </div>

                <div className="team-plan-badges">
                  <span className="team-plan-badge team-plan-badge-integration">RemedacarePOS integration</span>
                </div>

                <ul className="team-plan-feature-list">
                  {tier.features.map((feature) => (
                    <li key={feature}>
                      <CheckCircle2 size={16} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <a href={WHATSAPP_DEMO_LINK} target="_blank" rel="noreferrer" className={`btn ${tier.featured ? "btn-primary" : "btn-outline"}`}>
                  Talk to Julius
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="team-plans-section">
          <div className="team-plans-section-heading">
            <h2>How it works</h2>
            <p>A simple rollout for pharmacy teams that need fast onboarding and visible training outcomes.</p>
          </div>

          <div className="team-steps-grid">
            {HOW_IT_WORKS.map((step, index) => (
              <article key={step.title} className="card team-step-card">
                <div className="team-step-index">0{index + 1}</div>
                <div className="team-step-icon">
                  <step.icon size={22} />
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="team-plans-cta card">
          <div>
            <h2>Need a team rollout plan for your pharmacy or hospital?</h2>
            <p>
              Let’s map the right seat count, integration path, and support setup for your organization.
            </p>
          </div>
          <a href={WHATSAPP_DEMO_LINK} target="_blank" rel="noreferrer" className="btn btn-primary">
            Book WhatsApp demo <ChevronRight size={16} />
          </a>
        </section>
      </div>
    </div>
  )
}
