import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  Award,
  Bell,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Download,
  HeartPulse,
  Home,
  Image,
  Loader2,
  MapPin,
  Menu,
  PackageSearch,
  Pill,
  PhoneCall,
  Plus,
  Search,
  ShieldCheck,
  Smartphone,
  Truck,
  Trash2,
  Video,
  X,
  Zap,
} from "lucide-react"
import PatientInstallPrompt from "../components/PatientInstallPrompt"
import { PatientPortalStyles } from "../components/PatientLayout"
import { pharmacyosClient } from "../lib/pharmacyosClient"
import { buildSupabaseAccessBlockedCopy, isSupabaseAccessBlocked } from "../lib/supabaseAccess"
import "./PatientPortal.css"

export default function PatientPortal() {
  const [activeTab, setActiveTab] = useState("home")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchFocused, setSearchFocused] = useState(false)
  const [submitting, setSubmitting] = useState("")
  const portalBrand = { name: "PharmaCourse patient portal", avatar: "PC" }
  const [pharmacies, setPharmacies] = useState([])
  const [pharmaciesLoading, setPharmaciesLoading] = useState(true)
  const [pharmaciesError, setPharmaciesError] = useState("")
  const [selectedMainPharmacyId, setSelectedMainPharmacyId] = useState("")
  const [countyFilter, setCountyFilter] = useState("all")
  const [subcountyFilter, setSubcountyFilter] = useState("all")
  const [townFilter, setTownFilter] = useState("all")
  const [prescriptionForm, setPrescriptionForm] = useState({
    patientName: "",
    patientPhone: "",
    patientEmail: "",
    conditionNotes: "",
    requestedDrugs: [""],
  })
  const [appointmentForm, setAppointmentForm] = useState({
    patientName: "",
    patientPhone: "",
    patientEmail: "",
    appointmentType: "phone_call",
    slotDatetime: "",
    conditionSummary: "",
    patientNotes: "",
  })
  const [maternalForm, setMaternalForm] = useState({
    patientName: "",
    patientPhone: "",
    lmpDate: "",
    gravida: "",
    parity: "",
    notes: "",
  })
  const [deliveryForm, setDeliveryForm] = useState({
    patientName: "",
    patientPhone: "",
    patientAddress: "",
    items: [{ drug_name: "", qty: "1", price: "" }],
  })

  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "prescription", label: "Prescriptions", icon: Pill },
    { id: "appointment", label: "Appointments", icon: CalendarDays },
    { id: "maternal", label: "Maternal Care", icon: HeartPulse },
    { id: "delivery", label: "Delivery", icon: Truck },
    { id: "updates", label: "Updates", icon: Bell },
  ]

  const quickActions = [
    { id: "prescription", title: "Request Prescription", description: "Send a refill request or upload prescription", icon: Pill, tone: "green" },
    { id: "appointment", title: "Book Appointment", description: "Schedule a call or video consultation", icon: CalendarDays, tone: "blue" },
    { id: "maternal", title: "Maternal Care", description: "ANC registration and follow-up", icon: HeartPulse, tone: "rose" },
    { id: "delivery", title: "Request Delivery", description: "Get medicines delivered to your door", icon: Truck, tone: "amber" },
    { id: "updates", title: "Check Updates", description: "Track your requests and notifications", icon: Bell, tone: "ink" },
  ]

  const previewTiles = [
    { title: "Prescriptions", description: "Refills and uploads", icon: Pill, tone: "green" },
    { title: "Appointments", description: "Calls and visits", icon: CalendarDays, tone: "blue" },
    { title: "Maternal Care", description: "ANC follow-up", icon: HeartPulse, tone: "rose" },
    { title: "Delivery", description: "Doorstep delivery", icon: Truck, tone: "amber" },
    { title: "Updates", description: "Track replies", icon: Bell, tone: "ink" },
    { title: "Install PWA", description: "Add to home screen", icon: Download, tone: "cyan" },
  ]

  const features = [
    { icon: Building2, title: "Branch Routing", description: "Choose your preferred pharmacy branch" },
    { icon: ClipboardList, title: "Prescription Requests", description: "Send refill requests with photos" },
    { icon: CalendarDays, title: "Appointments", description: "Book calls or video consultations" },
    { icon: PackageSearch, title: "Live Tracking", description: "Follow your order in real-time" },
    { icon: HeartPulse, title: "Maternal Care", description: "ANC registration and follow-up" },
    { icon: Truck, title: "Delivery", description: "Get medicines delivered" },
  ]

  const trustBadges = [
    { icon: ShieldCheck, label: "Secure & Private" },
    { icon: Smartphone, label: "Mobile-Friendly" },
    { icon: Award, label: "Branch-Linked" },
    { icon: Zap, label: "Real-Time Updates" },
  ]

  useEffect(() => {
    let ignore = false

    async function loadPharmacies() {
      setPharmaciesLoading(true)
      setPharmaciesError("")

      const { data, error } = await pharmacyosClient
        .from("pharmacies")
        .select("id, name, location, parent_pharmacy_id, county, subcounty, town, area")
        .order("name", { ascending: true })

      if (ignore) {
        return
      }

      if (error) {
        if (isSupabaseAccessBlocked(error)) {
          const rpcResult = await pharmacyosClient.rpc("public_patient_portal_pharmacies")

          if (ignore) {
            return
          }

          if (!rpcResult.error) {
            setPharmacies(Array.isArray(rpcResult.data) ? rpcResult.data : [])
            setPharmaciesLoading(false)
            return
          }

          setPharmacies([])
          setPharmaciesError(
            rpcResult.error?.message ||
              error.message ||
              "Supabase access is blocked for the patient portal directory.",
          )
        } else {
          setPharmacies([])
          setPharmaciesError(error.message || "We could not load the pharmacy list.")
        }
      } else {
        setPharmacies(Array.isArray(data) ? data : [])
      }

      setPharmaciesLoading(false)
    }

    void loadPharmacies()

    return () => {
      ignore = true
    }
  }, [])

  const pharmacyStats = useMemo(() => {
    const branchCountByParent = new Map()

    pharmacies.forEach((row) => {
      const parentId = String(row?.parent_pharmacy_id || "").trim()
      if (!parentId) return
      branchCountByParent.set(parentId, (branchCountByParent.get(parentId) || 0) + 1)
    })

    return branchCountByParent
  }, [pharmacies])

  const directoryOptions = useMemo(() => {
    const uniqueSortedValues = (key) =>
      Array.from(
        new Set(
          pharmacies
            .map((row) => String(row?.[key] || "").trim())
            .filter(Boolean),
        ),
      ).sort((left, right) => left.localeCompare(right))

    return {
      counties: uniqueSortedValues("county"),
      subcounties: uniqueSortedValues("subcounty"),
      towns: uniqueSortedValues("town"),
    }
  }, [pharmacies])

  const filteredPharmacies = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return pharmacies.filter((row) => {
      const fields = [
        row?.name,
        row?.location,
        row?.county,
        row?.subcounty,
        row?.town,
        row?.area,
      ]
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean)

      const matchesQuery = !query || fields.some((value) => value.includes(query))
      const matchesCounty = countyFilter === "all" || String(row?.county || "").trim() === countyFilter
      const matchesSubcounty = subcountyFilter === "all" || String(row?.subcounty || "").trim() === subcountyFilter
      const matchesTown = townFilter === "all" || String(row?.town || "").trim() === townFilter

      return matchesQuery && matchesCounty && matchesSubcounty && matchesTown
    })
  }, [countyFilter, pharmacies, searchQuery, subcountyFilter, townFilter])

  const mainPharmacies = useMemo(
    () => filteredPharmacies.filter((row) => !String(row?.parent_pharmacy_id || "").trim()),
    [filteredPharmacies],
  )

  const branchPharmacies = useMemo(
    () => filteredPharmacies.filter((row) => String(row?.parent_pharmacy_id || "").trim()),
    [filteredPharmacies],
  )

  const selectedMainPharmacy = useMemo(() => {
    if (!mainPharmacies.length) return null
    return (
      mainPharmacies.find((row) => String(row.id) === String(selectedMainPharmacyId)) ||
      mainPharmacies[0] ||
      null
    )
  }, [mainPharmacies, selectedMainPharmacyId])

  const branchCards = useMemo(() => {
    if (!selectedMainPharmacy) return branchPharmacies

    return branchPharmacies.filter((row) => String(row?.parent_pharmacy_id || "") === String(selectedMainPharmacy.id))
  }, [branchPharmacies, selectedMainPharmacy])

  const portalStats = useMemo(
    () => [
      { label: "Main pharmacies", value: String(mainPharmacies.length), icon: Building2, color: "#0f6e56", bg: "#e5f4ee" },
      { label: "Branches shown", value: String(branchCards.length), icon: PackageSearch, color: "#1a6bb5", bg: "#e8f1fb" },
      { label: "Matching locations", value: String(filteredPharmacies.length), icon: ClipboardList, color: "#c76a00", bg: "#fff0d9" },
      { label: "Services", value: String(quickActions.length), icon: Smartphone, color: "#7c3aed", bg: "#f3eefe" },
    ],
    [branchCards.length, filteredPharmacies.length, mainPharmacies.length, quickActions.length],
  )

  const searchSuggestions = useMemo(() => {
    const pharmacySuggestions = pharmacies
      .slice(0, 3)
      .map((row) => String(row?.name || "").trim())
      .filter(Boolean)

    return [...pharmacySuggestions, "Prescription requests", "Delivery tracking", "Book appointments"].slice(0, 6)
  }, [pharmacies])

  const pharmaciesAccessBlocked = useMemo(() => isSupabaseAccessBlocked(pharmaciesError), [pharmaciesError])
  const pharmaciesBlockedCopy = useMemo(
    () =>
      pharmaciesAccessBlocked
        ? buildSupabaseAccessBlockedCopy({
            sourceLabel: "The patient portal",
            objectLabel: "pharmacies",
            error: { message: pharmaciesError },
          })
        : null,
    [pharmaciesAccessBlocked, pharmaciesError],
  )

  function buildPatientPath(pathname, pharmacyId) {
    if (!pharmacyId) {
      return pathname
    }

    return `${pathname}?pharmacy=${encodeURIComponent(pharmacyId)}`
  }

  function buildPatientLoginPath(pharmacyId) {
    if (!pharmacyId) {
      return "/patient/login"
    }

    return `/patient/login?pharmacy=${encodeURIComponent(pharmacyId)}`
  }

  function handleQuickAction(actionId) {
    setActiveTab(actionId)
    setIsMobileMenuOpen(false)
  }

  function renderHomeScreen() {
    return (
      <div className="portal-home">
        <PatientInstallPrompt />

        <section className="portal-hero">
          <div className="portal-hero-copy">
            <span className="portal-kicker">Patient self-service</span>
            <h1>Choose your branch and continue like a native app</h1>
            <p>
              Choose a branch, place requests, and track updates from one polished portal built for mobile-first use.
              Install it on your home screen and keep your brand colors intact.
            </p>

            <div className="portal-hero-actions">
              <button type="button" className="portal-btn primary" onClick={() => setActiveTab("prescription")}>
                Start a request
              </button>
              <button type="button" className="portal-btn secondary" onClick={() => setActiveTab("updates")}>
                Check updates
              </button>
              <Link to={buildPatientLoginPath(selectedMainPharmacy?.id || mainPharmacies[0]?.id || "")} className="portal-btn ghost">
                Sign in
              </Link>
              <button type="button" className="portal-btn ghost" onClick={() => setIsMobileMenuOpen(true)}>
                Open menu
              </button>
            </div>

            <div className="portal-trust-row">
              {trustBadges.map((badge) => (
                <span key={badge.label} className="portal-trust-pill">
                  <badge.icon size={14} />
                  {badge.label}
                </span>
              ))}
            </div>

            <div className="portal-stats-grid">
              {portalStats.map((stat) => (
                <div key={stat.label} className="portal-stat-card">
                  <div className="portal-stat-icon" style={{ background: stat.bg, color: stat.color }}>
                    <stat.icon size={18} />
                  </div>
                  <div className="portal-stat-info">
                    <span className="portal-stat-value">{stat.value}</span>
                    <span className="portal-stat-label">{stat.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="portal-hero-preview">
            <div className="portal-preview-shell">
              <div className="portal-preview-top">
                <div>
                  <span className="portal-preview-label">Branch portal</span>
                  <strong>{portalBrand.name}</strong>
                  <p>Search, book, request, and track from one place.</p>
                </div>
                <span className="portal-preview-avatar">{portalBrand.avatar}</span>
              </div>

              <div className="portal-preview-search">
                <Search size={14} />
                <span>Search medicines, appointments, or pharmacy...</span>
              </div>

              <div className="portal-preview-banner">
                <div>
                  <span className="portal-preview-banner-kicker">Real PWA</span>
                  <strong>Install from the browser, not from a screenshot</strong>
                  <p>
                    This portal uses the browser install prompt on supported phones. On iPhone, use Safari and choose
                    Add to Home Screen.
                  </p>
                </div>
                <Smartphone size={18} />
              </div>

              <div className="portal-preview-grid">
                {previewTiles.map((tile) => (
                  <button key={tile.title} type="button" className={`portal-preview-tile tone-${tile.tone}`}>
                    <span className="portal-preview-tile-icon">
                      <tile.icon size={16} />
                    </span>
                    <strong>{tile.title}</strong>
                    <p>{tile.description}</p>
                  </button>
                ))}
              </div>

              <div className="portal-preview-footer">
                <span>
                  <ShieldCheck size={14} />
                  Secure branch access
                </span>
                <span>
                  <MapPin size={14} />
                  Pharmacy-linked
                </span>
              </div>

              <div className="portal-preview-bottom-nav" aria-label="Portal preview navigation">
                {[Home, Pill, CalendarDays, Truck].map((Icon, index) => (
                  <span key={index} className={`portal-preview-bottom-item${index === 0 ? " active" : ""}`}>
                    <Icon size={14} />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="portal-section portal-directory-section">
          <div className="portal-section-header">
            <h2 className="portal-section-title">Choose a pharmacy first</h2>
            <span className="portal-section-badge">
              {pharmaciesLoading
                ? "Loading pharmacies..."
                : pharmaciesAccessBlocked
                  ? "Supabase access blocked"
                  : `${filteredPharmacies.length} matching locations`}
            </span>
          </div>

          <div className="portal-directory-grid">
            <aside className="portal-directory-sidebar">
              <div className="portal-directory-card">
                <h3>Search by pharmacy, county, town, or area</h3>
                <p>Use the filters to narrow the list, then jump into the exact branch you want.</p>

                <div className="portal-directory-form">
                  <label className="portal-directory-field">
                    <span>Search</span>
                    <input
                      className="portal-input portal-directory-input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search pharmacy, branch, county, or area"
                    />
                  </label>

                  <label className="portal-directory-field">
                    <span>All counties</span>
                    <select className="portal-input portal-directory-select" value={countyFilter} onChange={(e) => setCountyFilter(e.target.value)}>
                      <option value="all">All counties</option>
                      {directoryOptions.counties.map((county) => (
                        <option key={county} value={county}>
                          {county}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="portal-directory-field">
                    <span>All subcounties</span>
                    <select className="portal-input portal-directory-select" value={subcountyFilter} onChange={(e) => setSubcountyFilter(e.target.value)}>
                      <option value="all">All subcounties</option>
                      {directoryOptions.subcounties.map((subcounty) => (
                        <option key={subcounty} value={subcounty}>
                          {subcounty}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="portal-directory-field">
                    <span>All towns / areas</span>
                    <select className="portal-input portal-directory-select" value={townFilter} onChange={(e) => setTownFilter(e.target.value)}>
                      <option value="all">All towns / areas</option>
                      {directoryOptions.towns.map((town) => (
                        <option key={town} value={town}>
                          {town}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="portal-directory-share">
                  <span>Share this one link with patients:</span>
                  <strong>pharmacourse.co.ke/patient</strong>
                </div>
              </div>

              <div className="portal-directory-emergency">
                <h3>Emergency note</h3>
                <p>
                  For chest pain, severe bleeding, difficulty breathing, stroke symptoms, or collapse, go to the nearest
                  hospital or call emergency services immediately.
                </p>
              </div>
            </aside>

            <div className="portal-directory-main">
              <div className="portal-directory-panel">
                <div className="portal-directory-panel-copy">
                  <h3>Select Your Pharmacy or Branch</h3>
                  <p>Patients should first choose the main pharmacy, then pick the exact branch nearest to them.</p>
                </div>

                <div className="portal-directory-lookup">
                  <div>
                    <strong>Already Submitted a Request?</strong>
                    <p>Your signed-in patient account can find updates even if you forgot the branch you selected earlier.</p>
                  </div>
                  <div className="portal-directory-lookup-card">
                    <span>Signed in as portal visitor.</span>
                    <Link to={buildPatientLoginPath(selectedMainPharmacy?.id || mainPharmacies[0]?.id || "")} className="portal-directory-button">
                      Find My Updates
                    </Link>
                  </div>
                </div>

                {pharmaciesAccessBlocked && pharmaciesBlockedCopy ? (
                  <div className="portal-directory-error portal-directory-error-blocked">
                    <strong>{pharmaciesBlockedCopy.title}</strong>
                    <p>{pharmaciesBlockedCopy.summary}</p>
                    <p>{pharmaciesBlockedCopy.hint}</p>
                    {pharmaciesBlockedCopy.detail ? <p className="portal-directory-error-detail">{pharmaciesBlockedCopy.detail}</p> : null}
                  </div>
                ) : pharmaciesError ? (
                  <div className="portal-directory-error">{pharmaciesError}</div>
                ) : null}

                <div className="portal-directory-summary">
                  {pharmaciesAccessBlocked
                    ? "POS pharmacy access is blocked until the Supabase policy or RPC is opened up."
                    : `Showing ${filteredPharmacies.length} matching locations`}
                </div>

                <div className="portal-directory-stage">
                  <div className="portal-directory-stage-header">
                    <h4>1. Choose Main Pharmacy</h4>
                    <span>{pharmaciesAccessBlocked ? "?" : mainPharmacies.length}</span>
                  </div>

                  {pharmaciesAccessBlocked ? (
                    <div className="portal-directory-empty portal-directory-empty-blocked">
                      We could not list pharmacies from the POS project because Supabase is blocking access. Open the
                      policy or RPC noted below, then refresh this page.
                    </div>
                  ) : mainPharmacies.length ? (
                    <div className="portal-directory-card-grid">
                      {mainPharmacies.map((pharmacy) => {
                        const location = pharmacy?.location || pharmacy?.town || pharmacy?.subcounty || pharmacy?.county || "Kenya"
                        const branchCount = pharmacyStats.get(String(pharmacy.id)) || 0

                        return (
                          <article key={pharmacy.id} className="portal-directory-pharmacy-card">
                            <div className="portal-directory-card-top">
                              <span className="portal-directory-chip">MAIN</span>
                              <span>{branchCount} branches</span>
                            </div>
                            <h5>{pharmacy.name}</h5>
                            <p>{location}</p>
                            <div className="portal-directory-tags">
                              {pharmacy.county ? <span>{pharmacy.county}</span> : null}
                              {pharmacy.subcounty ? <span>{pharmacy.subcounty}</span> : null}
                              {pharmacy.town ? <span>{pharmacy.town}</span> : null}
                            </div>
                            <div className="portal-directory-actions">
                              <Link to={buildPatientLoginPath(pharmacy.id)} className="portal-directory-button primary">
                                Use main pharmacy
                              </Link>
                              <button
                                type="button"
                                className="portal-directory-button secondary"
                                onClick={() => setSelectedMainPharmacyId(String(pharmacy.id))}
                              >
                                Browse branches
                              </button>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="portal-directory-empty">
                      No main pharmacies matched your filters yet. Try widening the search.
                    </div>
                  )}

                  <div className="portal-directory-stage-header secondary">
                    <div>
                      <h4>2. Choose Branch</h4>
                      <p>Pick a main pharmacy above to narrow branches faster.</p>
                    </div>
                    <span>{pharmaciesAccessBlocked ? "?" : branchCards.length}</span>
                  </div>

                  <div className="portal-directory-subtitle">Other branches in this pharmacy</div>

                  {pharmaciesAccessBlocked ? (
                    <div className="portal-directory-empty portal-directory-empty-blocked">
                      The branch list is hidden until the POS project allows public reads for the patient portal.
                    </div>
                  ) : pharmaciesLoading ? (
                    <div className="portal-directory-empty">Loading pharmacies from the POS database...</div>
                  ) : branchCards.length ? (
                    <div className="portal-directory-branch-grid">
                      {branchCards.map((branch) => {
                        const location = branch?.location || branch?.town || branch?.subcounty || branch?.county || "Kenya"

                        return (
                          <article key={branch.id} className="portal-directory-branch-card">
                            <span className="portal-directory-chip branch">BRANCH</span>
                            <h5>{branch.name}</h5>
                            <p>{location}</p>
                            <div className="portal-directory-tags">
                              {branch.county ? <span>{branch.county}</span> : null}
                              {branch.subcounty ? <span>{branch.subcounty}</span> : null}
                              {branch.town ? <span>{branch.town}</span> : null}
                            </div>
                            <Link to={buildPatientLoginPath(branch.id)} className="portal-directory-link">
                              Choose this branch
                            </Link>
                          </article>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="portal-directory-empty">
                      Pick a main pharmacy above or clear your filters to see the branch cards.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="portal-section">
          <div className="portal-section-header">
            <h2 className="portal-section-title">Quick Actions</h2>
            <span className="portal-section-badge">5 services</span>
          </div>
          <div className="portal-quick-grid">
            {quickActions.map((action) => (
              <button key={action.id} className={`portal-quick-card tone-${action.tone}`} onClick={() => handleQuickAction(action.id)}>
                <div className="portal-quick-icon">
                  <action.icon size={22} />
                </div>
                <div className="portal-quick-content">
                  <h3 className="portal-quick-title">{action.title}</h3>
                  <p className="portal-quick-desc">{action.description}</p>
                </div>
                <ChevronRight size={16} className="portal-quick-arrow" />
              </button>
            ))}
          </div>
        </section>

        <section className="portal-section">
          <div className="portal-section-header">
            <h2 className="portal-section-title">Recent Activity</h2>
            <button className="portal-link-btn">View All</button>
          </div>
          <div className="portal-activity-list">
            <div className="portal-empty-state portal-empty-state-portal">
              <Bell size={40} className="portal-empty-icon" />
              <h3 className="portal-empty-title">No demo activity loaded</h3>
              <p className="portal-empty-desc">
                This page does not invent patient records. Real prescriptions, appointments, and delivery updates appear after sign-in.
              </p>
            </div>
          </div>
        </section>

        <section className="portal-section">
          <div className="portal-section-header">
            <h2 className="portal-section-title">Everything You Need</h2>
            <span className="portal-section-badge">All in one place</span>
          </div>
          <div className="portal-features-grid">
            {features.map((feature) => (
              <div key={feature.title} className="portal-feature-card">
                <div className="portal-feature-icon">
                  <feature.icon size={20} />
                </div>
                <h4 className="portal-feature-title">{feature.title}</h4>
                <p className="portal-feature-desc">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="portal-trust-section">
          {trustBadges.map((badge) => (
            <div key={badge.label} className="portal-trust-badge">
              <badge.icon size={16} className="portal-trust-icon" />
              <span>{badge.label}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderPrescriptionForm() {
    return (
      <div className="portal-form-page">
        <div className="portal-form-header">
          <h2 className="portal-form-title">Request a Prescription</h2>
          <p className="portal-form-sub">Tell us what you need and we'll prepare it for you</p>
        </div>
        <form className="portal-form" onSubmit={(e) => e.preventDefault()}>
          <div className="portal-form-group">
            <label className="portal-label">Full Name</label>
            <input className="portal-input" value={prescriptionForm.patientName}
              onChange={(e) => setPrescriptionForm({ ...prescriptionForm, patientName: e.target.value })}
              placeholder="Enter your full name" />
          </div>
          <div className="portal-form-row">
            <div className="portal-form-group">
              <label className="portal-label">Phone Number</label>
              <input className="portal-input" value={prescriptionForm.patientPhone}
                onChange={(e) => setPrescriptionForm({ ...prescriptionForm, patientPhone: e.target.value })}
                placeholder="07XXXXXXXX" />
            </div>
            <div className="portal-form-group">
              <label className="portal-label">Email (optional)</label>
              <input className="portal-input" type="email" value={prescriptionForm.patientEmail}
                onChange={(e) => setPrescriptionForm({ ...prescriptionForm, patientEmail: e.target.value })}
                placeholder="you@example.com" />
            </div>
          </div>
          <div className="portal-form-group">
            <label className="portal-label">What are you suffering from?</label>
            <textarea className="portal-textarea" rows={4} value={prescriptionForm.conditionNotes}
              onChange={(e) => setPrescriptionForm({ ...prescriptionForm, conditionNotes: e.target.value })}
              placeholder="Describe your symptoms or condition briefly..." />
          </div>
          <div className="portal-form-group">
            <div className="portal-form-label-row">
              <label className="portal-label">Medicines Needed</label>
              <button type="button" className="portal-add-btn"
                onClick={() => setPrescriptionForm({ ...prescriptionForm, requestedDrugs: [...prescriptionForm.requestedDrugs, ""] })}>
                <Plus size={14} /> Add Drug
              </button>
            </div>
            <div className="portal-drug-list">
              {prescriptionForm.requestedDrugs.map((drug, index) => (
                <div key={index} className="portal-drug-item">
                  <input className="portal-input" value={drug}
                    onChange={(e) => {
                      const newDrugs = [...prescriptionForm.requestedDrugs]
                      newDrugs[index] = e.target.value
                      setPrescriptionForm({ ...prescriptionForm, requestedDrugs: newDrugs })
                    }}
                    placeholder={`Medicine ${index + 1}`} />
                  {prescriptionForm.requestedDrugs.length > 1 && (
                    <button type="button" className="portal-remove-btn"
                      onClick={() => setPrescriptionForm({ ...prescriptionForm, requestedDrugs: prescriptionForm.requestedDrugs.filter((_, i) => i !== index) })}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="portal-form-group">
            <label className="portal-label">Upload Prescription (optional)</label>
            <div className="portal-upload-zone">
              <Image size={28} className="portal-upload-icon" />
              <p className="portal-upload-text">Click to upload or drag and drop</p>
              <p className="portal-upload-sub">JPG, PNG, or PDF (max 10MB)</p>
            </div>
          </div>
          <button type="submit" className="portal-submit-btn" disabled={submitting === "prescription"}>
            {submitting === "prescription" ? (<><Loader2 size={18} className="portal-spinner" /> Submitting...</>) : "Submit Prescription Request"}
          </button>
        </form>
      </div>
    )
  }

  function renderAppointmentForm() {
    const appointmentTypes = [
      { value: "phone_call", label: "Phone Call", icon: PhoneCall },
      { value: "video_consultation", label: "Video Consultation", icon: Video },
      { value: "pickup", label: "In-Person Pickup", icon: Building2 },
    ]

    return (
      <div className="portal-form-page">
        <div className="portal-form-header">
          <h2 className="portal-form-title">Book an Appointment</h2>
          <p className="portal-form-sub">Choose how you'd like to connect with the pharmacist</p>
        </div>
        <form className="portal-form" onSubmit={(e) => e.preventDefault()}>
          <div className="portal-form-group">
            <label className="portal-label">Full Name</label>
            <input className="portal-input" value={appointmentForm.patientName}
              onChange={(e) => setAppointmentForm({ ...appointmentForm, patientName: e.target.value })}
              placeholder="Enter your full name" />
          </div>
          <div className="portal-form-row">
            <div className="portal-form-group">
              <label className="portal-label">Phone Number</label>
              <input className="portal-input" value={appointmentForm.patientPhone}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, patientPhone: e.target.value })}
                placeholder="07XXXXXXXX" />
            </div>
            <div className="portal-form-group">
              <label className="portal-label">Email (optional)</label>
              <input className="portal-input" type="email" value={appointmentForm.patientEmail}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, patientEmail: e.target.value })}
                placeholder="you@example.com" />
            </div>
          </div>
          <div className="portal-form-group">
            <label className="portal-label">Appointment Type</label>
            <div className="portal-radio-grid">
              {appointmentTypes.map((type) => (
                <label key={type.value} className={`portal-radio-card ${appointmentForm.appointmentType === type.value ? "selected" : ""}`}>
                  <input type="radio" name="appointmentType" value={type.value}
                    checked={appointmentForm.appointmentType === type.value}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, appointmentType: e.target.value })} />
                  <div className="portal-radio-content">
                    <div className="portal-radio-icon"><type.icon size={20} /></div>
                    <span className="portal-radio-label">{type.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="portal-form-group">
            <label className="portal-label">Preferred Date & Time</label>
            <input className="portal-input" type="datetime-local" value={appointmentForm.slotDatetime}
              onChange={(e) => setAppointmentForm({ ...appointmentForm, slotDatetime: e.target.value })} />
          </div>
          <div className="portal-form-group">
            <label className="portal-label">What would you like to discuss?</label>
            <textarea className="portal-textarea" rows={4} value={appointmentForm.conditionSummary}
              onChange={(e) => setAppointmentForm({ ...appointmentForm, conditionSummary: e.target.value })}
              placeholder="Describe what you'd like to discuss with the pharmacist..." />
          </div>
          <button type="submit" className="portal-submit-btn">Book Appointment</button>
        </form>
      </div>
    )
  }

  function renderMaternalForm() {
    return (
      <div className="portal-form-page">
        <div className="portal-form-header">
          <h2 className="portal-form-title">Maternal Care Registration</h2>
          <p className="portal-form-sub">Register for ANC and pregnancy follow-up</p>
        </div>
        <form className="portal-form" onSubmit={(e) => e.preventDefault()}>
          <div className="portal-form-row">
            <div className="portal-form-group">
              <label className="portal-label">Full Name</label>
              <input className="portal-input" placeholder="Mother's full name" value={maternalForm.patientName}
                onChange={(e) => setMaternalForm({ ...maternalForm, patientName: e.target.value })} />
            </div>
            <div className="portal-form-group">
              <label className="portal-label">Phone Number</label>
              <input className="portal-input" placeholder="07XXXXXXXX" value={maternalForm.patientPhone}
                onChange={(e) => setMaternalForm({ ...maternalForm, patientPhone: e.target.value })} />
            </div>
          </div>
          <div className="portal-form-row">
            <div className="portal-form-group">
              <label className="portal-label">Last Menstrual Period (LMP)</label>
              <input className="portal-input" type="date" value={maternalForm.lmpDate}
                onChange={(e) => setMaternalForm({ ...maternalForm, lmpDate: e.target.value })} />
            </div>
            <div className="portal-form-group">
              <label className="portal-label">Gravida / Parity</label>
              <input className="portal-input" placeholder="e.g. G2 P1" value={maternalForm.gravida}
                onChange={(e) => setMaternalForm({ ...maternalForm, gravida: e.target.value })} />
            </div>
          </div>
          <div className="portal-form-group">
            <label className="portal-label">Current Concerns or Notes</label>
            <textarea className="portal-textarea" rows={4} placeholder="Share any pregnancy concerns or follow-up needs..." value={maternalForm.notes}
              onChange={(e) => setMaternalForm({ ...maternalForm, notes: e.target.value })} />
          </div>
          <button type="submit" className="portal-submit-btn">Send Maternal Care Request</button>
        </form>
      </div>
    )
  }

  function renderDeliveryForm() {
    return (
      <div className="portal-form-page">
        <div className="portal-form-header">
          <h2 className="portal-form-title">Request Delivery</h2>
          <p className="portal-form-sub">Get your medicines delivered to your door</p>
        </div>
        <form className="portal-form" onSubmit={(e) => e.preventDefault()}>
          <div className="portal-form-row">
            <div className="portal-form-group">
              <label className="portal-label">Full Name</label>
              <input className="portal-input" value={deliveryForm.patientName}
                onChange={(e) => setDeliveryForm({ ...deliveryForm, patientName: e.target.value })}
                placeholder="Your full name" />
            </div>
            <div className="portal-form-group">
              <label className="portal-label">Phone Number</label>
              <input className="portal-input" value={deliveryForm.patientPhone}
                onChange={(e) => setDeliveryForm({ ...deliveryForm, patientPhone: e.target.value })}
                placeholder="07XXXXXXXX" />
            </div>
          </div>
          <div className="portal-form-group">
            <label className="portal-label">Delivery Address</label>
            <textarea className="portal-textarea" rows={3} value={deliveryForm.patientAddress}
              onChange={(e) => setDeliveryForm({ ...deliveryForm, patientAddress: e.target.value })}
              placeholder="Estate, building, floor, landmark, and any rider notes..." />
          </div>
          <div className="portal-form-group">
            <div className="portal-form-label-row">
              <label className="portal-label">Items Needed</label>
              <button type="button" className="portal-add-btn"
                onClick={() => setDeliveryForm({ ...deliveryForm, items: [...deliveryForm.items, { drug_name: "", qty: "1", price: "" }] })}>
                <Plus size={14} /> Add Item
              </button>
            </div>
            <div className="portal-drug-list">
              {deliveryForm.items.map((item, index) => (
                <div key={index} className="portal-drug-item">
                  <input className="portal-input" value={item.drug_name}
                    onChange={(e) => {
                      const newItems = [...deliveryForm.items]
                      newItems[index].drug_name = e.target.value
                      setDeliveryForm({ ...deliveryForm, items: newItems })
                    }}
                    placeholder="Drug name" />
                  <input className="portal-input portal-delivery-qty" type="number" min="1" value={item.qty}
                    onChange={(e) => {
                      const newItems = [...deliveryForm.items]
                      newItems[index].qty = e.target.value
                      setDeliveryForm({ ...deliveryForm, items: newItems })
                    }}
                    placeholder="Qty" />
                  {deliveryForm.items.length > 1 && (
                    <button type="button" className="portal-remove-btn"
                      onClick={() => setDeliveryForm({ ...deliveryForm, items: deliveryForm.items.filter((_, i) => i !== index) })}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <button type="submit" className="portal-submit-btn">Send Delivery Request</button>
        </form>
      </div>
    )
  }

  function renderUpdatesScreen() {
    return (
      <div className="portal-form-page">
        <div className="portal-form-header">
          <h2 className="portal-form-title">Your Updates</h2>
          <p className="portal-form-sub">Track all your requests and notifications</p>
        </div>
        <div className="portal-empty-state">
          <Bell size={48} className="portal-empty-icon" />
          <h3 className="portal-empty-title">No updates yet</h3>
          <p className="portal-empty-desc">Your requests and notifications will appear here</p>
        </div>
      </div>
    )
  }

  function renderContent() {
    switch (activeTab) {
      case "home":
        return renderHomeScreen()
      case "prescription":
        return renderPrescriptionForm()
      case "appointment":
        return renderAppointmentForm()
      case "maternal":
        return renderMaternalForm()
      case "delivery":
        return renderDeliveryForm()
      case "updates":
        return renderUpdatesScreen()
      default:
        return renderHomeScreen()
    }
  }

  return (
    <div className="portal-container">
      <PatientPortalStyles />

      <header className="portal-header">
        <div className="portal-header-inner">
          <div className="portal-brand">
            <button className="portal-menu-toggle" onClick={() => setIsMobileMenuOpen((open) => !open)} type="button" aria-label="Toggle navigation">
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div className="portal-logo">
              <span className="portal-logo-icon"><Pill size={16} /></span>
              <span>Pharma<span className="portal-logo-highlight">Course</span></span>
            </div>
          </div>

          <nav className={`portal-nav ${isMobileMenuOpen ? "open" : ""}`}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`portal-nav-item ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => {
                  setActiveTab(tab.id)
                  setIsMobileMenuOpen(false)
                }}
                type="button"
              >
                <tab.icon size={18} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="portal-header-actions">
            <Link className="portal-login-link" to="/patient/login">
              Sign in
            </Link>
            <button className="portal-notification-btn" type="button" aria-label="Notifications">
              <Bell size={20} />
            </button>
            <span className="portal-avatar-sm">{portalBrand.avatar}</span>
          </div>
        </div>

        <div className="portal-search-bar">
          <div className="portal-search-wrapper">
            <Search size={18} className="portal-search-icon" />
            <input
              className="portal-search-input"
              placeholder="Search for medicines, appointments, or pharmacy..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {searchFocused ? (
              <div className="portal-search-suggestions">
                {searchSuggestions.map((item) => (
                  <div key={item} className="portal-search-suggestion">
                    {item}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="portal-main">
        <div className="portal-content">{renderContent()}</div>
      </main>

      <nav className="portal-bottom-nav" aria-label="Mobile portal navigation">
        {tabs.slice(0, 4).map((tab) => (
          <button
            key={tab.id}
            className={`portal-bottom-nav-item ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            <tab.icon size={20} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      
    </div>
  )
}

