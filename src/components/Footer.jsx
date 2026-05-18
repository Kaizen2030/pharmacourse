import { Link } from "react-router-dom"

export default function Footer() {
  return (
    <footer>
      <div className="container-wide site-footer-shell">
        <div className="site-footer-top">
          <div className="site-footer-brand">
            <span className="footer-logo">PharmaCourse</span>
            <p className="site-footer-copy">
              Learning, pharmacy operations, and hospital workflows connected for modern Kenyan healthcare teams.
            </p>
            <div className="site-footer-actions">
              <Link to="/courses" className="site-footer-pill">Explore Courses</Link>
              <Link to="/workshops" className="site-footer-pill">Upcoming Workshops</Link>
            </div>
          </div>

          <div className="site-footer-grid">
            <div>
              <div className="site-footer-heading">Products</div>
              <ul className="footer-links site-footer-links">
                <li><Link to="/remedacarepos">RemedacarePOS</Link></li>
                <li><Link to="/remedacarehms">RemedacareHMS</Link></li>
                <li><Link to="/patient">Patient Portal</Link></li>
              </ul>
            </div>

            <div>
              <div className="site-footer-heading">Learning</div>
              <ul className="footer-links site-footer-links">
                <li><Link to="/courses">Courses</Link></li>
                <li><Link to="/workshops">Workshops</Link></li>
                <li><Link to="/dashboard">My Learning</Link></li>
              </ul>
            </div>

            <div>
              <div className="site-footer-heading">Explore</div>
              <ul className="footer-links site-footer-links">
                <li><Link to="/community">Community</Link></li>
                <li><Link to="/blog">Blog</Link></li>
                <li><Link to="/team-plans">Team Plans</Link></li>
                <li><Link to="/login">Sign In</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="site-footer-bottom">
          <span className="footer-copy">Copyright 2026 PharmaCourse. All rights reserved.</span>
          <span className="footer-copy">Built for pharmacy, clinic, and hospital teams across Kenya.</span>
        </div>
      </div>
    </footer>
  )
}
