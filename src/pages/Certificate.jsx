import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { useAuth } from "../context/AuthContext"
import { jsPDF } from "jspdf"

export default function Certificate() {
  const { courseId } = useParams()
  const { user, profile, isAdmin } = useAuth()
  const [cert, setCert] = useState(null)
  const [course, setCourse] = useState(null)
  const [eligible, setEligible] = useState(false)
  const [blockedReason, setBlockedReason] = useState("")
  const [loading, setLoading] = useState(true)
  const [previewMode, setPreviewMode] = useState(false)

  useEffect(() => {
    async function load() {
      if (!user?.id) {
        setLoading(false)
        return
      }

      const { data: courseData } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single()
      setCourse(courseData || null)

      const [{ data: moduleRows }, { data: progressRows }, { data: enrollment }] = await Promise.all([
        supabase.from("course_modules").select("id").eq("course_id", courseId),
        supabase
          .from("course_progress")
          .select("module_id, completed")
          .eq("user_id", user.id)
          .eq("course_id", courseId),
        supabase
          .from("course_enrollments")
          .select("id")
          .eq("user_id", user.id)
          .eq("course_id", courseId)
          .maybeSingle(),
      ])

      const totalModules = (moduleRows || []).length
      const completedModules = new Set(
        (progressRows || [])
          .filter((row) => row.completed)
          .map((row) => row.module_id)
      ).size
      const canIssueCertificate = !!enrollment && totalModules > 0 && completedModules >= totalModules

      setEligible(canIssueCertificate)

      if (isAdmin) {
        setPreviewMode(!canIssueCertificate)
      }

      if (!enrollment && !isAdmin) {
        setBlockedReason("Enroll in this course first to access its certificate.")
        setLoading(false)
        return
      }

      if (!canIssueCertificate && !isAdmin) {
        setBlockedReason(`Finish all ${totalModules || 0} modules before generating your certificate.`)
        setLoading(false)
        return
      }

      let { data: existingCert } = await supabase
        .from("certificates")
        .select("*")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .maybeSingle()

      if (!existingCert && canIssueCertificate) {
        const { data: newCert, error: insertError } = await supabase
          .from("certificates")
          .insert({ user_id: user.id, course_id: courseId })
          .select()
          .single()

        if (insertError) {
          console.error("Certificate insert error:", insertError)
          setBlockedReason(insertError.message || "Unable to generate your certificate right now.")
          setLoading(false)
          return
        }

        existingCert = newCert
      }

      setCert(
        existingCert || (isAdmin
          ? {
              id: `preview-${courseId}`,
              issued_at: new Date().toISOString(),
            }
          : null)
      )
      setLoading(false)
    }

    void load()
  }, [courseId, user?.id, isAdmin])

  function downloadPDF() {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
    const width = doc.internal.pageSize.getWidth()
    const height = doc.internal.pageSize.getHeight()

    doc.setDrawColor(26, 107, 74)
    doc.setLineWidth(4)
    doc.rect(10, 10, width - 20, height - 20)
    doc.setLineWidth(1)
    doc.rect(13, 13, width - 26, height - 26)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(28)
    doc.setTextColor(26, 107, 74)
    doc.text("Certificate of Completion", width / 2, 45, { align: "center" })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(14)
    doc.setTextColor(100, 100, 100)
    doc.text("This certifies that", width / 2, 62, { align: "center" })

    doc.setFont("helvetica", "bold")
    doc.setFontSize(26)
    doc.setTextColor(17, 24, 39)
    doc.text(profile?.full_name || "Pharmacist", width / 2, 80, { align: "center" })

    if (profile?.professional_id) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(11)
      doc.setTextColor(107, 114, 128)
      doc.text(`License No: ${profile.professional_id}`, width / 2, 89, { align: "center" })
    }

    doc.setFont("helvetica", "normal")
    doc.setFontSize(14)
    doc.setTextColor(100, 100, 100)
    doc.text("has successfully completed the course", width / 2, 102, { align: "center" })

    doc.setFont("helvetica", "bold")
    doc.setFontSize(20)
    doc.setTextColor(26, 107, 74)
    doc.text(course?.title || "", width / 2, 118, { align: "center" })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.setTextColor(107, 114, 128)
    doc.text(
      `Date: ${new Date(cert?.issued_at).toLocaleDateString("en-GB", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`,
      width / 2,
      132,
      { align: "center" }
    )
    doc.text(`Certificate ID: ${cert?.id}`, width / 2, 139, { align: "center" })
    doc.text("PharmaCourse - Professional Pharmacy CPD Platform", width / 2, height - 18, {
      align: "center",
    })

    doc.save(`PharmaCourse_Certificate_${profile?.full_name?.replace(/ /g, "_")}.pdf`)
  }

  if (loading) {
    return <div className="page" style={{ color: "var(--text-500)" }}>Loading...</div>
  }

  if (!user) {
    return (
      <div className="page" style={{ maxWidth: 720, textAlign: "center" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: ".75rem" }}>Sign in to view certificates</h1>
        <p style={{ color: "var(--text-500)", marginBottom: "1.5rem" }}>
          Your certificate becomes available after you complete the course while signed in.
        </p>
        <Link to="/login" className="btn btn-primary">Go to Sign In</Link>
      </div>
    )
  }

  if ((!eligible && !isAdmin) || !cert) {
    return (
      <div className="page" style={{ maxWidth: 720, textAlign: "center" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: ".75rem" }}>Certificate not ready yet</h1>
        <p style={{ color: "var(--text-500)", marginBottom: "1.5rem" }}>
          {blockedReason || "Complete the course to unlock your certificate."}
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
          <Link to={`/courses/${course?.slug || courseId}`} className="btn btn-outline">View Course</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page" style={{ maxWidth: 800, textAlign: "center" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: ".5rem" }}>Certificate Ready</h1>
      <p style={{ color: "var(--text-500)", marginBottom: "2.5rem" }}>
        {previewMode ? <>Admin preview for <strong>{course?.title}</strong></> : <>You have completed <strong>{course?.title}</strong></>}
      </p>

      {previewMode && (
        <div style={{ marginBottom: "1.25rem", padding: "0.9rem 1rem", borderRadius: 12, background: "#e8f5f0", border: "1px solid #b8dfd3", color: "#0F6E56", fontSize: ".9rem", fontWeight: 600 }}>
          Admin preview mode - this certificate view is available only to admins before learner completion.
        </div>
      )}

      <div
        style={{
          border: "4px solid var(--green)",
          borderRadius: 12,
          padding: "3rem 2.5rem",
          background: "var(--white)",
          marginBottom: "2rem",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 8,
            border: "1px solid var(--green-mid)",
            borderRadius: 8,
            pointerEvents: "none",
          }}
        />
        <p style={{ color: "var(--text-500)", fontSize: ".9rem", marginBottom: ".75rem" }}>
          Certificate of Completion
        </p>
        <h2 style={{ fontSize: "1.75rem", marginBottom: ".3rem" }}>{profile?.full_name}</h2>
        {profile?.professional_id && (
          <p style={{ color: "var(--text-500)", fontSize: ".85rem", marginBottom: "1rem" }}>
            License No: {profile.professional_id}
          </p>
        )}
        <p style={{ color: "var(--text-500)", marginBottom: ".5rem" }}>has successfully completed</p>
        <h3 style={{ color: "var(--green)", fontSize: "1.3rem", marginBottom: "1.5rem" }}>{course?.title}</h3>
        <p style={{ fontSize: ".82rem", color: "var(--text-500)" }}>
          {new Date(cert?.issued_at).toLocaleDateString("en-GB", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        <p style={{ fontSize: ".75rem", color: "var(--border)", marginTop: ".5rem" }}>ID: {cert?.id}</p>
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
