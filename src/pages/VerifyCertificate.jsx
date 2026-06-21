import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import SEO from "../components/SEO"

export default function VerifyCertificate() {
  const { certificateId } = useParams()
  const [loading, setLoading] = useState(true)
  const [record, setRecord] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadCertificate() {
      if (!certificateId) {
        setError("Certificate ID is missing.")
        setLoading(false)
        return
      }

      setLoading(true)
      setError("")

      const { data, error: rpcError } = await supabase.rpc("verify_certificate", {
        cert_id: certificateId,
      })

      if (rpcError) {
        setError(rpcError.message || "Unable to verify this certificate right now.")
        setRecord(null)
      } else if (!data || data.length === 0) {
        setError("Certificate not found or no longer valid.")
        setRecord(null)
      } else {
        setRecord(data[0])
      }

      setLoading(false)
    }

    void loadCertificate()
  }, [certificateId])

  function formatDate(dateStr) {
    if (!dateStr) return "Unknown"
    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) return "Unknown"
    return date.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <SEO
        title="Certificate Verification"
        description="Verify a RemedacarePOS certificate using its certificate ID."
        path={`/verify/${certificateId || ""}`}
        noindex
      />

      <div
        style={{
          background: "linear-gradient(180deg, #f7fcf9 0%, #ffffff 100%)",
          border: "1px solid #dbe9e2",
          borderRadius: 28,
          padding: "2.5rem",
          boxShadow: "0 18px 48px rgba(15,110,86,0.08)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.6rem",
              background: "#edf8f3",
              border: "1px solid #cfe7dc",
              borderRadius: 999,
              padding: "0.55rem 1rem",
              color: "#0f6e56",
              fontWeight: 700,
              fontSize: "0.9rem",
              marginBottom: "1rem",
            }}
          >
            <img src="/favicon.svg" alt="RemedacarePOS logo" style={{ width: 28, height: 28, borderRadius: 8 }} />
            RemedacarePOS Verification
          </div>
          <h1 style={{ margin: "0 0 0.65rem", fontSize: "2.2rem" }}>Certificate Verification</h1>
          <p style={{ margin: 0, color: "var(--text-500)" }}>
            Confirm whether this RemedacarePOS certificate is genuine.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "var(--text-500)", padding: "2rem 0" }}>
            Checking certificate...
          </div>
        ) : record ? (
          <div style={{ display: "grid", gap: "1.5rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                flexWrap: "wrap",
                background: "#f4fbf7",
                border: "1px solid #d4eadf",
                borderRadius: 20,
                padding: "1.2rem 1.3rem",
              }}
            >
              <div>
                <div style={{ fontSize: "0.78rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#607068", fontWeight: 700, marginBottom: "0.25rem" }}>
                  Verification Status
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f6e56" }}>
                  Valid Certificate
                </div>
              </div>
              <div
                style={{
                  background: "#0f6e56",
                  color: "#ffffff",
                  borderRadius: 999,
                  padding: "0.65rem 1rem",
                  fontWeight: 700,
                }}
              >
                Verified
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e3ece7",
                borderRadius: 22,
                padding: "1.6rem",
                display: "grid",
                gap: "1.25rem",
              }}
            >
              <div>
                <div style={{ fontSize: "0.76rem", textTransform: "uppercase", letterSpacing: "0.14em", color: "#607068", fontWeight: 700, marginBottom: "0.3rem" }}>
                  Learner
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#11231d", lineHeight: 1.1 }}>
                  {record.learner_name || "Unknown learner"}
                </div>
                {record.professional_id && (
                  <div style={{ marginTop: "0.45rem", color: "#607068" }}>
                    Professional ID: {record.professional_id}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: "0.76rem", textTransform: "uppercase", letterSpacing: "0.14em", color: "#607068", fontWeight: 700, marginBottom: "0.3rem" }}>
                  Course
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0f6e56", lineHeight: 1.4 }}>
                  {record.course_title || "Untitled course"}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "1rem",
                }}
              >
                <div style={{ background: "#f8fbf9", border: "1px solid #e7f0eb", borderRadius: 16, padding: "1rem" }}>
                  <div style={{ fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.14em", color: "#607068", fontWeight: 700, marginBottom: "0.35rem" }}>
                    Date Issued
                  </div>
                  <div style={{ fontWeight: 700, color: "#11231d" }}>{formatDate(record.issued_date || record.issued_at)}</div>
                </div>
                <div style={{ background: "#f8fbf9", border: "1px solid #e7f0eb", borderRadius: 16, padding: "1rem" }}>
                  <div style={{ fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.14em", color: "#607068", fontWeight: 700, marginBottom: "0.35rem" }}>
                    Certificate ID
                  </div>
                  <div style={{ fontWeight: 700, color: "#11231d", wordBreak: "break-all" }}>{record.certificate_id}</div>
                </div>
              </div>
            </div>

            <div style={{ textAlign: "center", color: "var(--text-500)" }}>
              This certificate record matches a valid course completion in RemedacarePOS.
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "1rem 0 0" }}>
            <div
              style={{
                margin: "0 auto 1rem",
                width: 74,
                height: 74,
                borderRadius: 999,
                background: "#fef2f2",
                color: "#b91c1c",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
                fontSize: "1.8rem",
              }}
            >
              !
            </div>
            <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.7rem" }}>Certificate not verified</h2>
            <p style={{ margin: "0 0 1.4rem", color: "var(--text-500)" }}>
              {error || "This certificate could not be verified."}
            </p>
          </div>
        )}

        <div style={{ marginTop: "2rem", textAlign: "center" }}>
          <Link to="/" className="btn btn-outline">Back to RemedacarePOS</Link>
        </div>
      </div>
    </div>
  )
}
