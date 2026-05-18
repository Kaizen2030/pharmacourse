import { useCallback, useEffect, useRef, useState } from "react"
import { ImagePlus, Plus, ShieldCheck, Trash2 } from "lucide-react"
import { Link } from "react-router-dom"
import { usePatient } from "../../components/PatientLayout"
import { usePatientPortalAuth } from "../../hooks/usePatientPortalAuth"
import { pharmacyosClient } from "../../lib/pharmacyosClient"
import { getPatientPortalSession, savePatientPortalSession } from "../../lib/patientPortalSession"

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, "-").toLowerCase()
}

export default function PatientPrescription() {
  const { pharmacyId, createPatientPath } = usePatient()
  const rememberedSession = getPatientPortalSession(pharmacyId)
  const [patient, setPatient] = useState(null)
  const [lookupMessage, setLookupMessage] = useState({ type: "", message: "" })
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [conditionNotes, setConditionNotes] = useState("")
  const [requestedDrugs, setRequestedDrugs] = useState([""])
  const [prescriptionFile, setPrescriptionFile] = useState(null)
  const [submitMessage, setSubmitMessage] = useState({ type: "", message: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const autoLookupDoneRef = useRef(false)
  const { loading: authLoading, isAuthenticated, patientPhone, fullName } = usePatientPortalAuth()
  const loginPath = createPatientPath("/patient/login")
  const registerPath = createPatientPath("/patient/register")

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

  const handleLookup = useCallback(async () => {
    const normalizedPhone = String(patientPhone || "").trim()

    if (!isAuthenticated) {
      setLookupMessage({ type: "error", message: "Sign in to your patient account before confirming your profile." })
      setPatient(null)
      return
    }

    if (!normalizedPhone) {
      setLookupMessage({ type: "error", message: "Your patient account does not have a linked phone number. Please contact the pharmacy team." })
      setPatient(null)
      return
    }

    setIsLookingUp(true)
    setLookupMessage({ type: "", message: "" })
    setSubmitMessage({ type: "", message: "" })

    const { data, error } = await pharmacyosClient.rpc("public_patient_portal_profile", {
      target_pharmacy_id: pharmacyId,
      target_phone: normalizedPhone,
    })

    if (error) {
      setLookupMessage({ type: "error", message: error?.message || "We could not verify this patient right now." })
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
      message: `Welcome back ${data.patient.full_name}. Your branch profile is ready for prescription requests.`,
    })
    setIsLookingUp(false)
  }, [isAuthenticated, patientPhone, pharmacyId])

  function updateRequestedDrug(index, value) {
    setRequestedDrugs((prev) => prev.map((item, itemIndex) => (itemIndex === index ? value : item)))
  }

  function addRequestedDrug() {
    setRequestedDrugs((prev) => [...prev, ""])
  }

  function removeRequestedDrug(index) {
    setRequestedDrugs((prev) => {
      if (prev.length === 1) return [""]
      return prev.filter((_, itemIndex) => itemIndex !== index)
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!patient) {
      setSubmitMessage({ type: "error", message: "Please confirm your patient profile first." })
      return
    }

    setIsSubmitting(true)
    setSubmitMessage({ type: "", message: "" })

    const normalizedNotes = conditionNotes.trim()
    const normalizedDrugs = requestedDrugs.map((item) => item.trim()).filter(Boolean)

    if (!normalizedNotes && normalizedDrugs.length === 0 && !prescriptionFile) {
      setSubmitMessage({
        type: "error",
        message: "Add a condition note, at least one medicine name, or a prescription photo before submitting.",
      })
      setIsSubmitting(false)
      return
    }

    let prescriptionImageUrl = null

    if (prescriptionFile) {
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
      prescriptionImageUrl = publicUrlData.publicUrl || null
    }

    const { error } = await pharmacyosClient.from("prescription_requests").insert({
      pharmacy_id: pharmacyId,
      branch_id: pharmacyId,
      patient_id: patient.id,
      patient_phone: patient.phone,
      patient_name: patient.full_name,
      condition_notes: normalizedNotes,
      prescription_image_url: prescriptionImageUrl,
      drug_requested: normalizedDrugs.join(", ") || null,
      status: "pending",
    })

    if (error) {
      setSubmitMessage({ type: "error", message: error.message || "We could not submit your request." })
      setIsSubmitting(false)
      return
    }

    setSubmitMessage({
      type: "success",
      message: "Request submitted. The pharmacist will review it and send updates to your signed-in patient account.",
    })
    setRequestedDrugs([""])
    setPrescriptionFile(null)
    setConditionNotes("")
    setIsSubmitting(false)
  }

  useEffect(() => {
    if (autoLookupDoneRef.current) {
      return
    }

    if (authLoading || !isAuthenticated || !patientPhone || patient) {
      return
    }

    autoLookupDoneRef.current = true
    void handleLookup()
  }, [authLoading, isAuthenticated, patientPhone, patient, handleLookup])

  return (
    <div className="patient-page">
      <section className="patient-card patient-card-muted patient-hero">
        <span className="patient-badge">Prescription request</span>
        <h1>Request a refill or review</h1>
        <p className="patient-copy">Sign in once, tell the pharmacist what you need, add one or more medicines if you know them, and upload a prescription only when you have one.</p>
      </section>

      <section className="patient-card">
        <div className="patient-section-header">
          <div>
            <h2 className="patient-section-title">{patient ? "Patient account ready" : "Step 1: Confirm your patient account"}</h2>
            <p className="patient-form-help">
              {patient
                ? "You are already signed in and linked to this branch profile."
                : "We will look up your patient profile at this branch using the phone number linked to your account."}
            </p>
          </div>
          <span className="patient-inline-icon">
            <ShieldCheck />
          </span>
        </div>

        {authLoading ? <div className="patient-form-help">Loading your patient account...</div> : null}

        {!authLoading && !isAuthenticated ? (
          <div className="patient-empty-state">
            <p className="patient-form-help" style={{ margin: 0 }}>
              Sign in first so this page can load only your own patient profile.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.7rem" }}>
              <Link to={loginPath} className="patient-button" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                Sign in to continue
              </Link>
              <Link to={registerPath} className="patient-button-secondary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                Create my account
              </Link>
            </div>
          </div>
        ) : null}

        {!authLoading && isAuthenticated ? (
          <div className="patient-auth-status">
            <p className="patient-form-help" style={{ margin: 0 }}>
              Signed in as <strong>{fullName || rememberedSession?.fullName || "Patient account"}</strong>{patientPhone ? ` on ${patientPhone}` : ""}.
            </p>
            <div className="patient-inline-actions">
              <button className="patient-button-secondary patient-button-inline" type="button" onClick={() => void handleLookup()} disabled={isLookingUp}>
                {isLookingUp ? "Checking profile..." : patient ? "Refresh profile" : "Load my profile"}
              </button>
            </div>
          </div>
        ) : null}

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
                <Link to={registerPath} style={{ fontWeight: 800, textDecoration: "underline" }}>
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
              <p className="patient-form-help">Share what you need below. A prescription image is helpful, but not required.</p>
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
              <div className="patient-section-header patient-section-header-tight">
                <div>
                  <label className="patient-label" htmlFor="drugRequested0">
                    Medicines needed if known
                  </label>
                  <p className="patient-form-help">Add one or more medicine names if you know them.</p>
                </div>
                <button className="patient-button-secondary patient-button-inline" type="button" onClick={addRequestedDrug}>
                  <Plus size={16} />
                  Add drug
                </button>
              </div>

              <div className="patient-drug-stack">
                {requestedDrugs.map((drug, index) => (
                  <div key={`requested-drug-${index}`} className="patient-drug-row">
                    <input
                      id={`drugRequested${index}`}
                      className="patient-input"
                      value={drug}
                      onChange={(event) => updateRequestedDrug(index, event.target.value)}
                      placeholder={index === 0 ? "Example: Amoxicillin 500mg" : `Medicine ${index + 1}`}
                    />
                    <button
                      className="patient-button-secondary patient-button-inline patient-drug-remove"
                      type="button"
                      onClick={() => removeRequestedDrug(index)}
                      disabled={requestedDrugs.length === 1}
                      aria-label={`Remove medicine ${index + 1}`}
                    >
                      <Trash2 size={16} />
                      <span>Remove</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="patient-form-group">
              <label className="patient-label" htmlFor="prescriptionPhoto">
                Prescription photo (optional)
              </label>
              <input
                id="prescriptionPhoto"
                className="patient-input"
                type="file"
                accept="image/*"
                onChange={(event) => setPrescriptionFile(event.target.files?.[0] || null)}
              />
              <p className="patient-form-help">Upload a clear image only if you have one. It will be stored in the branch's secure RemedacarePOS space.</p>
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
