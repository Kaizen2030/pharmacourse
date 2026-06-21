import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  Award,
  Bell,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  HeartPulse,
  Home,
  Image,
  Loader2,
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
import { PatientPortalStyles } from "../components/PatientLayout"
import { usePatientPortalAuth } from "../hooks/usePatientPortalAuth"
import { fetchPatientPortalPharmacies } from "../lib/patientPortalDirectory"
import { clearPatientPortalProfileDraft, getPatientPortalProfileDraft } from "../lib/patientPortalSession"
import { buildSupabaseAccessBlockedCopy, isSupabaseAccessBlocked } from "../lib/supabaseAccess"
import "./PatientPortal.css"

export default function PatientPortal() {
  const { isAuthenticated, loading: authLoading, signOut } = usePatientPortalAuth()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState("home")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchFocused, setSearchFocused] = useState(false)
  const [submitting, setSubmitting] = useState("")
  const portalBrand = { avatar: "RC" }
  const [authPrompt, setAuthPrompt] = useState({
    open: false,
    actionId: "prescription",
    title: "",
    description: "",
    ctaLabel: "",
    branch: null,
  })
  const [pharmacies, setPharmacies] = useState([])
  const [pharmaciesLoading, setPharmaciesLoading] = useState(true)
  const [pharmaciesError, setPharmaciesError] = useState("")
  const [selectedMainPharmacyId, setSelectedMainPharmacyId] = useState("")
  const [countyFilter, setCountyFilter] = useState("all")
  const [subcountyFilter, setSubcountyFilter] = useState("all")
  const [townFilter, setTownFilter] = useState("all")
  const [profileDraft, setProfileDraft] = useState(() => getPatientPortalProfileDraft())
  const isSwitchFlow = searchParams.get("switch") === "1" || Boolean(profileDraft)
  const [savedBranches, setSavedBranches] = useState([])
  const [isCompactDirectory, setIsCompactDirectory] = useState(() => {
    if (typeof window === "undefined") return false
    return Boolean(window.matchMedia?.("(max-width: 520px)")?.matches)
  })
  const [branchPage, setBranchPage] = useState(0)
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

      const { data, error } = await fetchPatientPortalPharmacies()

      if (ignore) {
        return
      }

      setPharmacies(Array.isArray(data) ? data : [])
      setPharmaciesError(error?.message || "")

      setPharmaciesLoading(false)
    }

    void loadPharmacies()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return undefined
    }

    const mediaQuery = window.matchMedia("(max-width: 520px)")

    function handleChange(event) {
      setIsCompactDirectory(Boolean(event.matches))
    }

    setIsCompactDirectory(Boolean(mediaQuery.matches))

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }

    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : previousOverflow || ""

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMobileMenuOpen])

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

  const branchPageSize = isCompactDirectory ? 4 : Math.max(1, branchCards.length || 1)
  const branchPageCount = Math.max(1, Math.ceil(branchCards.length / branchPageSize))
  const visibleBranchCards = useMemo(() => {
    if (!isCompactDirectory) {
      return branchCards
    }

    const startIndex = branchPage * branchPageSize
    return branchCards.slice(startIndex, startIndex + branchPageSize)
  }, [branchCards, branchPage, branchPageSize, isCompactDirectory])

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
  const draftSummary = useMemo(() => {
    if (!profileDraft) return ""

    const parts = [profileDraft.fullName, profileDraft.phone, profileDraft.email].filter(Boolean)
    return parts.join(" · ")
  }, [profileDraft])

  function buildPatientPath(pathname, pharmacy, extraParams = {}) {
    const params = new URLSearchParams()
    const branch = pharmacy || null

    if (branch?.id) {
      params.set("pharmacy", String(branch.id))
    }

    const exactBranchName = String(branch?.name || "").trim()
    if (exactBranchName) {
      params.set("branch_name", exactBranchName)
    }

    const exactBranchLocation = String(branch?.location || branch?.town || branch?.subcounty || branch?.county || "").trim()
    if (exactBranchLocation) {
      params.set("branch_location", exactBranchLocation)
    }

    Object.entries(extraParams || {}).forEach(([key, value]) => {
      const normalizedValue = String(value || "").trim()
      if (normalizedValue) {
        params.set(key, normalizedValue)
      }
    })

    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  function buildPatientLoginPath(pharmacy, redirectPath = "") {
    const loginPath = buildPatientPath("/patient/login", pharmacy)
    if (!redirectPath) {
      return loginPath
    }

    return `${loginPath}${loginPath.includes("?") ? "&" : "?"}redirect=${encodeURIComponent(redirectPath)}`
  }

  function getActionRedirectPath(actionId, pharmacy) {
    const targetPathByAction = {
      prescription: "/patient/prescription",
      appointment: "/patient/appointment",
      maternal: "/patient/register",
      delivery: "/patient/track",
      updates: "/patient/track",
    }

    return buildPatientPath(targetPathByAction[actionId] || "/patient", pharmacy)
  }

  function getNavigationBranch() {
    return selectedMainPharmacy || mainPharmacies[0] || branchCards[0] || null
  }

  function getAuthPromptCopy(actionId) {
    switch (actionId) {
      case "appointment":
        return {
          title: "Sign in to book an appointment",
          description: "We will link the booking to your patient profile and the branch you chose.",
          ctaLabel: "Sign in to book",
        }
      case "maternal":
        return {
          title: "Sign in for maternal care",
          description: "ANC and pregnancy follow-up need a signed-in patient profile and branch.",
          ctaLabel: "Sign in to continue",
        }
      case "delivery":
        return {
          title: "Sign in to request delivery",
          description: "Delivery requests must be attached to a real patient account and branch.",
          ctaLabel: "Sign in to request delivery",
        }
      case "updates":
        return {
          title: "Sign in to view updates",
          description: "Tracking, notifications, and receipts belong to the signed-in patient account.",
          ctaLabel: "Sign in to view updates",
        }
      case "prescription":
      default:
        return {
          title: "Sign in to request medicine",
          description: "Prescription requests need your patient profile and pharmacy branch attached.",
          ctaLabel: "Sign in to request medicine",
        }
    }
  }

  function openSignInPrompt(actionId) {
    const branch = getNavigationBranch()
    const promptCopy = getAuthPromptCopy(actionId)

    setAuthPrompt({
      open: true,
      actionId,
      title: promptCopy.title,
      description: promptCopy.description,
      ctaLabel: promptCopy.ctaLabel,
      branch: branch
        ? {
            id: branch.id,
            name: branch.name,
            location: branch.location || branch.town || branch.subcounty || branch.county || "",
          }
        : null,
    })
  }

  function closeAuthPrompt() {
    setAuthPrompt((current) => ({ ...current, open: false }))
  }

  function handleProtectedAction(actionId) {
    if (!isAuthenticated && !authLoading) {
      openSignInPrompt(actionId)
      return
    }

    setActiveTab(actionId)
    setIsMobileMenuOpen(false)
  }

  function loadSavedBranchSessions() {
    if (typeof window === "undefined") {
      setSavedBranches([])
      return
    }

    const entries = []
    const branchById = new Map(pharmacies.map((row) => [String(row?.id || "").trim(), row]))

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key || !key.startsWith("patientPortalSession:")) {
        continue
      }

      const pharmacyId = key.slice("patientPortalSession:".length).trim()
      if (!pharmacyId) {
        continue
      }

      try {
        const raw = window.localStorage.getItem(key)
        if (!raw) {
          continue
        }

        const session = JSON.parse(raw)
        const branch = branchById.get(pharmacyId)

        entries.push({
          pharmacyId,
          name: branch?.name || `Saved branch ${pharmacyId}`,
          location: branch?.location || branch?.town || branch?.subcounty || branch?.county || "",
          session,
        })
      } catch {
        // Ignore malformed saved sessions and keep the portal usable.
      }
    }

    entries.sort((left, right) => String(right.session?.updatedAt || "").localeCompare(String(left.session?.updatedAt || "")))
    setSavedBranches(entries)
  }

  useEffect(() => {
    setBranchPage(0)
  }, [countyFilter, isCompactDirectory, searchQuery, selectedMainPharmacyId, subcountyFilter, townFilter])

  useEffect(() => {
    loadSavedBranchSessions()

    if (typeof window === "undefined") {
      return undefined
    }

    const handleStorage = () => loadSavedBranchSessions()
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [pharmacies])

  async function handleClearSavedDraft() {
    clearPatientPortalProfileDraft()
    setProfileDraft(null)

    if (isAuthenticated) {
      try {
        await signOut()
      } catch {
        // If the account sign-out fails, still let the patient continue from a clean branch selector.
      }
    }
  }

  function renderSignInGate({ actionId, title, description, ctaLabel }) {
    const branch = getNavigationBranch()
    const redirectPath = getActionRedirectPath(actionId, branch)
    const loginPath = buildPatientLoginPath(branch, redirectPath)

    return (
      <div className="portal-form-page">
        <div className="portal-form-header">
          <h2 className="portal-form-title">{title}</h2>
          <p className="portal-form-sub">{description}</p>
        </div>
        <div className="portal-empty-state">
          <ShieldCheck size={48} className="portal-empty-icon" />
          <h3 className="portal-empty-title">Sign in required</h3>
          <p className="portal-empty-desc">
            {branch
              ? `We will keep ${branch.name} attached after login so your request reaches the exact branch you chose.`
              : "Choose a pharmacy from the directory first so your request stays branch-linked after login."}
          </p>
          <div className="portal-inline-actions" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <Link to={loginPath} className="portal-directory-button primary">
              {ctaLabel}
            </Link>
            <button type="button" className="portal-directory-button secondary" onClick={() => setActiveTab("home")}>
              Back to pharmacy search
            </button>
          </div>
        </div>
      </div>
    )
  }

  function renderHomeScreen() {
    const navigationBranch = getNavigationBranch()

    return (
      <div className="portal-home">
        {isSwitchFlow ? (
          <section className="portal-section portal-switch-banner">
            <div className="portal-switch-banner-copy">
              <span className="portal-switch-kicker">Branch switch in progress</span>
              <h2>Pick the new pharmacy, then we will carry your saved profile forward.</h2>
              <p>
                Your details can be edited on the next branch's login or registration screen before you submit anything.
                If the saved info is wrong, clear it first and start a fresh account.
              </p>
            </div>
            <div className="portal-switch-banner-panel">
              <div className="portal-switch-banner-label">Saved profile draft</div>
              <div className="portal-switch-banner-value">{draftSummary || "No saved profile draft found."}</div>
              <div className="portal-switch-banner-actions">
                <button type="button" className="portal-directory-button primary" onClick={() => setActiveTab("home")}>
                  Choose a branch
                </button>
                {profileDraft ? (
                  <button type="button" className="portal-directory-button secondary" onClick={() => void handleClearSavedDraft()}>
                    Clear saved details
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

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
                  <strong>portal.remedacarePOS.app/patient</strong>
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
                    <span>
                      {authLoading
                        ? "Checking sign-in..."
                        : isAuthenticated
                          ? "Signed in with patient account."
                          : "Sign in to see private updates."}
                    </span>
                    <Link
                      to={buildPatientLoginPath(navigationBranch, buildPatientPath("/patient/track", navigationBranch))}
                      className="portal-directory-button"
                    >
                      Find My Updates
                    </Link>
                  </div>
                </div>

                {profileDraft ? (
                  <div className="portal-directory-draft">
                    <div>
                      <strong>Saved profile ready</strong>
                      <p>{draftSummary || "Your profile details will carry into the next branch."}</p>
                    </div>
                    <p>
                      This helps the next branch prefill your name, phone number, and email. You can still edit those
                      details before you submit a new request.
                    </p>
                  </div>
                ) : null}

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
                              <Link
                                to={buildPatientLoginPath(pharmacy, buildPatientPath("/patient", pharmacy))}
                                className="portal-directory-button primary"
                              >
                                Use main pharmacy
                              </Link>
                              {profileDraft ? (
                                <div className="portal-directory-action-note">
                                  <strong>Saved profile ready</strong>
                                  <span>{draftSummary || "Your details can be edited before you submit."}</span>
                                </div>
                              ) : null}
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
                      {pharmaciesLoading
                        ? "Loading pharmacies from the POS database..."
                        : pharmaciesError
                          ? "No pharmacies were returned from the POS project."
                          : "No main pharmacies matched your filters yet. Try widening the search."}
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
                    <>
                      <div className="portal-directory-branch-grid">
                        {visibleBranchCards.map((branch) => {
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
                              <Link
                                to={buildPatientLoginPath(branch, buildPatientPath("/patient", branch))}
                                className="portal-directory-link"
                              >
                                Choose this branch
                              </Link>
                              {profileDraft ? (
                                <div className="portal-directory-action-note">
                                  <strong>Saved profile ready</strong>
                                  <span>{draftSummary || "Your details can be edited before you submit."}</span>
                                </div>
                              ) : null}
                            </article>
                          )
                        })}
                      </div>

                      {isCompactDirectory && branchCards.length > branchPageSize ? (
                        <div className="portal-directory-pagination" aria-label="Branch list pagination">
                          <button
                            type="button"
                            className="portal-directory-page-btn"
                            onClick={() => setBranchPage((current) => Math.max(0, current - 1))}
                            disabled={branchPage <= 0}
                          >
                            Previous
                          </button>
                          <span className="portal-directory-page-count">
                            Page {Math.min(branchPage + 1, branchPageCount)} of {branchPageCount}
                          </span>
                          <button
                            type="button"
                            className="portal-directory-page-btn"
                            onClick={() => setBranchPage((current) => Math.min(branchPageCount - 1, current + 1))}
                            disabled={branchPage >= branchPageCount - 1}
                          >
                            Next
                          </button>
                        </div>
                      ) : null}
                    </>
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

        {savedBranches.length ? (
          <section className="portal-section portal-saved-branches-section">
            <div className="portal-section-header">
              <h2 className="portal-section-title">My opted-in branches</h2>
              <span className="portal-section-badge">{savedBranches.length} saved</span>
            </div>

            <div className="portal-branches-grid">
              {savedBranches.map((entry) => {
                const branch = {
                  id: entry.pharmacyId,
                  name: entry.name,
                  location: entry.location,
                }
                const updatedAtLabel = entry.session?.updatedAt
                  ? new Intl.DateTimeFormat("en-KE", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(entry.session.updatedAt))
                  : "Recently saved"

                return (
                  <article key={entry.pharmacyId} className="portal-branch-card">
                    <div className="portal-branch-card-top">
                      <span className="portal-directory-chip branch">OPTED IN</span>
                      <span>{updatedAtLabel}</span>
                    </div>
                    <h3>{entry.name}</h3>
                    <p>{entry.location || "Saved on this device"}</p>
                    <div className="portal-directory-action-note">
                      <strong>{entry.session?.fullName || "Patient account"}</strong>
                      <span>{entry.session?.phone || "No phone saved yet"}</span>
                    </div>
                    <div className="portal-directory-actions">
                      <Link
                        to={buildPatientLoginPath(branch, buildPatientPath("/patient", branch))}
                        className="portal-directory-button primary"
                      >
                        Open branch
                      </Link>
                      <button
                        type="button"
                        className="portal-directory-button secondary"
                        onClick={() => setSelectedMainPharmacyId(String(entry.pharmacyId))}
                      >
                        Focus in directory
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ) : null}

        <section className="portal-section">
          <div className="portal-section-header">
            <h2 className="portal-section-title">Quick Actions</h2>
            <span className="portal-section-badge">5 services</span>
          </div>
          <div className="portal-quick-grid">
            {quickActions.map((action) => (
              <button
                key={action.id}
                className={`portal-quick-card tone-${action.tone}`}
                onClick={() => handleProtectedAction(action.id)}
              >
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
    if (authLoading) {
      return (
        <div className="portal-form-page">
          <div className="portal-empty-state">
            <Loader2 size={44} className="portal-spinner" />
            <h3 className="portal-empty-title">Checking sign-in</h3>
            <p className="portal-empty-desc">We are checking whether this browser already has a signed-in patient session.</p>
          </div>
        </div>
      )
    }

    if (!isAuthenticated) {
      return renderSignInGate({
        actionId: "prescription",
        title: "Request a Prescription",
        description: "Sign in first so the pharmacy receives a real patient request, not an anonymous demo form.",
        ctaLabel: "Sign in to request medicine",
      })
    }

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
    if (authLoading) {
      return (
        <div className="portal-form-page">
          <div className="portal-empty-state">
            <Loader2 size={44} className="portal-spinner" />
            <h3 className="portal-empty-title">Checking sign-in</h3>
            <p className="portal-empty-desc">We are checking whether this browser already has a signed-in patient session.</p>
          </div>
        </div>
      )
    }

    if (!isAuthenticated) {
      return renderSignInGate({
        actionId: "appointment",
        title: "Book an Appointment",
        description: "Sign in first so the booking is attached to the exact branch and your real patient profile.",
        ctaLabel: "Sign in to book",
      })
    }

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
    if (authLoading) {
      return (
        <div className="portal-form-page">
          <div className="portal-empty-state">
            <Loader2 size={44} className="portal-spinner" />
            <h3 className="portal-empty-title">Checking sign-in</h3>
            <p className="portal-empty-desc">We are checking whether this browser already has a signed-in patient session.</p>
          </div>
        </div>
      )
    }

    if (!isAuthenticated) {
      return renderSignInGate({
        actionId: "maternal",
        title: "Maternal Care Registration",
        description: "Sign in first so ANC or pregnancy follow-up stays attached to your patient profile and branch.",
        ctaLabel: "Sign in to continue",
      })
    }

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
    if (authLoading) {
      return (
        <div className="portal-form-page">
          <div className="portal-empty-state">
            <Loader2 size={44} className="portal-spinner" />
            <h3 className="portal-empty-title">Checking sign-in</h3>
            <p className="portal-empty-desc">We are checking whether this browser already has a signed-in patient session.</p>
          </div>
        </div>
      )
    }

    if (!isAuthenticated) {
      return renderSignInGate({
        actionId: "delivery",
        title: "Request Delivery",
        description: "Sign in first so the delivery request goes to the right branch and patient record.",
        ctaLabel: "Sign in to request delivery",
      })
    }

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
    if (authLoading) {
      return (
        <div className="portal-form-page">
          <div className="portal-empty-state">
            <Loader2 size={44} className="portal-spinner" />
            <h3 className="portal-empty-title">Checking sign-in</h3>
            <p className="portal-empty-desc">We are checking whether this browser already has a signed-in patient session.</p>
          </div>
        </div>
      )
    }

    if (!isAuthenticated) {
      return renderSignInGate({
        actionId: "updates",
        title: "Your Updates",
        description: "Sign in first so tracking and notifications load from your real patient account.",
        ctaLabel: "Sign in to view updates",
      })
    }

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
    <div className={`portal-container ${isMobileMenuOpen ? "mobile-menu-open" : ""}`}>
      <PatientPortalStyles />

      <header className="portal-header">
        <div className="portal-header-inner">
          <div className="portal-brand">
            <div className="portal-logo">
              <span className="portal-logo-icon"><Pill size={16} /></span>
              <span>RemedacarePOS</span>
            </div>
          </div>

          <button
            type="button"
            className="portal-menu-toggle"
            aria-label="Open navigation"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={18} />
          </button>

          <nav className={`portal-nav ${isMobileMenuOpen ? "open" : ""}`}>
            <button
              type="button"
              className="portal-nav-close"
              aria-label="Close navigation"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X size={18} />
            </button>

            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`portal-nav-item ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => {
                  handleProtectedAction(tab.id)
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
            <Link className="portal-login-link" to={buildPatientLoginPath(getNavigationBranch())}>
              Sign in
            </Link>
            <button className="portal-notification-btn" type="button" aria-label="Notifications">
              <Bell size={20} />
            </button>
            <span className="portal-avatar-sm">{portalBrand.avatar}</span>
          </div>
        </div>

        {isMobileMenuOpen ? (
          <button
            type="button"
            className="portal-nav-backdrop"
            aria-label="Close navigation"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        ) : null}

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

      {authPrompt.open ? (
        <div className="portal-auth-modal" role="dialog" aria-modal="true" aria-label={authPrompt.title || "Sign in required"}>
          <button type="button" className="portal-auth-modal-backdrop" onClick={closeAuthPrompt} aria-label="Close sign in prompt" />
          <div className="portal-auth-modal-sheet">
            <div className="portal-auth-modal-head">
              <div>
                <div className="portal-kicker">Sign-in required</div>
                <h2 className="portal-section-title" style={{ marginTop: 4 }}>
                  {authPrompt.title || "Sign in first"}
                </h2>
                <p className="portal-form-sub" style={{ marginTop: 8 }}>
                  {authPrompt.description || "Please sign in before you continue."}
                </p>
              </div>
              <button type="button" className="portal-auth-modal-close" onClick={closeAuthPrompt} aria-label="Close sign in prompt">
                <X size={18} />
              </button>
            </div>

            <div className="portal-auth-modal-branch">
              <span className="portal-directory-chip branch">Branch first</span>
              <strong>{authPrompt.branch?.name || "Choose your pharmacy or branch"}</strong>
              <p>
                {authPrompt.branch?.location || "Pick the branch on the home screen, then sign in so your request reaches the right pharmacy."}
              </p>
            </div>

            <div className="portal-auth-modal-actions">
              <Link
                to={buildPatientLoginPath(authPrompt.branch, getActionRedirectPath(authPrompt.actionId, authPrompt.branch))}
                className="portal-directory-button primary"
                onClick={closeAuthPrompt}
              >
                {authPrompt.ctaLabel || "Sign in now"}
              </Link>
              <button type="button" className="portal-directory-button secondary" onClick={() => { closeAuthPrompt(); setActiveTab("home") }}>
                Choose branch
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <nav className={`portal-bottom-nav ${isMobileMenuOpen ? "hidden" : ""}`} aria-label="Mobile portal navigation">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`portal-bottom-nav-item ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => handleProtectedAction(tab.id)}
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

