import { Link } from "react-router-dom"

export default function Footer() {
  return (
    <footer>
      <div className="container" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", alignItems: "start", gap: "1.5rem" }}>
        <div>
          <span className="footer-logo">PharmaCourse</span>
          <p style={{ marginTop: "0.75rem", color: "var(--text-500)", maxWidth: 360, lineHeight: 1.7 }}>
            A connected healthcare ecosystem for learning, telepharmacy-ready pharmacy operations, and hospital-wide clinical management.
          </p>
        </div>
        <div>
          <div style={{ fontWeight: 800, marginBottom: "0.75rem" }}>Platforms</div>
          <ul className="footer-links" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.6rem" }}>
            <li><Link to="/remedacarepos">RemedacarePOS</Link></li>
            <li><Link to="/remedacarehmis">RemedacareHMIS</Link></li>
            <li><Link to="/patient">Patient Portal</Link></li>
          </ul>
        </div>
        <div>
          <div style={{ fontWeight: 800, marginBottom: "0.75rem" }}>Company</div>
          <ul className="footer-links" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.6rem" }}>
            <li><Link to="/courses">Explore</Link></li>
            <li><Link to="/community">Community</Link></li>
            <li><Link to="/blog">Blog</Link></li>
            <li><Link to="/login">Sign In</Link></li>
          </ul>
        </div>
        <span className="footer-copy" style={{ gridColumn: "1 / -1" }}>Copyright 2026 PharmaCourse. All rights reserved.</span>
      </div>
    </footer>
  )
}
