import { useCallback, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { usePatient } from "../../components/PatientLayout"
import { pharmacyosClient } from "../../lib/pharmacyosClient"
import { getAuthRedirectUrl } from "../../lib/authRedirect"
import { buildPatientRouteUrl } from "../../lib/patientPortalRoutes"
import { savePatientPortalSession } from "../../lib/patientPortalSession"
import { buildPatientAuthMetadata } from "../../hooks/usePatientPortalAuth"
import TurnstileWidget from "../../components/TurnstileWidget"

const insuranceOptions = ["SHA/NHIF", "AAR", "Jubilee", "Britam", "Madison", "CIC", "None"]
const chronicConditionOptions = [
  "Hypertension",
  "Diabetes",
  "Asthma",
  "HIV/AIDS",
  "TB",
  "Heart Disease",
  "Kidney Disease",
  "Arthritis",
  "Cancer",
  "Other",
]

function isValidPhone(phone) {
  return /^07\d{8}$/.test(phone)
}

export default function PatientRegister() {
  const { pharmacyId, branchName, createPatientPath } = usePatient()
  const [formValues, setFormValues] = useState({
    fullName: "",
    phone: "",
    email: "",
    dob: "",
    gender: "",
    shaMemberNo: "",
    insurer: "None",
    insuranceMemberNo: "",
    allergies: "",
    password: "",
    confirmPassword: "",
  })
  const [selectedConditions, setSelectedConditions] = useState([])
  const [feedback, setFeedback] = useState({ type: "", message: "" })
  const [accountFeedback, setAccountFeedback] = useState({ type: "", message: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState("")
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)

  function handleInputChange(event) {
    const { name, value } = event.target
    setFormValues((current) => ({ ...current, [name]: value }))
  }

  function toggleCondition(condition) {
    setSelectedConditions((current) =>
      current.includes(condition) ? current.filter((item) => item !== condition) : [...current, condition],
    )
  }

  const handleTurnstileVerify = useCallback((token) => {
    setTurnstileToken(token || "")
  }, [])

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken("")
  }, [])

  const nextStepActions = useMemo(
    () => [
      {
        title: "Request Prescription",
        copy: "Ask the pharmacist to review a medicine request or upload a prescription photo.",
        to: createPatientPath("/patient/prescription"),
      },
      {
        title: "Book Appointment",
        copy: "Schedule a phone call, video consultation, or in-person pickup discussion.",
        to: createPatientPath("/patient/appointment"),
      },
      {
        title: "Request Delivery",
        copy: "Send a delivery order with items and address details for this same branch.",
        to: `/patient-portal?pharmacy=${encodeURIComponent(pharmacyId)}`,
      },
      {
        title: "Check My Updates",
        copy: "Use your signed-in patient account to track prescription, appointment, and delivery progress.",
        to: createPatientPath("/patient/track"),
      },
    ],
    [createPatientPath, pharmacyId],
  )

  const loginPath = buildPatientRouteUrl("/patient/login", typeof window !== "undefined" ? window.location.search : "")

  async function handleSubmit(event) {
    event.preventDefault()

    const trimmedName = formValues.fullName.trim()
    const normalizedPhone = formValues.phone.trim()
    const normalizedEmail = formValues.email.trim().toLowerCase()

    if (!trimmedName || !normalizedPhone || !normalizedEmail) {
      setFeedback({ type: "error", message: "Full name, phone number, and email address are required." })
      return
    }

    if (!isValidPhone(normalizedPhone)) {
      setFeedback({ type: "error", message: "Phone number must use the format 07XXXXXXXX." })
      return
    }

    if (formValues.password.length < 8) {
      setFeedback({ type: "error", message: "Password must be at least 8 characters." })
      return
    }

    if (formValues.password !== formValues.confirmPassword) {
      setFeedback({ type: "error", message: "Passwords do not match." })
      return
    }

    if (!turnstileToken) {
      setFeedback({ type: "error", message: "Please complete the security check before registering." })
      return
    }

    setIsSubmitting(true)
    setFeedback({ type: "", message: "" })
    setAccountFeedback({ type: "", message: "" })

    const { data, error } = await pharmacyosClient.functions.invoke("patient-portal-submit", {
      body: {
        submissionType: "registration",
        turnstileToken,
        payload: {
          pharmacy_id: pharmacyId,
          full_name: trimmedName,
          phone: normalizedPhone,
          email: normalizedEmail,
          dob: formValues.dob || null,
          gender: formValues.gender || null,
          sha_member_no: formValues.shaMemberNo.trim() || null,
          insurer: formValues.insurer || null,
          insurance_member_no: formValues.insuranceMemberNo.trim() || null,
          chronic_conditions: selectedConditions,
          allergies: formValues.allergies.trim() || null,
        },
      },
    })

    if (error || data?.error) {
      setFeedback({ type: "error", message: error?.message || data?.error || "We could not save your registration." })
      setIsSubmitting(false)
      setTurnstileResetKey((current) => current + 1)
      return
    }

    setFeedback({
      type: data?.alreadyRegistered ? "info" : "success",
      message: data?.alreadyRegistered
        ? `Your profile is already linked at ${branchName}. Your reference number is ${normalizedPhone}.`
        : `Registration successful at ${branchName}. Your reference number is ${normalizedPhone}.`,
    })
    savePatientPortalSession(pharmacyId, {
      phone: normalizedPhone,
      fullName: trimmedName,
      patientId: data?.patient?.id || null,
    })

    const { data: authData, error: authError } = await pharmacyosClient.auth.signUp({
      email: normalizedEmail,
      password: formValues.password,
      options: {
        data: buildPatientAuthMetadata({
          fullName: trimmedName,
          phone: normalizedPhone,
          pharmacyId,
        }),
        emailRedirectTo: getAuthRedirectUrl(loginPath),
      },
    })

    if (authError) {
      const normalizedMessage = String(authError.message || "").toLowerCase()
      if (normalizedMessage.includes("already registered") || normalizedMessage.includes("already been registered")) {
        setAccountFeedback({
          type: "info",
          message: "Your patient profile is saved. This email already has an account, so sign in or reset your password to view private updates.",
        })
      } else {
        setAccountFeedback({
          type: "error",
          message: `Your patient profile was saved, but the web account could not be created: ${authError.message}`,
        })
      }
    } else if (authData?.session?.user) {
      setAccountFeedback({
        type: "success",
        message: "Your patient web account is now active. Sign in stays on this device, and only your account can view your updates and notifications.",
      })
    } else {
      setAccountFeedback({
        type: "success",
        message: `Your patient web account has been created. Check ${normalizedEmail} to confirm it, then sign in to view private updates and notifications.`,
      })
    }

    setTurnstileResetKey((current) => current + 1)
    setTurnstileToken("")
    setIsSubmitting(false)
  }

  return (
    <div className="patient-page">
      <section className="patient-card patient-card-muted patient-hero">
        <span className="patient-badge">Patient registration</span>
        <h1>Create your profile</h1>
        <p className="patient-copy">Register once with {branchName} so future prescription requests, appointments, and delivery updates are linked to your number.</p>
      </section>

      <section className="patient-card">
        <form className="patient-form" onSubmit={handleSubmit}>
          <div className="patient-grid-2">
            <div className="patient-form-group">
              <label className="patient-label" htmlFor="fullName">
                Full Name*
              </label>
              <input
                id="fullName"
                name="fullName"
                className="patient-input"
                value={formValues.fullName}
                onChange={handleInputChange}
                placeholder="Jane Wanjiku"
                required
              />
            </div>

            <div className="patient-form-group">
              <label className="patient-label" htmlFor="phone">
                Phone*
              </label>
              <input
                id="phone"
                name="phone"
                className="patient-input"
                type="tel"
                inputMode="tel"
                placeholder="07XXXXXXXX"
                value={formValues.phone}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="patient-grid-2">
            <div className="patient-form-group">
              <label className="patient-label" htmlFor="email">
                Email Address*
              </label>
              <input
                id="email"
                name="email"
                className="patient-input"
                type="email"
                value={formValues.email}
                onChange={handleInputChange}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="patient-form-group">
              <label className="patient-label" htmlFor="password">
                Web Account Password*
              </label>
              <input
                id="password"
                name="password"
                className="patient-input"
                type="password"
                value={formValues.password}
                onChange={handleInputChange}
                placeholder="At least 8 characters"
                required
              />
            </div>
          </div>

          <div className="patient-form-group">
            <label className="patient-label" htmlFor="confirmPassword">
              Confirm Password*
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              className="patient-input"
              type="password"
              value={formValues.confirmPassword}
              onChange={handleInputChange}
              placeholder="Repeat your password"
              required
            />
            <p className="patient-form-help" style={{ margin: 0 }}>
              This patient web account is what unlocks private updates and notifications. Phone number alone will no longer work.
            </p>
          </div>

          <div className="patient-grid-2">
            <div className="patient-form-group">
              <label className="patient-label" htmlFor="dob">
                Date of Birth
              </label>
              <input id="dob" name="dob" className="patient-input" type="date" value={formValues.dob} onChange={handleInputChange} />
            </div>

            <div className="patient-form-group">
              <label className="patient-label" htmlFor="gender">
                Gender
              </label>
              <select id="gender" name="gender" className="patient-select" value={formValues.gender} onChange={handleInputChange}>
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="patient-grid-2">
            <div className="patient-form-group">
              <label className="patient-label" htmlFor="shaMemberNo">
                SHA Member No
              </label>
              <input
                id="shaMemberNo"
                name="shaMemberNo"
                className="patient-input"
                value={formValues.shaMemberNo}
                onChange={handleInputChange}
                placeholder="Optional"
              />
            </div>

            <div className="patient-form-group">
              <label className="patient-label" htmlFor="insurer">
                Insurance Provider
              </label>
              <select id="insurer" name="insurer" className="patient-select" value={formValues.insurer} onChange={handleInputChange}>
                {insuranceOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="patient-form-group">
            <label className="patient-label" htmlFor="insuranceMemberNo">
              Insurance Member No
            </label>
            <input
              id="insuranceMemberNo"
              name="insuranceMemberNo"
              className="patient-input"
              value={formValues.insuranceMemberNo}
              onChange={handleInputChange}
              placeholder="Optional"
            />
          </div>

          <div className="patient-form-group">
            <span className="patient-label">Chronic Conditions</span>
            <div className="patient-checkbox-grid">
              {chronicConditionOptions.map((condition) => (
                <label key={condition} className="patient-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedConditions.includes(condition)}
                    onChange={() => toggleCondition(condition)}
                  />
                  <span>{condition}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="patient-form-group">
            <label className="patient-label" htmlFor="allergies">
              Allergies
            </label>
            <textarea
              id="allergies"
              name="allergies"
              className="patient-textarea"
              value={formValues.allergies}
              onChange={handleInputChange}
              placeholder="List any medicine or food allergies"
            />
          </div>

          {feedback.message ? (
            <div
              className={`patient-message ${
                feedback.type === "error"
                  ? "patient-message-error"
                  : feedback.type === "success"
                    ? "patient-message-success"
                    : "patient-message-info"
              }`}
            >
              {feedback.message}
            </div>
          ) : null}

          {accountFeedback.message ? (
            <div
              className={`patient-message ${
                accountFeedback.type === "error"
                  ? "patient-message-error"
                  : accountFeedback.type === "success"
                    ? "patient-message-success"
                    : "patient-message-info"
              }`}
            >
              {accountFeedback.message}
              {accountFeedback.type !== "error" ? (
                <div style={{ marginTop: "0.55rem" }}>
                  <Link to={loginPath} style={{ color: "inherit", fontWeight: 800 }}>
                    Open patient sign in
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="patient-form-group">
            <label className="patient-label">Security Check</label>
            <TurnstileWidget
              formId="patient-register"
              resetSignal={turnstileResetKey}
              onVerify={handleTurnstileVerify}
              onExpire={handleTurnstileExpire}
            />
          </div>

          <button className="patient-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving profile..." : "Create my profile"}
          </button>
        </form>
      </section>

      {feedback.type && feedback.type !== "error" ? (
        <section className="patient-card patient-card-muted">
          <div className="patient-section-header">
            <div>
              <h2 className="patient-section-title">What would you like to do next?</h2>
              <p className="patient-form-help">
                Your profile is now linked to {branchName}. Continue with the same patient account and phone number <strong>{formValues.phone.trim()}</strong> so the branch sees your full history.
              </p>
            </div>
          </div>

          <div className="patient-actions-grid">
            {nextStepActions.map((action) => (
              <Link
                key={action.title}
                to={action.to}
                className="patient-action-card"
                style={{ textDecoration: "none" }}
              >
                <div className="patient-action-content" style={{ display: "grid", gap: "0.24rem" }}>
                  <h3>{action.title}</h3>
                  <p style={{ margin: 0, color: "#5f746b", lineHeight: 1.6 }}>{action.copy}</p>
                </div>
                <div style={{ color: "#0f6e56", fontWeight: 800, fontSize: "0.9rem" }}>Open</div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
