import { useEffect, useState, useRef } from "react"
import { useParams, Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { useAuth } from "../context/AuthContext"
import { jsPDF } from "jspdf"
import QRCode from "qrcode"

export default function Certificate() {
  const { courseId } = useParams()
  const { user, profile } = useAuth()
  const [cert, setCert] = useState(null)
  const [course, setCourse] = useState(null)
  const [eligible, setEligible] = useState(false)
  const [blockedReason, setBlockedReason] = useState("")
  const [loading, setLoading] = useState(true)
  const [qrDataUrl, setQrDataUrl] = useState("")
  const certRef = useRef(null)

  useEffect(() => {
    async function load() {
      if (!user?.id) { setLoading(false); return }

      const { data: courseData } = await supabase
        .from("courses").select("*").eq("id", courseId).single()
      setCourse(courseData || null)

      const [{ data: moduleRows }, { data: progressRows }, { data: enrollment }] = await Promise.all([
        supabase.from("course_modules").select("id").eq("course_id", courseId),
        supabase.from("course_progress").select("module_id, completed").eq("user_id", user.id).eq("course_id", courseId),
        supabase.from("course_enrollments").select("id").eq("user_id", user.id).eq("course_id", courseId).maybeSingle(),
      ])

      const totalModules = (moduleRows || []).length
      const completedModules = new Set(
        (progressRows || []).filter((r) => r.completed).map((r) => r.module_id)
      ).size
      const canIssueCertificate = !!enrollment && totalModules > 0 && completedModules >= totalModules

      setEligible(canIssueCertificate)

      if (!enrollment) { setBlockedReason("Enroll in this course first to access its certificate."); setLoading(false); return }
      if (!canIssueCertificate) { setBlockedReason(`Finish all ${totalModules || 0} modules before generating your certificate.`); setLoading(false); return }

      let { data: existingCert } = await supabase
        .from("certificates").select("*").eq("user_id", user.id).eq("course_id", courseId).maybeSingle()

      if (!existingCert) {
        const { data: newCert, error: insertError } = await supabase
          .from("certificates").insert({ user_id: user.id, course_id: courseId }).select().single()
        if (insertError) { setBlockedReason(insertError.message || "Unable to generate certificate."); setLoading(false); return }
        existingCert = newCert
      }

      setCert(existingCert || null)

      // Generate QR code pointing to verification URL
      if (existingCert?.id) {
        const verifyUrl = `https://www.pharmacourse.co.ke/verify/${existingCert.id}`
        const qr = await QRCode.toDataURL(verifyUrl, { width: 120, margin: 1, color: { dark: "#0f6e56", light: "#ffffff" } })
        setQrDataUrl(qr)
      }

      setLoading(false)
    }
    void load()
  }, [courseId, user?.id])

  function formatDate(dateStr) {
    if (!dateStr) return new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })
    return d.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })
  }

  async function downloadPDF() {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
    const W = doc.internal.pageSize.getWidth()
    const H = doc.internal.pageSize.getHeight()

    // Background
    doc.setFillColor(252, 252, 250)
    doc.rect(0, 0, W, H, "F")

    // Outer border
    doc.setDrawColor(15, 110, 86)
    doc.setLineWidth(3.5)
    doc.rect(8, 8, W - 16, H - 16)

    // Inner border
    doc.setLineWidth(0.8)
    doc.setDrawColor(200, 231, 218)
    doc.rect(12, 12, W - 24, H - 24)

    // Green header band
    doc.setFillColor(15, 110, 86)
    doc.rect(8, 8, W - 16, 18, "F")

    // Logo text in header
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(255, 255, 255)
    doc.text("PHARMACOURSE", W / 2, 19, { align: "center" })

    // Subtitle in header
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(159, 225, 203)
    doc.text("Professional Pharmacy CPD Platform · Kenya", W / 2, 24, { align: "center" })

    // Certificate title
    doc.setFont("helvetica", "bold")
    doc.setFontSize(24)
    doc.setTextColor(15, 110, 86)
    doc.text("Certificate of Completion", W / 2, 50, { align: "center" })

    // Decorative line
    doc.setDrawColor(200, 231, 218)
    doc.setLineWidth(0.5)
    doc.line(W / 2 - 60, 55, W / 2 + 60, 55)

    // This certifies
    doc.setFont("helvetica", "normal")
    doc.setFontSize(12)
    doc.setTextColor(96, 112, 104)
    doc.text("This certifies that", W / 2, 66, { align: "center" })

    // Learner name
    doc.setFont("helvetica", "bold")
    doc.setFontSize(28)
    doc.setTextColor(17, 35, 29)
    doc.text(profile?.full_name || "Pharmacist", W / 2, 82, { align: "center" })

    // License number
    if (profile?.professional_id) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.setTextColor(96, 112, 104)
      doc.text(`License / Professional ID: ${profile.professional_id}`, W / 2, 90, { align: "center" })
    }

    // Completed text
    doc.setFont("helvetica", "normal")
    doc.setFontSize(12)
    doc.setTextColor(96, 112, 104)
    doc.text("has successfully completed the course", W / 2, 102, { align: "center" })

    // Course title
    doc.setFont("helvetica", "bold")
    doc.setFontSize(17)
    doc.setTextColor(15, 110, 86)
    const titleLines = doc.splitTextToSize(course?.title || "", W - 80)
    doc.text(titleLines, W / 2, 114, { align: "center" })

    // Date and cert ID
    const dateY = 114 + titleLines.length * 8 + 6
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(96, 112, 104)
    doc.text(`Date of Issue: ${formatDate(cert?.issued_at)}`, W / 2, dateY, { align: "center" })
    doc.text(`Certificate ID: ${cert?.id}`, W / 2, dateY + 7, { align: "center" })

    // Signature line (left side)
    const sigY = H - 30
    doc.setDrawColor(17, 35, 29)
    doc.setLineWidth(0.5)
    doc.line(30, sigY, 95, sigY)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(96, 112, 104)
    doc.text("Julius Wanjau", 62, sigY + 5, { align: "center" })
    doc.text("Director, PharmaCourse", 62, sigY + 10, { align: "center" })

    // QR code (right side)
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, "PNG", W - 50, sigY - 18, 28, 28)
      doc.setFontSize(7)
      doc.setTextColor(96, 112, 104)
      doc.text("Scan to verify", W - 36, sigY + 12, { align: "center" })
    }

    // Footer
    doc.setFontSize(8)
    doc.setTextColor(147, 160, 152)
    doc.text("PharmaCourse · Professional Pharmacy CPD Platform · www.pharmacourse.co.ke", W / 2, H - 14, { align: "center" })

    doc.save(`PharmaCourse_Certificate_${(profile?.full_name || "Certificate").replace(/ /g, "_")}.pdf`)
  }

  if (loading) return <div className="page" style={{ color: "var(--text-500)" }}>Loading...</div>

  if (!user) {
    return (
      <div className="page" style={{ maxWidth: 720, textAlign: "center" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: ".75rem" }}>Sign in to view certificates</h1>
        <p style={{ color: "var(--text-500)", marginBottom: "1.5rem" }}>Your certificate becomes available after completing the course while signed in.</p>
        <Link to="/login" className="btn btn-primary">Go to Sign In</Link>
      </div>
    )
  }

  if (!eligible || !cert) {
    return (
      <div className="page" style={{ maxWidth: 720, textAlign: "center" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: ".75rem" }}>Certificate not ready yet</h1>
        <p style={{ color: "var(--text-500)", marginBottom: "1.5rem" }}>{blockedReason || "Complete the course to unlock your certificate."}</p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
          <Link to={`/courses/${course?.slug || courseId}`} className="btn btn-outline">View Course</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page" style={{ maxWidth: 860, textAlign: "center" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: ".5rem" }}>Certificate Ready</h1>
      <p style={{ color: "var(--text-500)", marginBottom: "2.5rem" }}>
        You have completed <strong>{course?.title}</strong>
      </p>

      {/* Certificate preview */}
      <div ref={certRef} style={{
        border: "4px solid #0f6e56",
        borderRadius: 14,
        background: "#fcfcfa",
        marginBottom: "2rem",
        overflow: "hidden",
        boxShadow: "0 8px 40px rgba(15,110,86,0.10)",
      }}>
        {/* Green header */}
        <div style={{ background: "#0f6e56", padding: "1rem 2rem", textAlign: "center" }}>
          <div style={{ color: "#9FE1CB", fontSize: "0.7rem", fontWeight: 800, letterSpacing: "2px", marginBottom: 4 }}>PHARMACOURSE</div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.72rem" }}>Professional Pharmacy CPD Platform · Kenya</div>
        </div>

        {/* Inner border */}
        <div style={{ margin: "0 12px", borderLeft: "1px solid #c8e7da", borderRight: "1px solid #c8e7da" }}>
          <div style={{ padding: "2.5rem 3rem" }}>
            <div style={{ color: "#0f6e56", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "2px", marginBottom: "1rem" }}>CERTIFICATE OF COMPLETION</div>

            <div style={{ width: 60, height: 2, background: "#c8e7da", margin: "0 auto 1.5rem" }} />

            <p style={{ color: "#607068", fontSize: "0.95rem", marginBottom: "0.75rem" }}>This certifies that</p>

            <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "#11231d", marginBottom: "0.3rem" }}>
              {profile?.full_name || "Pharmacist"}
            </h2>

            {profile?.professional_id && (
              <p style={{ color: "#607068", fontSize: "0.82rem", marginBottom: "1rem" }}>
                License / Professional ID: {profile.professional_id}
              </p>
            )}

            <p style={{ color: "#607068", marginBottom: "0.5rem" }}>has successfully completed the course</p>

            <h3 style={{ color: "#0f6e56", fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.5rem", maxWidth: 560, margin: "0 auto 1.5rem" }}>
              {course?.title}
            </h3>

            {/* Date, signature and QR row */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: "2rem", padding: "1.5rem 1rem 0", borderTop: "1px solid #e9f7f1" }}>

              {/* Signature */}
              <div style={{ textAlign: "center" }}>
                <div style={{ borderTop: "1.5px solid #11231d", paddingTop: "0.5rem", width: 160 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#11231d" }}>Julius Wanjau</div>
                  <div style={{ fontSize: "0.75rem", color: "#607068" }}>Director, PharmaCourse</div>
                </div>
              </div>

              {/* Date + cert ID center */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.85rem", color: "#607068", marginBottom: "0.3rem" }}>
                  Date of Issue: <strong style={{ color: "#11231d" }}>{formatDate(cert?.issued_at)}</strong>
                </div>
                <div style={{ fontSize: "0.7rem", color: "#93a098" }}>Certificate ID: {cert?.id}</div>
              </div>

              {/* QR Code */}
              <div style={{ textAlign: "center" }}>
                {qrDataUrl ? (
                  <>
                    <img src={qrDataUrl} alt="Verification QR" style={{ width: 80, height: 80, display: "block", margin: "0 auto 4px" }} />
                    <div style={{ fontSize: "0.65rem", color: "#607068" }}>Scan to verify</div>
                  </>
                ) : (
                  <div style={{ width: 80, height: 80, background: "#f0faf5", borderRadius: 6 }} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer band */}
        <div style={{ background: "#f7f8f7", padding: "0.75rem", borderTop: "1px solid #e9f7f1", textAlign: "center" }}>
          <div style={{ fontSize: "0.72rem", color: "#93a098" }}>PharmaCourse · Professional Pharmacy CPD Platform · www.pharmacourse.co.ke</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={downloadPDF} className="btn btn-primary" style={{ padding: ".7rem 1.75rem" }}>
          Download PDF Certificate
        </button>
        <Link to="/dashboard" className="btn btn-outline" style={{ padding: ".7rem 1.75rem" }}>
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
