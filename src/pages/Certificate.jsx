import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { useAuth } from "../context/AuthContext"
import { jsPDF } from "jspdf"

export default function Certificate() {
  const { courseId } = useParams()
  const { user, profile } = useAuth()
  const [cert, setCert] = useState(null)
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: c } = await supabase.from("courses").select("*").eq("id", courseId).single()
      setCourse(c)

      // Check/create certificate
      let { data: existing } = await supabase.from("certificates").select("*").eq("user_id", user.id).eq("course_id", courseId).single()
      if (!existing) {
        const { data: newCert } = await supabase.from("certificates").insert({ user_id: user.id, course_id: courseId }).select().single()
        existing = newCert
      }
      setCert(existing)
      setLoading(false)
    }
    load()
  }, [courseId, user])

  function downloadPDF() {
    const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" })
    const W = doc.internal.pageSize.getWidth()
    const H = doc.internal.pageSize.getHeight()

    // Border
    doc.setDrawColor(26,107,74)
    doc.setLineWidth(4)
    doc.rect(10, 10, W-20, H-20)
    doc.setLineWidth(1)
    doc.rect(13, 13, W-26, H-26)

    // Title
    doc.setFont("helvetica","bold")
    doc.setFontSize(28)
    doc.setTextColor(26,107,74)
    doc.text("Certificate of Completion", W/2, 45, { align:"center" })

    doc.setFont("helvetica","normal")
    doc.setFontSize(14)
    doc.setTextColor(100,100,100)
    doc.text("This certifies that", W/2, 62, { align:"center" })

    doc.setFont("helvetica","bold")
    doc.setFontSize(26)
    doc.setTextColor(17,24,39)
    doc.text(profile?.full_name || "Pharmacist", W/2, 80, { align:"center" })

    if (profile?.professional_id) {
      doc.setFont("helvetica","normal")
      doc.setFontSize(11)
      doc.setTextColor(107,114,128)
      doc.text(`License No: ${profile.professional_id}`, W/2, 89, { align:"center" })
    }

    doc.setFont("helvetica","normal")
    doc.setFontSize(14)
    doc.setTextColor(100,100,100)
    doc.text("has successfully completed the course", W/2, 102, { align:"center" })

    doc.setFont("helvetica","bold")
    doc.setFontSize(20)
    doc.setTextColor(26,107,74)
    doc.text(course?.title || "", W/2, 118, { align:"center" })

    doc.setFont("helvetica","normal")
    doc.setFontSize(11)
    doc.setTextColor(107,114,128)
    doc.text(`Date: ${new Date(cert?.issued_at).toLocaleDateString("en-GB", { year:"numeric",month:"long",day:"numeric" })}`, W/2, 132, { align:"center" })
    doc.text(`Certificate ID: ${cert?.id}`, W/2, 139, { align:"center" })
    doc.text("PharmaCourse — Professional Pharmacy CPD Platform", W/2, H-18, { align:"center" })

    doc.save(`PharmaCourse_Certificate_${profile?.full_name?.replace(/ /g,"_")}.pdf`)
  }

  if (loading) return <div className="page" style={{ color:"var(--text-500)" }}>Loading…</div>

  return (
    <div className="page" style={{ maxWidth:800, textAlign:"center" }}>
      <h1 style={{ fontSize:"2rem", marginBottom:" .5rem" }}>🏆 Congratulations!</h1>
      <p style={{ color:"var(--text-500)", marginBottom:"2.5rem" }}>You have completed <strong>{course?.title}</strong></p>

      {/* Certificate preview */}
      <div style={{
        border:"4px solid var(--green)", borderRadius:12, padding:"3rem 2.5rem",
        background:"var(--white)", marginBottom:"2rem", position:"relative"
      }}>
        <div style={{ position:"absolute", inset:8, border:"1px solid var(--green-mid)", borderRadius:8, pointerEvents:"none" }} />
        <p style={{ color:"var(--text-500)", fontSize:" .9rem", marginBottom:" .75rem" }}>Certificate of Completion</p>
        <h2 style={{ fontSize:"1.75rem", marginBottom:" .3rem" }}>{profile?.full_name}</h2>
        {profile?.professional_id && <p style={{ color:"var(--text-500)", fontSize:" .85rem", marginBottom:"1rem" }}>License No: {profile.professional_id}</p>}
        <p style={{ color:"var(--text-500)", marginBottom:" .5rem" }}>has successfully completed</p>
        <h3 style={{ color:"var(--green)", fontSize:"1.3rem", marginBottom:"1.5rem" }}>{course?.title}</h3>
        <p style={{ fontSize:" .82rem", color:"var(--text-500)" }}>
          {new Date(cert?.issued_at).toLocaleDateString("en-GB", { year:"numeric",month:"long",day:"numeric" })}
        </p>
        <p style={{ fontSize:" .75rem", color:"var(--border)", marginTop:" .5rem" }}>ID: {cert?.id}</p>
      </div>

      <div style={{ display:"flex", gap:"1rem", justifyContent:"center" }}>
        <button onClick={downloadPDF} className="btn btn-primary" style={{ padding:" .7rem 1.75rem" }}>
          ⬇ Download PDF Certificate
        </button>
        <Link to="/dashboard" className="btn btn-outline" style={{ padding:" .7rem 1.75rem" }}>
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
