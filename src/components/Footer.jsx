import { Link } from "react-router-dom"

export default function Footer() {
  return (
    <footer>
      <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <span className="footer-logo">PharmaCourse</span>
        <ul className="footer-links">
          <li><Link to="/courses">Explore</Link></li>
          <li><Link to="/community">Community</Link></li>
          <li><Link to="/login">Sign In</Link></li>
        </ul>
        <span className="footer-copy">Copyright 2026 PharmaCourse. All rights reserved.</span>
      </div>
    </footer>
  )
}
