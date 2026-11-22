import { Link } from "react-router-dom"
import { Award, BookOpenCheck, ShieldCheck, Smartphone } from "lucide-react"
import "../styles/auth-ui.css"

const POINTS = [
  { icon: BookOpenCheck, title: "Practical CPD courses", text: "Short lessons built around real counter and ward decisions." },
  { icon: Award, title: "Verifiable certificates", text: "Every certificate carries a QR code employers can check." },
  { icon: Smartphone, title: "Learn on any device", text: "Pick up where you left off on your phone or laptop." },
]

// Brand panel shown beside the sign-in, register and password forms.
export default function AuthAside({ title = "Professional learning for pharmacy teams in Kenya." }) {
  return (
    <aside className="auth-aside" aria-label="About Pharmacourse">
      <Link to="/" className="auth-aside-logo">Pharmacourse</Link>
      <h2>{title}</h2>
      <ul className="auth-aside-points">
        {POINTS.map((point) => (
          <li key={point.title}>
            <span className="auth-aside-icon"><point.icon size={18} aria-hidden="true" /></span>
            <span><strong>{point.title}</strong>{point.text}</span>
          </li>
        ))}
      </ul>
      <p className="auth-aside-trust"><ShieldCheck size={16} aria-hidden="true" /> Protected sign-in. We never share your details.</p>
    </aside>
  )
}

export function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}
