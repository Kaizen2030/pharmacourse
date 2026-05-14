import { useState, useEffect, useRef } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { supabase } from "../lib/supabaseClient"

export default function Navbar() {
  const { user, profile, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const drawerRef = useRef(null)

  const isActive = (path) => location.pathname === path

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return undefined

    function handleClick(event) {
      if (drawerRef.current && !drawerRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setMenuOpen(false)
    }

    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [menuOpen])

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

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/courses", label: "Explore" },
    { to: "/community", label: "Community" },
    { to: "/pharmacyos", label: "PharmacyOS" },
    { to: "/remedacareos", label: "RemedacareOS" },
    ...(user ? [{ to: "/dashboard", label: "My Learning" }] : []),
    ...(isAdmin ? [{ to: "/admin", label: "Admin" }] : []),
  ]

  return (
    <>
      <nav className="nav">
        <Link to="/" className="nav-logo">PharmaCourse</Link>

        <div className="nav-desktop">
          <ul className="nav-links">
            {navLinks.map(({ to, label }) => (
              <li key={to}>
                <Link to={to} className={isActive(to) ? "active" : ""}>{label}</Link>
              </li>
            ))}
          </ul>

          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
              <span style={{ fontSize: ".88rem", color: "var(--text-500)" }}>
                {profile?.full_name?.split(" ")[0]}
              </span>
              <button onClick={handleLogout} className="btn btn-outline" style={{ padding: ".45rem 1rem", fontSize: ".86rem" }}>
                Sign Out
              </button>
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
          {navLinks.map(({ to, label }) => (
            <li key={to}>
              <Link
                to={to}
                className={isActive(to) ? "active" : ""}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="nav-drawer-auth">
          {user ? (
            <>
              <p className="nav-drawer-user">{profile?.full_name?.split(" ")[0] || "Pharmacist"}</p>
              <button
                onClick={() => {
                  handleLogout()
                  setMenuOpen(false)
                }}
                className="btn btn-outline"
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

        .nav-drawer-links li a {
          display: block;
          padding: .85rem 1.5rem;
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-900, #111);
          border-left: 3px solid transparent;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }

        .nav-drawer-links li a:hover {
          background: #f5faf7;
          color: var(--green, #0F6E56);
        }

        .nav-drawer-links li a.active {
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

        @media (max-width: 768px) {
          .nav-hamburger { display: flex; }
          .nav-desktop { display: none; }
        }
      `}</style>
    </>
  )
}
