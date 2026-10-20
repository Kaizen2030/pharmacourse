import { ArrowLeft, Loader2, ShieldCheck, Video } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"
import ConsultRoom from "../../components/consult/ConsultRoom"
import { usePatient } from "../../components/PatientLayout"
import { usePatientPortalAuth } from "../../hooks/usePatientPortalAuth"
import { pharmacyosClient } from "../../lib/pharmacyosClient"
import "./PatientConsult.css"

export default function PatientConsult() {
  const { appointmentId } = useParams()
  const navigate = useNavigate()
  const { createPatientPath, branchName } = usePatient()
  const { loading, isAuthenticated } = usePatientPortalAuth()
  const loginPath = createPatientPath("/patient/login")
  const trackPath = createPatientPath("/patient/track", { section: "appointments" })

  if (loading) {
    return (
      <section className="patient-card patient-card-muted patient-consult-gate">
        <Loader2 className="patient-spinner" />
        <h1>Checking your patient session</h1>
        <p>We are preparing the secure consultation room.</p>
      </section>
    )
  }

  if (!isAuthenticated) {
    return (
      <section className="patient-card patient-card-muted patient-consult-gate">
        <ShieldCheck />
        <span className="patient-kicker">Secure video consultation</span>
        <h1>Sign in to join this appointment</h1>
        <p>Your appointment is protected. Sign in with the patient account that booked it.</p>
        <Link className="patient-button" to={loginPath}>Sign in</Link>
      </section>
    )
  }

  if (!appointmentId) {
    return (
      <section className="patient-card patient-card-muted patient-consult-gate">
        <Video />
        <h1>Consultation link missing</h1>
        <Link className="patient-button-secondary" to={trackPath}>Back to appointments</Link>
      </section>
    )
  }

  return (
    <section className="patient-consult-page">
      <div className="patient-consult-heading">
        <div>
          <Link className="patient-subtle-link" to={trackPath}><ArrowLeft size={16} /> Back to appointments</Link>
          <span className="patient-kicker">{branchName}</span>
          <h1>Private video consultation</h1>
          <p>Allow camera and microphone access when prompted. This room does not record the call.</p>
        </div>
        <ShieldCheck aria-hidden="true" />
      </div>
      <ConsultRoom
        role="patient"
        appointmentId={appointmentId}
        supabase={pharmacyosClient}
        onLeave={() => navigate(trackPath)}
      />
    </section>
  )
}
