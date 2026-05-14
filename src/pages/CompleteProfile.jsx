import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

function getSafeNextPath(nextPath) {
  if (!nextPath || !nextPath.startsWith("/")) {
    return "/dashboard"
  }

  return nextPath
}

export default function CompleteProfile() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, profile, loading, updateProfile } = useAuth()
  const [form, setForm] = useState({ full_name: "", professional_id: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const nextPath = getSafeNextPath(searchParams.get("next"))

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true })
    }
  }, [loading, navigate, user])

  useEffect(() => {
    setForm({
      full_name: profile?.full_name || "",
      professional_id: profile?.professional_id || "",
    })
  }, [profile?.full_name, profile?.professional_id])

  function handleChange(key) {
    return (event) => {
      const value = event.target.value
      setForm((current) => ({ ...current, [key]: value }))
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")

    const fullName = form.full_name.trim()
    if (!fullName) {
      setError("Full name is required for your certificate.")
      return
    }

    setSaving(true)

    try {
      await updateProfile({
        full_name: fullName,
        professional_id: form.professional_id,
      })
      navigate(nextPath, { replace: true })
    } catch (saveError) {
      setError(saveError.message || "Unable to save your profile right now.")
      setSaving(false)
    }
  }

  const canContinueWithoutSave = Boolean(profile?.full_name)

  if (loading || !user) {
    return (
      <div className="auth-wrap">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <h1>Preparing your profile</h1>
          <p style={{ color: "var(--text-500)" }}>Loading your certificate details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">PharmaCourse</div>
        <h1>Complete your profile</h1>
        <p>Confirm the name and professional ID that should appear on your certificate.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              className="form-input"
              value={form.full_name}
              onChange={handleChange("full_name")}
              placeholder="Dr. Jane Mwangi"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Pharmacy License / Professional ID</label>
            <input
              className="form-input"
              value={form.professional_id}
              onChange={handleChange("professional_id")}
              placeholder="e.g. PPB-12345"
            />
            <p style={{ fontSize: ".78rem", color: "var(--text-500)", marginTop: ".3rem" }}>
              This appears on your certificate. It is not verified.
            </p>
          </div>

          {error && <p className="error-msg" style={{ marginBottom: "1rem" }}>{error}</p>}

          <button type="submit" disabled={saving} className="btn btn-primary form-submit">
            {saving ? "Saving..." : "Save and Continue"}
          </button>
        </form>

        <div className="auth-footer" style={{ justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <Link to="/dashboard">Back to dashboard</Link>
          {canContinueWithoutSave && (
            <button
              type="button"
              onClick={() => navigate(nextPath, { replace: true })}
              style={{ background: "none", border: "none", color: "#0F6E56", fontWeight: 700, cursor: "pointer", padding: 0 }}
            >
              Continue without changes
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
