import { useState, useEffect, useRef } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { supabase } from "../lib/supabaseClient"

const learnLinks = [
  { to: "/courses", label: "Explore" },
  { to: "/workshops", label: "Workshops" },
  { to: "/team-plans", label: "Team Plans" },
]

const productLinks = [
  { to: "/remedacarepos", label: "RemedacarePOS", detail: "Telepharmacy, dispensing, inventory, claims, and branch pharmacy operations" },
  { to: "/remedacarehms", label: "RemedacareHMS", detail: "Clinical workflows, chronic care, finance, AMS, and hospital-wide control" },
]

export default function Navbar() {
  const { user, profile, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isPatientRoute = location.pathname.startsWith("/patient")
  const [menuOpen, setMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileSections, setMobileSections] = useState({ learn: true, products: false })
  const drawerRef = useRef(null)
  const navInteractiveRef = useRef(null)

  const firstName = profile?.full_name?.split(" ")?.[0] || "Account"

  const isActive = (path) => location.pathname === path
  const isGroupActive = (links) => links.some((link) => isActive(link.to))

  useEffect(() => {
    function handleClick(event) {
      if (menuOpen && drawerRef.current && !drawerRef.current.contains(event.target)) {
        setMenuOpen(false)
      }

      if (
        (openDropdown || userMenuOpen) &&
        navInteractiveRef.current &&
        !navInteractiveRef.current.contains(event.target)
      ) {
        setOpenDropdown(null)
        setUserMenuOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMenuOpen(false)
        setOpenDropdown(null)
        setUserMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [menuOpen, openDropdown, userMenuOpen])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [menuOpen])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate("/")
  }

  function toggleMobileSection(section) {
    setMobileSections((current) => ({ ...current, [section]: !current[section] }))
  }

  function handleDesktopDropdownToggle(name) {
    setUserMenuOpen(false)
    setOpenDropdown((current) => (current === name ? null : name))
  }

  function renderDesktopDropdown(name, label, links) {
    const isOpen = openDropdown === name
    const active = isGroupActive(links)

    return (
      <li
        className="nav-dropdown-item"
        onMouseEnter={() => setOpenDropdown(name)}
        onMouseLeave={() => setOpenDropdown((current) => (current === name ? null : current))}
      >
        <button
          type="button"
          className={`nav-dropdown-trigger${active ? " active" : ""}`}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={() => handleDesktopDropdownToggle(name)}
        >
          <span>{label}</span>
          <span className={`nav-chevron${isOpen ? " open" : ""}`}>v</span>
        </button>

        {isOpen ? (
          <div
            className="nav-dropdown-panel"
            role="menu"
            aria-label={label}
            onMouseEnter={() => setOpenDropdown(name)}
            onMouseLeave={() => setOpenDropdown((current) => (current === name ? null : current))}
          >
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                role="menuitem"
                className={`nav-dropdown-link${isActive(link.to) ? " active" : ""}`}
                onClick={() => setOpenDropdown(null)}
              >
                <span style={{ display: "block", fontWeight: 800 }}>{link.label}</span>
                {link.detail ? (
                  <span style={{ display: "block", marginTop: 4, fontSize: 12, lineHeight: 1.45, color: "var(--text-500)" }}>
                    {link.detail}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        ) : null}
      </li>
    )
  }

  if (isPatientRoute) return null

  return (
    <>
      <nav className="nav">
        <Link to="/" className="nav-logo">PharmaCourse</Link>

        <div className="nav-desktop" ref={navInteractiveRef}>
          <ul className="nav-links">
            <li>
              <Link to="/" className={isActive("/") ? "active" : ""}>Home</Link>
            </li>
            {renderDesktopDropdown("learn", "Learn", learnLinks)}
            {renderDesktopDropdown("products", "Products", productLinks)}
            <li>
              <Link to="/community" className={isActive("/community") ? "active" : ""}>Community</Link>
            </li>
            <li>
              <Link to="/blog" className={isActive("/blog") ? "active" : ""}>Blog</Link>
            </li>
          </ul>

          {user ? (
            <div className="nav-account">
              <Link to="/dashboard" className={`nav-account-link${isActive("/dashboard") ? " active" : ""}`}>
                My Learning
              </Link>

              <div className="nav-user-menu-wrap">
                <button
                  type="button"
                  className={`nav-user-trigger${userMenuOpen ? " open" : ""}`}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  onClick={() => {
                    setOpenDropdown(null)
                    setUserMenuOpen((current) => !current)
                  }}
                >
                  <span className="nav-user-avatar">{firstName.charAt(0).toUpperCase()}</span>
                  <span>{firstName}</span>
                  <span className={`nav-chevron${userMenuOpen ? " open" : ""}`}>v</span>
                </button>

                {userMenuOpen ? (
                  <div className="nav-dropdown-panel nav-user-panel" role="menu" aria-label="User menu">
                    <Link
                      to="/dashboard"
                      role="menuitem"
                      className={`nav-dropdown-link${isActive("/dashboard") ? " active" : ""}`}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      My Learning
                    </Link>
                    {isAdmin ? (
                      <Link
                        to="/admin"
                        role="menuitem"
                        className={`nav-dropdown-link${isActive("/admin") ? " active" : ""}`}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Admin
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      role="menuitem"
                      className="nav-dropdown-link nav-dropdown-danger"
                      onClick={handleLogout}
                    >
                      Sign Out
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: ".75rem" }}>
              <Link to="/login" className="btn btn-outline" style={{ padding: ".45rem 1rem", fontSize: ".86rem" }}>Sign In</Link>
              <Link to="/register" className="btn btn-primary" style={{ padding: ".45rem 1rem", fontSize: ".86rem" }}>Register</Link>
            </div>
          )}
        </div>

        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-drawer"
        >
          <span className={`hamburger-bar ${menuOpen ? "open" : ""}`} />
          <span className={`hamburger-bar ${menuOpen ? "open" : ""}`} />
          <span className={`hamburger-bar ${menuOpen ? "open" : ""}`} />
        </button>
      </nav>

      {menuOpen && <div className="nav-overlay" onClick={() => setMenuOpen(false)} />}

      <div ref={drawerRef} id="mobile-nav-drawer" className={`nav-drawer ${menuOpen ? "open" : ""}`}>
        <div className="nav-drawer-header">
          <Link to="/" className="nav-logo" onClick={() => setMenuOpen(false)}>PharmaCourse</Link>
          <button className="nav-drawer-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">x</button>
        </div>

        <ul className="nav-drawer-links">
          <li>
            <Link
              to="/"
              className={isActive("/") ? "active" : ""}
              onClick={() => setMenuOpen(false)}
            >
              Home
            </Link>
          </li>

          <li className="nav-drawer-group">
            <button
              type="button"
              className={`nav-drawer-group-trigger${mobileSections.learn ? " open" : ""}${isGroupActive(learnLinks) ? " active" : ""}`}
              aria-expanded={mobileSections.learn}
              onClick={() => toggleMobileSection("learn")}
            >
              <span>Learn</span>
              <span className={`nav-chevron${mobileSections.learn ? " open" : ""}`}>v</span>
            </button>
            {mobileSections.learn ? (
              <div className="nav-drawer-subgroup">
                {learnLinks.map(({ to, label }) => (
                  <Link key={to} to={to} className={isActive(to) ? "active" : ""} onClick={() => setMenuOpen(false)}>
                    {label}
                  </Link>
                ))}
              </div>
            ) : null}
          </li>

          <li className="nav-drawer-group">
            <button
              type="button"
              className={`nav-drawer-group-trigger${mobileSections.products ? " open" : ""}${isGroupActive(productLinks) ? " active" : ""}`}
              aria-expanded={mobileSections.products}
              onClick={() => toggleMobileSection("products")}
            >
              <span>Products</span>
              <span className={`nav-chevron${mobileSections.products ? " open" : ""}`}>v</span>
            </button>
            {mobileSections.products ? (
              <div className="nav-drawer-subgroup">
                {productLinks.map(({ to, label, detail }) => (
                  <Link key={to} to={to} className={isActive(to) ? "active" : ""} onClick={() => setMenuOpen(false)}>
                    <span style={{ display: "block", fontWeight: 800 }}>{label}</span>
                    {detail ? (
                      <span style={{ display: "block", marginTop: 4, fontSize: 12, lineHeight: 1.45, color: "var(--text-500)" }}>
                        {detail}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            ) : null}
          </li>

          <li>
            <Link
              to="/community"
              className={isActive("/community") ? "active" : ""}
              onClick={() => setMenuOpen(false)}
            >
              Community
            </Link>
          </li>
          <li>
            <Link
              to="/blog"
              className={isActive("/blog") ? "active" : ""}
              onClick={() => setMenuOpen(false)}
            >
              Blog
            </Link>
          </li>
        </ul>

        <div className="nav-drawer-auth">
          {user ? (
            <>
              <p className="nav-drawer-user">{firstName}</p>
              <div className="nav-drawer-user-links">
                <Link to="/dashboard" className={isActive("/dashboard") ? "active" : ""} onClick={() => setMenuOpen(false)}>
                  My Learning
                </Link>
                {isAdmin ? (
                  <Link to="/admin" className={isActive("/admin") ? "active" : ""} onClick={() => setMenuOpen(false)}>
                    Admin
                  </Link>
                ) : null}
              </div>
              <button
                onClick={() => {
                  handleLogout()
                  setMenuOpen(false)
                }}
                className="btn btn-outline nav-danger-btn"
                style={{ width: "100%" }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              <Link to="/login" className="btn btn-outline" style={{ textAlign: "center" }} onClick={() => setMenuOpen(false)}>Sign In</Link>
              <Link to="/register" className="btn btn-primary" style={{ textAlign: "center" }} onClick={() => setMenuOpen(false)}>Register</Link>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .nav-hamburger {
          display: none;
          flex-direction: column;
          justify-content: center;
          gap: 5px;
          width: 42px;
          height: 42px;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 12px;
          transition: background 0.2s ease;
        }

        .nav-hamburger:hover {
          background: rgba(0, 0, 0, 0.05);
        }

        .hamburger-bar {
          display: block;
          width: 22px;
          height: 2px;
          border-radius: 2px;
          background: var(--text-900, #111);
          transition: transform 0.25s ease, opacity 0.2s ease, width 0.2s ease;
          transform-origin: center;
        }

        .hamburger-bar:nth-child(1).open { transform: translateY(7px) rotate(45deg); }
        .hamburger-bar:nth-child(2).open { opacity: 0; width: 0; }
        .hamburger-bar:nth-child(3).open { transform: translateY(-7px) rotate(-45deg); }

        .nav-desktop {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .nav-dropdown-item {
          position: relative;
        }

        .nav-dropdown-trigger,
        .nav-account-link {
          color: var(--text-500);
          font-size: 0.92rem;
          font-weight: 700;
          transition: color 0.18s ease, background 0.18s ease;
        }

        .nav-dropdown-trigger {
          min-height: 40px;
          padding: 0.35rem 0;
          display: inline-flex;
          align-items: center;
          gap: 0.38rem;
          border: none;
          cursor: pointer;
        }

        .nav-dropdown-trigger:hover,
        .nav-dropdown-trigger.active,
        .nav-account-link:hover,
        .nav-account-link.active {
          color: var(--green);
        }

        .nav-chevron {
          display: inline-flex;
          font-size: 0.8rem;
          transition: transform 0.2s ease;
        }

        .nav-chevron.open {
          transform: rotate(180deg);
        }

        .nav-dropdown-panel {
          position: absolute;
          top: 100%;
          left: 0;
          width: min(340px, calc(100vw - 2rem));
          min-width: 280px;
          padding: 8px;
          border: 0.5px solid var(--border, #dfe8e3);
          border-radius: var(--radius-lg, 26px);
          background: var(--surface, #fff);
          box-shadow: 0 16px 40px rgba(15, 42, 32, 0.12);
          display: grid;
          gap: 0.2rem;
          z-index: 120;
        }

        .nav-dropdown-link {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          gap: 0.15rem;
          min-height: 56px;
          padding: 0.7rem 0.85rem;
          border: none;
          border-radius: 14px;
          background: transparent;
          color: var(--text-700, #2b4a3f);
          font-size: 0.9rem;
          font-weight: 700;
          text-align: left;
          white-space: normal;
          cursor: pointer;
          transition: background 0.18s ease, color 0.18s ease;
        }

        .nav-dropdown-link:hover,
        .nav-dropdown-link.active {
          background: var(--green-light, #e9f7f1);
          color: var(--green, #0f6e56);
        }

        .nav-dropdown-danger {
          color: var(--danger, #dc2626);
        }

        .nav-dropdown-danger:hover {
          background: rgba(220, 38, 38, 0.08);
          color: var(--danger, #dc2626);
        }

        .nav-account {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .nav-user-menu-wrap {
          position: relative;
        }

        .nav-user-trigger {
          min-height: 42px;
          padding: 0.35rem 0.7rem 0.35rem 0.4rem;
          border: 0.5px solid rgba(15, 110, 86, 0.18);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.9);
          color: var(--text-700, #2b4a3f);
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
        }

        .nav-user-trigger:hover,
        .nav-user-trigger.open {
          border-color: rgba(15, 110, 86, 0.32);
          background: var(--green-light, #e9f7f1);
          color: var(--green, #0f6e56);
        }

        .nav-user-avatar {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(15, 110, 86, 0.12);
          color: var(--green, #0f6e56);
          font-size: 0.83rem;
          font-weight: 800;
          flex-shrink: 0;
        }

        .nav-user-panel {
          right: 0;
          left: auto;
          width: 220px;
          min-width: 220px;
        }

        .nav-user-panel .nav-dropdown-link {
          flex-direction: row;
          align-items: center;
          gap: 0;
          min-height: 42px;
        }

        .nav-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          z-index: 998;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .nav-drawer {
          position: fixed;
          top: 0;
          right: 0;
          width: min(320px, 86vw);
          height: 100dvh;
          background: #fff;
          box-shadow: -4px 0 32px rgba(0, 0, 0, 0.15);
          z-index: 999;
          display: flex;
          flex-direction: column;
          transform: translateX(100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow-y: auto;
        }

        .nav-drawer.open {
          transform: translateX(0);
        }

        .nav-drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #eee;
        }

        .nav-drawer-close {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 8px;
          color: var(--text-500, #888);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          transition: background 0.2s ease;
        }

        .nav-drawer-close:hover {
          background: #f0f0f0;
        }

        .nav-drawer-links {
          list-style: none;
          padding: 1rem 0;
          margin: 0;
          flex: 1;
        }

        .nav-drawer-links li > a,
        .nav-drawer-group-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: .85rem 1.5rem;
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-900, #111);
          border: none;
          border-left: 3px solid transparent;
          background: transparent;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
          cursor: pointer;
          text-align: left;
        }

        .nav-drawer-links li > a:hover,
        .nav-drawer-group-trigger:hover {
          background: #f5faf7;
          color: var(--green, #0F6E56);
        }

        .nav-drawer-links li > a.active,
        .nav-drawer-group-trigger.active {
          border-left-color: var(--green, #0F6E56);
          color: var(--green, #0F6E56);
          background: #f0faf7;
        }

        .nav-drawer-subgroup {
          display: grid;
          gap: 0.2rem;
          padding: 0.2rem 0 0.5rem;
        }

        .nav-drawer-subgroup a {
          display: block;
          padding: 0.72rem 1.5rem 0.72rem 2.5rem;
          color: var(--text-500, #607068);
          font-size: 0.94rem;
          font-weight: 700;
          border-left: 3px solid transparent;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }

        .nav-drawer-subgroup a:hover,
        .nav-drawer-subgroup a.active {
          border-left-color: var(--green, #0F6E56);
          color: var(--green, #0F6E56);
          background: #f0faf7;
        }

        .nav-drawer-auth {
          padding: 1.25rem;
          border-top: 1px solid #eee;
        }

        .nav-drawer-user {
          font-size: .9rem;
          color: var(--text-500, #888);
          margin: 0 0 .75rem;
          font-weight: 600;
        }

        .nav-drawer-user-links {
          display: grid;
          gap: 0.35rem;
          margin-bottom: 1rem;
        }

        .nav-drawer-user-links a {
          display: block;
          padding: 0.75rem 0.9rem;
          border-radius: 14px;
          color: var(--text-700, #2b4a3f);
          font-size: 0.92rem;
          font-weight: 700;
          transition: background 0.18s ease, color 0.18s ease;
        }

        .nav-drawer-user-links a:hover,
        .nav-drawer-user-links a.active {
          background: var(--green-light, #e9f7f1);
          color: var(--green, #0f6e56);
        }

        .nav-danger-btn {
          color: var(--danger, #dc2626);
          border-color: rgba(220, 38, 38, 0.18);
        }

        .nav-danger-btn:hover {
          background: rgba(220, 38, 38, 0.08);
          border-color: rgba(220, 38, 38, 0.28);
          color: var(--danger, #dc2626);
        }

        @media (max-width: 768px) {
          .nav-hamburger { display: flex; }
          .nav-desktop { display: none; }
        }
      `}</style>
    </>
  )
}
