import { useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"

export default function Register() {
  const [form, setForm] = useState({ full_name: "", professional_id: "", email: "", password: "", confirm: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function set(key) {
    return (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  }

  async function handleRegister(event) {
    event.preventDefault()
    setError("")

    if (form.password !== form.confirm) {
      setError("Passwords do not match.")
      return
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    setLoading(true)

    const { data, error: err } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.full_name, professional_id: form.professional_id } },
    })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <div className="auth-wrap">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <h1>Check your email</h1>
          <p style={{ color: "var(--text-500)", lineHeight: 1.7 }}>
            We sent a confirmation link to <strong>{form.email}</strong>.
            <br />Open it to activate your account, then sign in.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ marginTop: "1.5rem", display: "inline-flex" }}>Go to Sign In</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">PharmaCourse</div>
        <h1>Create your account</h1>
        <p>Free access to pharmacy CPD courses</p>

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={form.full_name} onChange={set("full_name")} placeholder="Dr. Jane Mwangi" required />
          </div>

          <div className="form-group">
            <label className="form-label">Pharmacy License / Professional ID</label>
            <input className="form-input" value={form.professional_id} onChange={set("professional_id")} placeholder="e.g. PPB-12345" />
            <p style={{ fontSize: ".78rem", color: "var(--text-500)", marginTop: ".3rem" }}>This appears on your certificate. It is not verified.</p>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" required />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input className="form-input" type={showPassword ? "text" : "password"} value={form.password} onChange={set("password")} placeholder="At least 8 characters" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "12px", background: "none", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "var(--text-500)" }} title={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input className="form-input" type={showConfirm ? "text" : "password"} value={form.confirm} onChange={set("confirm")} placeholder="Repeat password" required />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: "absolute", right: "12px", background: "none", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "var(--text-500)" }} title={showConfirm ? "Hide password" : "Show password"}>
                {showConfirm ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && <p className="error-msg" style={{ marginBottom: "1rem" }}>{error}</p>}

          <button type="submit" disabled={loading} className="btn btn-primary form-submit">
            {loading ? "Creating account..." : "Create Free Account"}
          </button>
        </form>

        <div className="auth-footer">
          Already registered? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
