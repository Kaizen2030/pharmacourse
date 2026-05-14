import { useEffect, useState, useRef } from "react"
import { useParams, Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { useAuth } from "../context/AuthContext"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"
import QRCode from "qrcode"
import { DEFAULT_CERTIFICATE_SETTINGS, normalizeCertificateSettings } from "../lib/certificateSettings"

export default function Certificate() {
  const { courseId } = useParams()
  const { user, profile } = useAuth()
  const [cert, setCert] = useState(null)
  const [course, setCourse] = useState(null)
  const [eligible, setEligible] = useState(false)
  const [blockedReason, setBlockedReason] = useState("")
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [settings, setSettings] = useState(DEFAULT_CERTIFICATE_SETTINGS)
  const certRef = useRef(null)

  const isAdmin = profile?.role === "admin"

  useEffect(() => {
    async function load() {
      if (!user?.id) {
        setLoading(false)
        return
      }

      setLoading(true)
      setBlockedReason("")

      const [{ data: courseData }, { data: settingsRow }] = await Promise.all([
        supabase.from("courses").select("*").eq("id", courseId).single(),
        supabase.from("certificate_settings").select("*").eq("id", 1).maybeSingle(),
      ])

      setCourse(courseData || null)
      setSettings(normalizeCertificateSettings(settingsRow))

      const [{ data: moduleRows }, { data: progressRows }, { data: enrollment }] = await Promise.all([
        supabase.from("course_modules").select("id").eq("course_id", courseId),
        supabase.from("course_progress").select("module_id, completed").eq("user_id", user.id).eq("course_id", courseId),
        supabase.from("course_enrollments").select("id").eq("user_id", user.id).eq("course_id", courseId).maybeSingle(),
      ])

      const totalModules = (moduleRows || []).length
      const completedModules = new Set(
        (progressRows || []).filter((row) => row.completed).map((row) => row.module_id)
      ).size
      const canIssueCertificate = isAdmin || (!!enrollment && totalModules > 0 && completedModules >= totalModules)

      setEligible(canIssueCertificate)

      if (!isAdmin && !enrollment) {
        setBlockedReason("Enroll in this course first to access its certificate.")
        setLoading(false)
        return
      }

      if (!isAdmin && !canIssueCertificate) {
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

      if (!existingCert) {
        const { data: newCert, error: insertError } = await supabase
          .from("certificates")
          .insert({ user_id: user.id, course_id: courseId })
          .select()
          .single()

        if (insertError) {
          setBlockedReason(insertError.message || "Unable to generate certificate.")
          setLoading(false)
          return
        }

        existingCert = newCert
      }

      setCert(existingCert || null)

      if (existingCert?.id) {
        const verifyUrl = `https://www.pharmacourse.co.ke/verify/${existingCert.id}`
        const qr = await QRCode.toDataURL(verifyUrl, {
          width: 140,
          margin: 1,
          color: { dark: "#0f6e56", light: "#ffffff" },
        })
        setQrDataUrl(qr)
      }

      setLoading(false)
    }

    void load()
  }, [courseId, isAdmin, user?.id])

  function formatDate(dateStr) {
    if (!dateStr) {
      return new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })
    }

    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) {
      return new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })
    }

    return date.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })
  }

  async function downloadPDF() {
    if (!certRef.current) return

    setDownloading(true)

    try {
      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      })

      const imageData = canvas.toDataURL("image/png")
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
      const width = doc.internal.pageSize.getWidth()
      const height = doc.internal.pageSize.getHeight()

      doc.addImage(imageData, "PNG", 0, 0, width, height)
      doc.save(`PharmaCourse_Certificate_${(profile?.full_name || "Certificate").replace(/ /g, "_")}.pdf`)
    } finally {
      setDownloading(false)
    }
  }

  const dots = Array.from({ length: 36 })
  const issuedDate = formatDate(cert?.issued_at)
  const logoUrl = "/favicon.svg"

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
        <h1 style={{ fontSize: "2rem", marginBottom: ".75rem" }}>{isAdmin ? "Certificate preview not ready" : "Certificate not ready yet"}</h1>
        <p style={{ color: "var(--text-500)", marginBottom: "1.5rem" }}>
          {blockedReason || (isAdmin ? "Open this page from a course preview to generate the certificate shell." : "Complete the course to unlock your certificate.")}
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
          <Link to={`/courses/${course?.slug || courseId}`} className="btn btn-outline">View Course</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page" style={{ maxWidth: 1280 }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: ".5rem" }}>{isAdmin ? "Certificate Preview" : "Certificate Ready"}</h1>
        <p style={{ color: "var(--text-500)", marginBottom: 0 }}>
          {isAdmin ? "Admin preview mode lets you review the final certificate design before learners earn it." : <>You have completed <strong>{course?.title}</strong></>}
        </p>
      </div>

      <div
        ref={certRef}
        style={{
          background: "#ffffff",
          border: "2px solid #0f6e56",
          borderRadius: 26,
          boxShadow: "0 24px 60px rgba(15,110,86,0.14)",
          overflow: "hidden",
          aspectRatio: "1.414 / 1",
          display: "grid",
          gridTemplateColumns: "220px minmax(0, 1fr)",
          position: "relative",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            background: "linear-gradient(180deg, #0f6e56 0%, #0a4d40 100%)",
            padding: "2rem 1rem",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#ffffff",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: "56%",
              background: "rgba(0,0,0,0.12)",
            }}
          />
          <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
            <div style={{ fontSize: "3.3rem", fontWeight: 700, letterSpacing: "-0.04em", fontFamily: "Georgia, serif", opacity: 0.18, lineHeight: 1 }}>
              Rx
            </div>
          </div>
          <div
            style={{
              position: "relative",
              zIndex: 1,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.12)",
              borderRadius: 14,
              padding: "0.8rem 1rem",
              textAlign: "center",
              minWidth: 122,
            }}
          >
            <div style={{ fontSize: "1.2rem", fontWeight: 700, lineHeight: 1 }}>{settings.left_badge_title}</div>
            <div style={{ fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.72)", marginTop: "0.2rem" }}>
              {settings.left_badge_subtitle}
            </div>
          </div>
          <div
            style={{
              position: "relative",
              zIndex: 1,
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "rgba(255,255,255,0.62)",
            }}
          >
            {settings.left_vertical_text}
          </div>
        </div>

        <div style={{ position: "relative", padding: "1.8rem 2.25rem 1.8rem 1.9rem", display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div
            style={{
              position: "absolute",
              top: "1.1rem",
              right: "1.2rem",
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: "0.42rem",
              opacity: 0.28,
            }}
          >
            {dots.map((_, index) => (
              <span
                key={index}
                style={{
                  width: 4,
                  height: 4,
                  background: "#0f6e56",
                  borderRadius: "999px",
                  display: "block",
                }}
              />
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", paddingTop: "0.2rem" }}>
              {Array.from({ length: 4 }).map((_, index) => (
                <span
                  key={index}
                  style={{
                    width: 0,
                    height: 0,
                    borderTop: "9px solid transparent",
                    borderBottom: "9px solid transparent",
                    borderLeft: "12px solid #7ad9ca",
                    opacity: 0.65 - index * 0.1,
                  }}
                />
              ))}
            </div>

            <div
              style={{
                background: "#f0faf5",
                border: "1px solid #c8e7da",
                borderRadius: 14,
                padding: "0.8rem 1rem",
                minWidth: 220,
                boxShadow: "0 14px 32px rgba(15,110,86,0.10)",
                display: "flex",
                alignItems: "center",
                gap: "0.85rem",
              }}
            >
              <img
                src={logoUrl}
                alt={`${settings.organization_name} logo`}
                style={{ width: 54, height: 54, borderRadius: 14, objectFit: "cover", flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: "0.72rem", letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 800, color: "#0f6e56", marginBottom: "0.15rem" }}>
                  {settings.organization_name}
                </div>
                <div style={{ fontSize: "0.76rem", color: "#607068" }}>{settings.organization_subtitle}</div>
              </div>
            </div>
          </div>

          <div style={{ maxWidth: 650 }}>
            <div style={{ fontSize: "0.74rem", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 800, color: "#607068", marginBottom: "0.2rem" }}>
              {settings.certificate_label}
            </div>
            {settings.certificate_title && (
              <h2
                style={{
                  margin: 0,
                  fontSize: "3.05rem",
                  lineHeight: 1.03,
                  color: "#11231d",
                  fontFamily: "Georgia, serif",
                  fontWeight: 700,
                }}
              >
                {settings.certificate_title}
              </h2>
            )}
            <div style={{ width: 56, height: 4, background: "#0f6e56", borderRadius: "999px", marginTop: "0.95rem", marginBottom: "1.3rem" }} />

            <div style={{ color: "#607068", fontSize: "1rem", marginBottom: "0.45rem" }}>{settings.certifies_text}</div>
            <div
              style={{
                fontSize: "3rem",
                lineHeight: 1.1,
                color: "#16b9c7",
                fontFamily: "Georgia, serif",
                marginBottom: "0.45rem",
                wordBreak: "break-word",
              }}
            >
              {profile?.full_name || "Pharmacist"}
            </div>

            {profile?.professional_id && (
              <div
                style={{
                  display: "inline-block",
                  background: "#f0faf5",
                  border: "1px solid #c8e7da",
                  color: "#607068",
                  borderRadius: 8,
                  padding: "0.28rem 0.6rem",
                  fontSize: "0.78rem",
                  marginBottom: "1rem",
                }}
              >
                License / Professional ID: {profile.professional_id}
              </div>
            )}

            <div style={{ color: "#607068", fontSize: "0.98rem", marginBottom: "0.35rem" }}>{settings.completion_text}</div>
            <div style={{ color: "#11231d", fontSize: "1.28rem", fontWeight: 700, lineHeight: 1.35, maxWidth: 690 }}>
              {course?.title}
            </div>
          </div>

          <div style={{ marginTop: "auto", paddingTop: "1.4rem", borderTop: "1px solid #e9f7f1", display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 0.85fr) auto", gap: "1rem", alignItems: "end" }}>
            <div>
              {settings.signature_image_url ? (
                <img
                  src={settings.signature_image_url}
                  alt={`${settings.signature_name} signature`}
                  style={{ maxHeight: 66, maxWidth: 210, objectFit: "contain", display: "block", marginBottom: "0.15rem" }}
                />
              ) : (
                <div style={{ fontFamily: "'Brush Script MT', cursive", fontSize: "2rem", lineHeight: 1, color: "#11231d", marginBottom: "0.15rem" }}>
                  {settings.signature_name}
                </div>
              )}
              <div style={{ width: 180, borderTop: "1.4px solid #11231d", marginBottom: "0.3rem" }} />
              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#11231d" }}>{settings.signature_name}</div>
              <div style={{ fontSize: "0.78rem", color: "#607068" }}>{settings.signature_role}</div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#93a098", marginBottom: "0.25rem" }}>
                Date issued
              </div>
              <div style={{ fontSize: "0.96rem", fontWeight: 700, color: "#11231d", marginBottom: "0.35rem" }}>{issuedDate}</div>
              <div style={{ fontSize: "0.72rem", color: "#93a098", wordBreak: "break-all" }}>ID: {cert?.id}</div>
            </div>

            <div style={{ textAlign: "center" }}>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Verification QR" style={{ width: 88, height: 88, display: "block", margin: "0 auto 0.35rem" }} />
              ) : (
                <div style={{ width: 88, height: 88, borderRadius: 8, background: "#f0faf5", border: "1px solid #c8e7da" }} />
              )}
              <div style={{ fontSize: "0.72rem", color: "#607068" }}>Scan to verify</div>
            </div>
          </div>

          <div style={{ marginTop: "1rem", fontSize: "0.74rem", color: "#93a098" }}>{settings.footer_text}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={downloadPDF} className="btn btn-primary" style={{ padding: ".7rem 1.75rem" }} disabled={downloading}>
          {downloading ? "Preparing PDF..." : "Download PDF Certificate"}
        </button>
        <Link to="/dashboard" className="btn btn-outline" style={{ padding: ".7rem 1.75rem" }}>
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
