import { useNavigate } from "react-router-dom"
import { X } from "lucide-react"

// Lets someone back out of sign-in / sign-up and return to the page they came from.
export default function AuthCloseButton({ fallback = "/courses" }) {
  const navigate = useNavigate()

  function close() {
    // React Router stores the in-app history position in history.state.idx.
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }

  return (
    <button type="button" className="auth-close" onClick={close} aria-label="Close and go back" title="Not now">
      <X size={18} aria-hidden="true" />
    </button>
  )
}
