import { useState } from "react"
import { usePatient } from "../../components/PatientLayout"
import { pharmacyosClient } from "../../lib/pharmacyosClient"

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
  const { pharmacyId, branchName } = usePatient()
  const [formValues, setFormValues] = useState({
    fullName: "",
    phone: "",
    dob: "",
    gender: "",
    shaMemberNo: "",
    insurer: "None",
    insuranceMemberNo: "",
    allergies: "",
  })
  const [selectedConditions, setSelectedConditions] = useState([])
  const [feedback, setFeedback] = useState({ type: "", message: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleInputChange(event) {
    const { name, value } = event.target
    setFormValues((current) => ({ ...current, [name]: value }))
  }

  function toggleCondition(condition) {
    setSelectedConditions((current) =>
      current.includes(condition) ? current.filter((item) => item !== condition) : [...current, condition],
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const trimmedName = formValues.fullName.trim()
    const normalizedPhone = formValues.phone.trim()

    if (!trimmedName || !normalizedPhone) {
      setFeedback({ type: "error", message: "Full name and phone number are required." })
      return
    }

    if (!isValidPhone(normalizedPhone)) {
      setFeedback({ type: "error", message: "Phone number must use the format 07XXXXXXXX." })
      return
    }

    setIsSubmitting(true)
    setFeedback({ type: "", message: "" })

    const { data: existingPatient, error: lookupError } = await pharmacyosClient
      .from("patients")
      .select("id, phone")
      .eq("pharmacy_id", pharmacyId)
      .eq("phone", normalizedPhone)
      .maybeSingle()

    if (lookupError) {
      setFeedback({ type: "error", message: lookupError.message || "We could not confirm your registration status." })
      setIsSubmitting(false)
      return
    }

    if (existingPatient) {
      setFeedback({
        type: "info",
        message: `You are already registered. Your reference number is ${normalizedPhone}. Use this number to book and track.`,
      })
      setIsSubmitting(false)
      return
    }

    const { error: insertError } = await pharmacyosClient.from("patients").insert({
      pharmacy_id: pharmacyId,
      full_name: trimmedName,
      phone: normalizedPhone,
      dob: formValues.dob || null,
      gender: formValues.gender || null,
      sha_member_no: formValues.shaMemberNo.trim() || null,
      insurer: formValues.insurer || null,
      insurance_member_no: formValues.insuranceMemberNo.trim() || null,
      chronic_conditions: selectedConditions.join(", ") || null,
      allergies: formValues.allergies.trim() || null,
    })

    if (insertError) {
      setFeedback({ type: "error", message: insertError.message || "We could not save your registration." })
      setIsSubmitting(false)
      return
    }

    setFeedback({
      type: "success",
      message: `Registration successful at ${branchName}. Your reference number is ${normalizedPhone}.`,
    })
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

          <button className="patient-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving profile..." : "Create my profile"}
          </button>
        </form>
      </section>
    </div>
  )
}
