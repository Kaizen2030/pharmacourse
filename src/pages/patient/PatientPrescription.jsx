import { useCallback, useEffect, useRef, useState } from "react"
import { ImagePlus, UserRound } from "lucide-react"
import { Link } from "react-router-dom"
import { usePatient } from "../../components/PatientLayout"
import { pharmacyosClient } from "../../lib/pharmacyosClient"
import { getPatientPortalSession, savePatientPortalSession } from "../../lib/patientPortalSession"

function isValidPhone(phone) {
  return /^07\d{8}$/.test(phone)
}

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, "-").toLowerCase()
}

export default function PatientPrescription() {
  const { pharmacyId, createPatientPath } = usePatient()
  const rememberedSession = getPatientPortalSession(pharmacyId)
  const [phone, setPhone] = useState(rememberedSession?.phone || "")
  const [patient, setPatient] = useState(null)
  const [lookupMessage, setLookupMessage] = useState({ type: "", message: "" })
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [conditionNotes, setConditionNotes] = useState("")
  const [drugRequested, setDrugRequested] = useState("")
  const [prescriptionFile, setPrescriptionFile] = useState(null)
  const [submitMessage, setSubmitMessage] = useState({ type: "", message: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const autoLookupDoneRef = useRef(false)

  useEffect(() => {
    if (!patient) {
      setConditionNotes("")
      return
    }

    if (!conditionNotes.trim()) {
      const existingConditions = patient.chronic_conditions?.trim()
      const prefilledHint = existingConditions
        ? `Known chronic conditions: ${existingConditions}\n\nPlease describe what you are currently experiencing or the refill you need.`
        : ""

      setConditionNotes(prefilledHint)
    }
  }, [patient, conditionNotes])

  const handleLookup = useCallback(async (event, phoneOverride) => {
    event.preventDefault()

    const normalizedPhone = String(phoneOverride ?? phone).trim()

    if (!isValidPhone(normalizedPhone)) {
      setLookupMessage({ type: "error", message: "Enter a valid phone number in the format 07XXXXXXXX." })
      setPatient(null)
      return
    }

    setIsLookingUp(true)
    setLookupMessage({ type: "", message: "" })
    setSubmitMessage({ type: "", message: "" })

    const { data, error } = await pharmacyosClient.functions.invoke("patient-portal-profile", {
      body: {
        pharmacy_id: pharmacyId,
        phone: normalizedPhone,
      },
    })

    if (error || data?.error) {
      setLookupMessage({ type: "error", message: error?.message || data?.error || "We could not verify this patient right now." })
      setPatient(null)
      setIsLookingUp(false)
      return
    }

    if (!data?.exists || !data?.patient) {
      setLookupMessage({ type: "info", message: "Please register first." })
      setPatient(null)
      setIsLookingUp(false)
      return
    }

    setPatient(data.patient)
    savePatientPortalSession(pharmacyId, {
      phone: data.patient.phone || normalizedPhone,
      fullName: data.patient.full_name,
      patientId: data.patient.id,
    })
    setLookupMessage({
      type: "success",
      message: `Welcome back ${data.patient.full_name}. You can submit your prescription request below.`,
    })
    setIsLookingUp(false)
  }, [phone, pharmacyId])

  async function handleSubmit(event) {
    event.preventDefault()

    if (!patient) {
      setSubmitMessage({ type: "error", message: "Please confirm your patient profile first." })
      return
    }

    if (!prescriptionFile) {
      setSubmitMessage({ type: "error", message: "Please upload a prescription photo before submitting." })
      return
    }

    setIsSubmitting(true)
    setSubmitMessage({ type: "", message: "" })

    const filePath = `${pharmacyId}/${patient.id}/${Date.now()}-${sanitizeFileName(prescriptionFile.name)}`
    const uploadResult = await pharmacyosClient.storage
      .from("prescription-photos")
      .upload(filePath, prescriptionFile, { upsert: false })

    if (uploadResult.error) {
      setSubmitMessage({ type: "error", message: uploadResult.error.message || "Photo upload failed." })
      setIsSubmitting(false)
      return
    }

    const { data: publicUrlData } = pharmacyosClient.storage.from("prescription-photos").getPublicUrl(filePath)
    const prescriptionImageUrl = publicUrlData.publicUrl

    const { error } = await pharmacyosClient.from("prescription_requests").insert({
      pharmacy_id: pharmacyId,
      branch_id: pharmacyId,
      patient_id: patient.id,
      patient_phone: patient.phone,
      patient_name: patient.full_name,
      condition_notes: conditionNotes.trim(),
      prescription_image_url: prescriptionImageUrl,
      drug_requested: drugRequested.trim() || null,
      status: "pending",
    })

    if (error) {
      setSubmitMessage({ type: "error", message: error.message || "We could not submit your request." })
      setIsSubmitting(false)
      return
    }

    setSubmitMessage({
      type: "success",
      message: "Request submitted! The pharmacist will review and respond. Sign in to your patient account to view private updates and notifications.",
    })
    setDrugRequested("")
    setPrescriptionFile(null)
    setConditionNotes("")
    setIsSubmitting(false)
  }

  useEffect(() => {
    if (autoLookupDoneRef.current) {
      return
    }

    if (!rememberedSession?.phone || patient || !isValidPhone(rememberedSession.phone)) {
      return
    }

    autoLookupDoneRef.current = true

    const fakeEvent = { preventDefault() {} }
    handleLookup(fakeEvent, rememberedSession.phone)
  }, [rememberedSession, patient, handleLookup])

  return (
    <div className="patient-page">
      <section className="patient-card patient-card-muted patient-hero">
        <span className="patient-badge">Prescription request</span>
        <h1>Request a refill or review</h1>
        <p className="patient-copy">Start with your registered phone number, then upload a prescription photo for the pharmacist to review.</p>
      </section>

      <section className="patient-card">
        <div className="patient-section-header">
          <div>
            <h2 className="patient-section-title">Step 1: Confirm your phone number</h2>
            <p className="patient-form-help">We will look up your patient profile at this branch.</p>
          </div>
          <span className="patient-inline-icon">
            <UserRound />
          </span>
        </div>

        <form className="patient-form" onSubmit={handleLookup}>
          <div className="patient-form-group">
            <label className="patient-label" htmlFor="lookupPhone">
              Phone number
            </label>
            <input
              id="lookupPhone"
              className="patient-input"
              type="tel"
              inputMode="tel"
              placeholder="07XXXXXXXX"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>

          <button className="patient-button-secondary" type="submit" disabled={isLookingUp}>
            {isLookingUp ? "Checking profile..." : "Find my profile"}
          </button>
        </form>

        {lookupMessage.message ? (
          <div
            className={`patient-message ${
              lookupMessage.type === "error"
                ? "patient-message-error"
                : lookupMessage.type === "success"
                  ? "patient-message-success"
                  : "patient-message-info"
            }`}
          >
            {lookupMessage.message}
            {lookupMessage.type === "info" ? (
              <>
                {" "}
                <Link to={createPatientPath("/patient/register")} style={{ fontWeight: 800, textDecoration: "underline" }}>
                  Register here
                </Link>
                .
              </>
            ) : null}
          </div>
        ) : null}

        {patient ? (
          <div className="patient-list-item">
            <div className="patient-list-header">
              <div>
                <div className="patient-list-title">Welcome back {patient.full_name}</div>
                <div className="patient-list-meta">Patient reference: {patient.phone}</div>
              </div>
              <span className="patient-badge">Verified</span>
            </div>
            <div className="patient-chip-row">
              <span className="patient-chip">
                {patient.chronic_conditions?.trim() ? `Conditions: ${patient.chronic_conditions}` : "No chronic conditions on file"}
              </span>
            </div>
          </div>
        ) : null}
      </section>

      {patient ? (
        <section className="patient-card">
          <div className="patient-section-header">
            <div>
              <h2 className="patient-section-title">Step 2: Submit your request</h2>
              <p className="patient-form-help">Share what you need and upload the prescription image for review.</p>
            </div>
            <span className="patient-inline-icon">
              <ImagePlus />
            </span>
          </div>

          <form className="patient-form" onSubmit={handleSubmit}>
            <div className="patient-form-group">
              <label className="patient-label" htmlFor="conditionNotes">
                Condition notes
              </label>
              <textarea
                id="conditionNotes"
                className="patient-textarea"
                value={conditionNotes}
                onChange={(event) => setConditionNotes(event.target.value)}
                placeholder={
                  patient.chronic_conditions?.trim()
                    ? `Known chronic conditions: ${patient.chronic_conditions}\nDescribe what you are suffering from or why you need this medicine.`
                    : "What are you suffering from / why do you need this medicine?"
                }
              />
            </div>

            <div className="patient-form-group">
              <label className="patient-label" htmlFor="drugRequested">
                Medicine name if known (optional)
              </label>
              <input
                id="drugRequested"
                className="patient-input"
                value={drugRequested}
                onChange={(event) => setDrugRequested(event.target.value)}
                placeholder="Example: Amoxicillin 500mg"
              />
            </div>

            <div className="patient-form-group">
              <label className="patient-label" htmlFor="prescriptionPhoto">
                Prescription photo
              </label>
              <input
                id="prescriptionPhoto"
                className="patient-input"
                type="file"
                accept="image/*"
                onChange={(event) => setPrescriptionFile(event.target.files?.[0] || null)}
              />
              <p className="patient-form-help">Upload a clear image only. It will be stored in the branch’s secure RemedacarePOS space.</p>
            </div>

            {submitMessage.message ? (
              <div
                className={`patient-message ${
                  submitMessage.type === "error" ? "patient-message-error" : "patient-message-success"
                }`}
              >
                {submitMessage.message}
              </div>
            ) : null}

            <button className="patient-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting request..." : "Submit prescription request"}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  )
}
