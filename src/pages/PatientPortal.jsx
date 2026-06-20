import { useState } from "react"
import {
  Home, Pill, CalendarDays, HeartPulse, Truck, Bell,
  Plus, Trash2, Loader2, Search, Menu, X, ChevronRight,
  PhoneCall, Video, Building2, Image, Award, ShieldCheck,
  Smartphone, Zap, ClipboardList, PackageSearch,
} from "lucide-react"

export default function PatientPortal() {
  const [activeTab, setActiveTab] = useState("home")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchFocused, setSearchFocused] = useState(false)
  const [prescriptionForm, setPrescriptionForm] = useState({
    patientName: "", patientPhone: "", patientEmail: "",
    conditionNotes: "", requestedDrugs: [""],
  })
  const [appointmentForm, setAppointmentForm] = useState({
    patientName: "", patientPhone: "", patientEmail: "",
    appointmentType: "phone_call", slotDatetime: "",
    conditionSummary: "", patientNotes: "",
  })
  const [deliveryForm, setDeliveryForm] = useState({
    patientName: "", patientPhone: "", patientEmail: "", patientAddress: "",
    items: [{ drug_name: "", qty: "1", price: "" }],
  })
  const [submitting, setSubmitting] = useState("")
  const [user] = useState({ name: "Jane Mwangi", avatar: "JM" })

  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "prescription", label: "Prescriptions", icon: Pill },
    { id: "appointment", label: "Appointments", icon: CalendarDays },
    { id: "maternal", label: "Maternal Care", icon: HeartPulse },
    { id: "delivery", label: "Delivery", icon: Truck },
    { id: "updates", label: "Updates", icon: Bell },
  ]

  const quickActions = [
    { id: "prescription", title: "Request Prescription", description: "Send a refill request or upload prescription", icon: Pill, bgColor: "#ecfdf5", iconColor: "#059669" },
    { id: "appointment", title: "Book Appointment", description: "Schedule a call or video consultation", icon: CalendarDays, bgColor: "#eff6ff", iconColor: "#2563eb" },
    { id: "maternal", title: "Maternal Care", description: "ANC registration & pregnancy follow-up", icon: HeartPulse, bgColor: "#fff1f2", iconColor: "#e11d48" },
    { id: "delivery", title: "Request Delivery", description: "Get medicines delivered to your door", icon: Truck, bgColor: "#fffbeb", iconColor: "#d97706" },
    { id: "updates", title: "Check Updates", description: "Track your requests & notifications", icon: Bell, bgColor: "#f5f3ff", iconColor: "#7c3aed" },
  ]

  const features = [
    { icon: Building2, title: "Branch Routing", description: "Choose your preferred pharmacy branch" },
    { icon: ClipboardList, title: "Prescription Requests", description: "Send refill requests with photos" },
    { icon: CalendarDays, title: "Appointments", description: "Book calls or video consultations" },
    { icon: PackageSearch, title: "Live Tracking", description: "Follow your order in real-time" },
    { icon: HeartPulse, title: "Maternal Care", description: "ANC registration & follow-up" },
    { icon: Truck, title: "Delivery", description: "Get medicines delivered" },
  ]

  const trustBadges = [
    { icon: ShieldCheck, label: "Secure & Private" },
    { icon: Smartphone, label: "Mobile-Friendly" },
    { icon: Award, label: "Branch-Linked" },
    { icon: Zap, label: "Real-Time Updates" },
  ]

  const mockActivities = [
    { id: 1, title: "Metformin 500mg", statusLabel: "Under Review", status: "pending", time: "2 hours ago", icon: Pill, color: "#d97706", bg: "#fffbeb" },
    { id: 2, title: "Video Consultation", statusLabel: "Confirmed", status: "confirmed", time: "Tomorrow, 10:00 AM", icon: Video, color: "#2563eb", bg: "#eff6ff" },
    { id: 3, title: "Delivery #1234", statusLabel: "On the Way", status: "dispatched", time: "Today, 3:30 PM", icon: Truck, color: "#059669", bg: "#ecfdf5" },
  ]

  const statsCards = [
    { label: "Active Prescriptions", value: "3", icon: Pill, color: "#059669", bg: "#ecfdf5" },
    { label: "Upcoming Appointments", value: "2", icon: CalendarDays, color: "#2563eb", bg: "#eff6ff" },
    { label: "Pending Deliveries", value: "1", icon: Truck, color: "#d97706", bg: "#fffbeb" },
    { label: "Notifications", value: "5", icon: Bell, color: "#7c3aed", bg: "#f5f3ff" },
  ]

  function handleQuickAction(actionId) {
    setActiveTab(actionId)
  }

  function renderHomeScreen() {
    return (
      <div className="portal-home">
        <div className="portal-welcome">
          <div className="portal-welcome-content">
            <div>
              <span className="portal-greeting">Good morning 👋</span>
              <h1 className="portal-welcome-title">{user.name}</h1>
              <p className="portal-welcome-sub">Your health journey starts here</p>
            </div>
            <span className="portal-avatar">{user.avatar}</span>
          </div>
          <div className="portal-stats-grid">
            {statsCards.map((stat) => (
              <div key={stat.label} className="portal-stat-card">
                <div className="portal-stat-icon">
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

        <div className="portal-section">
          <div className="portal-section-header">
            <h2 className="portal-section-title">Quick Actions</h2>
            <span className="portal-section-badge">6 services</span>
          </div>
          <div className="portal-quick-grid">
            {quickActions.map((action) => (
              <button key={action.id} className="portal-quick-card" onClick={() => handleQuickAction(action.id)}>
                <div className="portal-quick-icon" style={{ background: action.bgColor, color: action.iconColor }}>
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
        </div>

        <div className="portal-section">
          <div className="portal-section-header">
            <h2 className="portal-section-title">Recent Activity</h2>
            <button className="portal-link-btn">View All</button>
          </div>
          <div className="portal-activity-list">
            {mockActivities.map((activity) => (
              <div key={activity.id} className="portal-activity-item">
                <div className="portal-activity-icon" style={{ background: activity.bg, color: activity.color }}>
                  <activity.icon size={16} />
                </div>
                <div className="portal-activity-content">
                  <div className="portal-activity-top">
                    <span className="portal-activity-title">{activity.title}</span>
                    <span className={`portal-activity-status portal-status-${activity.status}`}>{activity.statusLabel}</span>
                  </div>
                  <span className="portal-activity-time">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="portal-section">
          <div className="portal-section-header">
            <h2 className="portal-section-title">Everything You Need</h2>
            <span className="portal-section-badge">All in one place</span>
          </div>
          <div className="portal-features-grid">
            {features.map((feature) => (
              <div key={feature.title} className="portal-feature-card">
                <div className="portal-feature-icon"><feature.icon size={20} /></div>
                <h4 className="portal-feature-title">{feature.title}</h4>
                <p className="portal-feature-desc">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

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
              <input className="portal-input" placeholder="Mother's full name" />
            </div>
            <div className="portal-form-group">
              <label className="portal-label">Phone Number</label>
              <input className="portal-input" placeholder="07XXXXXXXX" />
            </div>
          </div>
          <div className="portal-form-row">
            <div className="portal-form-group">
              <label className="portal-label">Last Menstrual Period (LMP)</label>
              <input className="portal-input" type="date" />
            </div>
            <div className="portal-form-group">
              <label className="portal-label">Gravida / Parity</label>
              <input className="portal-input" placeholder="e.g. G2 P1" />
            </div>
          </div>
          <div className="portal-form-group">
            <label className="portal-label">Current Concerns or Notes</label>
            <textarea className="portal-textarea" rows={4} placeholder="Share any pregnancy concerns or follow-up needs..." />
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
                    }} placeholder="Qty" />
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
      case "home": return renderHomeScreen()
      case "prescription": return renderPrescriptionForm()
      case "appointment": return renderAppointmentForm()
      case "maternal": return renderMaternalForm()
      case "delivery": return renderDeliveryForm()
      case "updates": return renderUpdatesScreen()
      default: return renderHomeScreen()
    }
  }

  return (
    <div className="portal-container">
      <header className="portal-header">
        <div className="portal-header-inner">
          <div className="portal-brand">
            <button className="portal-menu-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div className="portal-logo">
              <span className="portal-logo-icon">💊</span>
              <span>Pharma<span className="portal-logo-highlight">Course</span></span>
            </div>
          </div>
          <nav className={`portal-nav ${isMobileMenuOpen ? "open" : ""}`}>
            {tabs.map((tab) => (
              <button key={tab.id} className={`portal-nav-item ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => { setActiveTab(tab.id); setIsMobileMenuOpen(false) }}>
                <tab.icon size={18} /><span>{tab.label}</span>
              </button>
            ))}
          </nav>
          <div className="portal-header-actions">
            <button className="portal-notification-btn">
              <Bell size={20} /><span className="portal-notification-dot">3</span>
            </button>
            <span className="portal-avatar-sm">{user.avatar}</span>
          </div>
        </div>
        <div className="portal-search-bar">
          <div className="portal-search-wrapper">
            <Search size={18} className="portal-search-icon" />
            <input className="portal-search-input" placeholder="Search for medicines, appointments, or pharmacy..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} />
            {searchFocused && (
              <div className="portal-search-suggestions">
                <div className="portal-search-suggestion">Metformin 500mg</div>
                <div className="portal-search-suggestion">Blood pressure check</div>
                <div className="portal-search-suggestion">Delivery tracking</div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="portal-main">
        <div className="portal-content">{renderContent()}</div>
      </main>

      <nav className="portal-bottom-nav">
        {tabs.slice(0, 4).map((tab) => (
          <button key={tab.id} className={`portal-bottom-nav-item ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}>
            <tab.icon size={20} /><span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <style>{`
        .portal-container { min-height: 100vh; background: linear-gradient(180deg, #f0faf6 0%, #e6f2ed 100%); font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #163329; }
        .portal-header { background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(15,110,86,0.08); position: sticky; top: 0; z-index: 50; }
        .portal-header-inner { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; max-width: 1200px; margin: 0 auto; position: relative; }
        .portal-brand { display: flex; align-items: center; gap: 0.75rem; }
        .portal-menu-toggle { background: none; border: none; color: #163329; cursor: pointer; padding: 0.25rem; display: none; }
        .portal-logo { display: flex; align-items: center; gap: 0.5rem; font-weight: 800; font-size: 1.1rem; }
        .portal-logo-icon { font-size: 1.4rem; }
        .portal-logo-highlight { color: #0f6e56; }
        .portal-nav { display: flex; align-items: center; gap: 0.25rem; }
        .portal-nav-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.85rem; border-radius: 12px; border: none; background: transparent; color: #5f746b; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s ease; }
        .portal-nav-item:hover { background: rgba(15,110,86,0.06); color: #163329; }
        .portal-nav-item.active { background: rgba(15,110,86,0.1); color: #0f6e56; }
        .portal-header-actions { display: flex; align-items: center; gap: 0.75rem; }
        .portal-notification-btn { position: relative; background: none; border: none; color: #5f746b; cursor: pointer; padding: 0.35rem; border-radius: 10px; }
        .portal-notification-dot { position: absolute; top: -2px; right: -2px; width: 18px; height: 18px; border-radius: 50%; background: #ef4444; color: white; font-size: 0.6rem; font-weight: 700; display: flex; align-items: center; justify-content: center; }
        .portal-avatar-sm { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg,#0f6e56,#0d5d49); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; }
        .portal-search-bar { padding: 0.5rem 1rem 0.75rem; max-width: 1200px; margin: 0 auto; }
        .portal-search-wrapper { position: relative; }
        .portal-search-icon { position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); color: #8fa8a0; }
        .portal-search-input { width: 100%; padding: 0.6rem 1rem 0.6rem 2.8rem; border-radius: 14px; border: 1.5px solid rgba(15,110,86,0.12); background: rgba(255,255,255,0.9); font-size: 0.9rem; color: #163329; outline: none; box-sizing: border-box; }
        .portal-search-input:focus { border-color: #0f6e56; box-shadow: 0 0 0 4px rgba(15,110,86,0.08); }
        .portal-search-suggestions { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: white; border-radius: 12px; border: 1px solid rgba(15,110,86,0.08); box-shadow: 0 12px 40px rgba(15,42,32,0.08); overflow: hidden; z-index: 20; }
        .portal-search-suggestion { padding: 0.6rem 1rem; cursor: pointer; font-size: 0.85rem; color: #24463a; }
        .portal-search-suggestion:hover { background: rgba(15,110,86,0.04); }
        .portal-main { padding: 1rem; max-width: 1200px; margin: 0 auto; }
        .portal-content { display: flex; flex-direction: column; gap: 1.5rem; }
        .portal-welcome { background: linear-gradient(135deg,#0f6e56,#0d5d49); border-radius: 20px; padding: 1.5rem; color: white; }
        .portal-welcome-content { display: flex; justify-content: space-between; align-items: flex-start; }
        .portal-greeting { font-size: 0.85rem; opacity: 0.8; }
        .portal-welcome-title { font-size: 1.6rem; font-weight: 800; margin: 0.2rem 0 0.1rem; letter-spacing: -0.02em; }
        .portal-welcome-sub { font-size: 0.95rem; opacity: 0.75; margin: 0; }
        .portal-avatar { width: 48px; height: 48px; border-radius: 50%; background: rgba(255,255,255,0.2); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.2rem; border: 2px solid rgba(255,255,255,0.3); }
        .portal-stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 0.75rem; margin-top: 1rem; }
        .portal-stat-card { background: rgba(255,255,255,0.12); border-radius: 14px; padding: 0.75rem; display: flex; align-items: center; gap: 0.6rem; }
        .portal-stat-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.15); color: white; }
        .portal-stat-info { display: flex; flex-direction: column; }
        .portal-stat-value { font-size: 1.1rem; font-weight: 800; }
        .portal-stat-label { font-size: 0.65rem; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.04em; }
        .portal-section { background: white; border-radius: 16px; padding: 1.25rem; box-shadow: 0 2px 12px rgba(15,42,32,0.04); border: 1px solid rgba(15,110,86,0.06); }
        .portal-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .portal-section-title { font-size: 1.05rem; font-weight: 700; margin: 0; }
        .portal-section-badge { font-size: 0.7rem; padding: 0.2rem 0.6rem; border-radius: 20px; background: rgba(15,110,86,0.08); color: #0f6e56; font-weight: 600; }
        .portal-link-btn { background: none; border: none; color: #0f6e56; font-weight: 600; font-size: 0.85rem; cursor: pointer; }
        .portal-quick-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(200px,1fr)); gap: 0.75rem; }
        .portal-quick-card { display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem; border-radius: 14px; border: 1px solid rgba(15,110,86,0.06); background: white; cursor: pointer; transition: all 0.2s ease; text-align: left; width: 100%; }
        .portal-quick-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(15,42,32,0.06); border-color: rgba(15,110,86,0.12); }
        .portal-quick-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .portal-quick-content { flex: 1; min-width: 0; }
        .portal-quick-title { font-size: 0.85rem; font-weight: 700; margin: 0; }
        .portal-quick-desc { font-size: 0.75rem; color: #5f746b; margin: 0.1rem 0 0; }
        .portal-quick-arrow { color: #b0c4bb; flex-shrink: 0; }
        .portal-activity-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .portal-activity-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.75rem; border-radius: 12px; background: rgba(248,252,250,0.8); }
        .portal-activity-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .portal-activity-content { flex: 1; min-width: 0; }
        .portal-activity-top { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
        .portal-activity-title { font-weight: 600; font-size: 0.85rem; }
        .portal-activity-status { font-size: 0.65rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 20px; flex-shrink: 0; }
        .portal-status-pending { background: #fef3c7; color: #92400e; }
        .portal-status-confirmed { background: #d1fae5; color: #065f46; }
        .portal-status-dispatched { background: #dbeafe; color: #1e40af; }
        .portal-activity-time { font-size: 0.7rem; color: #8fa8a0; }
        .portal-features-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(160px,1fr)); gap: 0.75rem; }
        .portal-feature-card { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 1rem; border-radius: 14px; border: 1px solid rgba(15,110,86,0.04); background: rgba(248,252,250,0.6); }
        .portal-feature-icon { width: 40px; height: 40px; border-radius: 12px; background: rgba(15,110,86,0.08); color: #0f6e56; display: flex; align-items: center; justify-content: center; margin-bottom: 0.5rem; }
        .portal-feature-title { font-size: 0.8rem; font-weight: 700; margin: 0; }
        .portal-feature-desc { font-size: 0.7rem; color: #5f746b; margin: 0.2rem 0 0; line-height: 1.4; }
        .portal-trust-section { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.75rem; padding: 0.5rem 0; }
        .portal-trust-badge { display: flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0.8rem; border-radius: 20px; background: rgba(15,110,86,0.04); color: #24463a; font-size: 0.75rem; font-weight: 500; }
        .portal-trust-icon { color: #0f6e56; }
        .portal-form-page { background: white; border-radius: 16px; padding: 1.5rem; box-shadow: 0 2px 12px rgba(15,42,32,0.04); border: 1px solid rgba(15,110,86,0.06); }
        .portal-form-header { margin-bottom: 1.5rem; }
        .portal-form-title { font-size: 1.25rem; font-weight: 800; margin: 0; }
        .portal-form-sub { font-size: 0.9rem; color: #5f746b; margin: 0.2rem 0 0; }
        .portal-form { display: flex; flex-direction: column; gap: 1rem; }
        .portal-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .portal-form-group { display: flex; flex-direction: column; gap: 0.3rem; }
        .portal-form-label-row { display: flex; justify-content: space-between; align-items: center; }
        .portal-label { font-size: 0.8rem; font-weight: 700; color: #24463a; }
        .portal-input, .portal-textarea { padding: 0.6rem 0.85rem; border-radius: 10px; border: 1.5px solid rgba(15,110,86,0.1); font-size: 0.9rem; color: #163329; background: white; outline: none; width: 100%; box-sizing: border-box; font-family: inherit; }
        .portal-input:focus, .portal-textarea:focus { border-color: #0f6e56; box-shadow: 0 0 0 4px rgba(15,110,86,0.06); }
        .portal-textarea { resize: vertical; }
        .portal-radio-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 0.5rem; }
        .portal-radio-card { padding: 0.75rem; border-radius: 12px; border: 2px solid rgba(15,110,86,0.08); background: white; cursor: pointer; text-align: center; }
        .portal-radio-card.selected { border-color: #0f6e56; background: rgba(15,110,86,0.04); }
        .portal-radio-card input { display: none; }
        .portal-radio-content { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; }
        .portal-radio-icon { width: 36px; height: 36px; border-radius: 10px; background: rgba(15,110,86,0.06); color: #0f6e56; display: flex; align-items: center; justify-content: center; }
        .portal-radio-label { font-size: 0.75rem; font-weight: 600; color: #24463a; }
        .portal-add-btn { display: flex; align-items: center; gap: 0.3rem; padding: 0.3rem 0.7rem; border-radius: 8px; border: 1px solid rgba(15,110,86,0.15); background: transparent; color: #0f6e56; font-weight: 600; font-size: 0.75rem; cursor: pointer; }
        .portal-drug-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .portal-drug-item { display: flex; gap: 0.5rem; align-items: center; }
        .portal-drug-item .portal-input { flex: 1; }
        .portal-remove-btn { padding: 0.3rem 0.5rem; border-radius: 8px; border: 1px solid rgba(239,68,68,0.15); background: transparent; color: #ef4444; cursor: pointer; display: flex; align-items: center; }
        .portal-upload-zone { border: 2px dashed rgba(15,110,86,0.2); border-radius: 14px; padding: 1.5rem; text-align: center; background: rgba(248,252,250,0.6); }
        .portal-upload-icon { color: #0f6e56; margin-bottom: 0.5rem; }
        .portal-upload-text { font-weight: 600; margin: 0; }
        .portal-upload-sub { font-size: 0.75rem; color: #5f746b; margin: 0.2rem 0 0; }
        .portal-submit-btn { padding: 0.75rem 1.5rem; border-radius: 12px; border: none; background: linear-gradient(135deg,#0f6e56,#0d5d49); color: white; font-weight: 700; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 0.5rem; }
        .portal-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .portal-spinner { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .portal-delivery-qty { max-width: 70px; }
        .portal-empty-state { text-align: center; padding: 2rem; }
        .portal-empty-icon { color: #b0c4bb; margin-bottom: 0.5rem; }
        .portal-empty-title { font-size: 1rem; font-weight: 700; margin: 0; }
        .portal-empty-desc { font-size: 0.85rem; color: #5f746b; margin: 0.2rem 0 0; }
        .portal-bottom-nav { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); border-top: 1px solid rgba(15,110,86,0.06); padding: 0.4rem 0.5rem 0.6rem; justify-content: space-around; z-index: 40; }
        .portal-bottom-nav-item { display: flex; flex-direction: column; align-items: center; gap: 0.1rem; background: none; border: none; color: #8fa8a0; font-size: 0.6rem; font-weight: 600; cursor: pointer; padding: 0.2rem 0.5rem; }
        .portal-bottom-nav-item.active { color: #0f6e56; }
        @media (max-width: 768px) {
          .portal-menu-toggle { display: block; }
          .portal-nav { display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; flex-direction: column; padding: 0.5rem; border-bottom: 1px solid rgba(15,110,86,0.06); box-shadow: 0 12px 40px rgba(15,42,32,0.06); }
          .portal-nav.open { display: flex; }
          .portal-nav-item { width: 100%; padding: 0.6rem 0.85rem; }
          .portal-stats-grid { grid-template-columns: repeat(2,1fr); }
          .portal-quick-grid { grid-template-columns: 1fr; }
          .portal-form-row { grid-template-columns: 1fr; }
          .portal-radio-grid { grid-template-columns: 1fr; }
          .portal-features-grid { grid-template-columns: repeat(2,1fr); }
          .portal-bottom-nav { display: flex; }
          .portal-main { padding-bottom: 4.5rem; }
        }
        @media (max-width: 480px) {
          .portal-welcome-title { font-size: 1.2rem; }
          .portal-features-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}