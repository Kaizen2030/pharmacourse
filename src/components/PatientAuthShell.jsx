import { useEffect, useState } from "react"
import { Building2 } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { PatientPortalStyles } from "./PatientLayout"
import { fetchPatientPortalPharmacyById } from "../lib/patientPortalDirectory"
import { buildSupabaseAccessBlockedCopy, isSupabaseAccessBlocked } from "../lib/supabaseAccess"
export default function PatientAuthShell({ badge, title, description, children, footer }) {
  const [searchParams] = useSearchParams()
  const pharmacyId = searchParams.get("pharmacy")?.trim() || ""
  const branchNameParam = searchParams.get("branch_name")?.trim() || ""
  const branchLocationParam = searchParams.get("branch_location")?.trim() || ""
  const [pharmacy, setPharmacy] = useState(null)
  const [isLoading, setIsLoading] = useState(Boolean(pharmacyId))
  const [loadError, setLoadError] = useState("")
  const isAccessBlocked = isSupabaseAccessBlocked({ message: loadError })
  const blockedCopy = isAccessBlocked
    ? buildSupabaseAccessBlockedCopy({
        sourceLabel: "This patient page",
        objectLabel: "branch details",
        error: { message: loadError },
      })
    : null

  useEffect(() => {
    if (!pharmacyId) {
      setPharmacy(null)
      setLoadError("")
      setIsLoading(false)
      return
    }

    let ignore = false

    async function fetchPharmacy() {
      setIsLoading(true)
      setLoadError("")

      const { data, error } = await fetchPatientPortalPharmacyById(pharmacyId)

      if (ignore) {
        return
      }

      if (error) {
        setPharmacy(null)
        setLoadError(error.message || "We could not load the branch details.")
      } else {
        setPharmacy(data)
      }

      setIsLoading(false)
    }

    void fetchPharmacy()

    return () => {
      ignore = true
    }
  }, [pharmacyId])

  const branchName = pharmacy?.name || branchNameParam || "Patient Portal"
  const branchLocation = pharmacy?.location || pharmacy?.town || pharmacy?.subcounty || pharmacy?.county || branchLocationParam || ""

  return (
    <div className="patient-shell">
      <PatientPortalStyles />

      <header className="patient-topbar">
        <div className="patient-topbar-copy">
          <span className="patient-topbar-label">
            <Building2 />
            {pharmacyId ? "Branch portal" : "Patient account"}
          </span>
          <div className="patient-topbar-name">{branchName}</div>
          {branchLocation ? <div className="patient-topbar-meta">{branchLocation}</div> : null}
        </div>

        <div className="patient-powered">Powered by PharmaCourse</div>
      </header>

      <main className="patient-main">
        {isLoading ? (
          <section className="patient-card patient-card-muted patient-hero">
            <span className="patient-badge">Loading branch</span>
            <h1>Preparing your patient account</h1>
            <p className="patient-copy">We are loading the branch details for this secure portal.</p>
          </section>
        ) : null}

        {!isLoading ? (
          <div className="patient-page">
            {loadError ? (
              <div className="patient-message patient-message-error">
                The branch details could not be refreshed{isAccessBlocked ? " because Supabase access is blocked" : ""}: {loadError}
                {isAccessBlocked && blockedCopy?.hint ? <div>{blockedCopy.hint}</div> : null}
              </div>
            ) : null}

            <section className="patient-card patient-card-muted patient-hero">
              {badge ? <span className="patient-badge">{badge}</span> : null}
              <h1>{title}</h1>
              <p className="patient-copy">{description}</p>
            </section>

            {children}

            {footer ? <section className="patient-card">{footer}</section> : null}
          </div>
        ) : null}
      </main>
    </div>
  )
}
