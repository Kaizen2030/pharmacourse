import { Download, Globe, MessageCircle, Phone, QrCode, Share2, Smartphone } from "lucide-react"
import SEO from "../components/SEO"

const portalUrl = "https://www.pharmacourse.co.ke/patient"

export default function PatientPortalFlyer() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(15,110,86,0.12), transparent 24%), linear-gradient(180deg, #eef7f3 0%, #f7fbf9 100%)",
        padding: "24px 12px 48px",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      <SEO
        title="RemedacarePOS Patient Portal Flyer"
        description="Printable A4 flyer for the RemedacarePOS patient portal."
        path="/patient-flyer"
        noindex
      />

      <style>{`
        @page {
          size: A4;
          margin: 14mm;
        }

        .portal-flyer-shell {
          width: min(100%, 210mm);
          margin: 0 auto;
        }

        .portal-flyer-sheet {
          background: #ffffff;
          border: 1px solid rgba(15, 110, 86, 0.12);
          border-radius: 28px;
          box-shadow: 0 26px 48px rgba(15, 42, 32, 0.12);
          overflow: hidden;
        }

        .portal-flyer-toolbar {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .portal-flyer-toolbar button {
          border: none;
          border-radius: 999px;
          min-height: 46px;
          padding: 0.8rem 1.1rem;
          font-weight: 800;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
        }

        .portal-flyer-print {
          background: #0f6e56;
          color: white;
        }

        .portal-flyer-copy {
          background: rgba(15, 110, 86, 0.08);
          color: #0f6e56;
        }

        .portal-flyer-hero {
          padding: 32px 34px 28px;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 24%),
            linear-gradient(135deg, #083326 0%, #0f6e56 54%, #189a76 100%);
          color: white;
        }

        .portal-flyer-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.45rem 0.85rem;
          border-radius: 999px;
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.18);
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 0.9rem;
        }

        .portal-flyer-hero h1 {
          margin: 0 0 0.8rem;
          font-family: "DM Serif Display", serif;
          font-size: clamp(2rem, 4vw, 2.9rem);
          line-height: 1.02;
        }

        .portal-flyer-hero p {
          margin: 0;
          max-width: 640px;
          font-size: 1.02rem;
          line-height: 1.7;
          color: rgba(255,255,255,0.9);
        }

        .portal-flyer-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 1.4rem;
          padding: 30px 34px 34px;
        }

        .portal-flyer-card {
          border: 1px solid rgba(15, 110, 86, 0.12);
          border-radius: 24px;
          padding: 1.25rem 1.2rem;
          background: linear-gradient(180deg, #ffffff 0%, #f7fbf9 100%);
        }

        .portal-flyer-title {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          margin-bottom: 0.85rem;
          color: #0f6e56;
        }

        .portal-flyer-title svg {
          width: 20px;
          height: 20px;
        }

        .portal-flyer-title h2 {
          margin: 0;
          color: #163329;
          font-size: 1.08rem;
        }

        .portal-flyer-card p,
        .portal-flyer-card li {
          color: #4f675e;
          line-height: 1.65;
          font-size: 0.95rem;
        }

        .portal-flyer-list {
          display: grid;
          gap: 0.75rem;
          padding: 0;
          margin: 0;
          list-style: none;
        }

        .portal-flyer-list li {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 0.75rem;
          align-items: start;
        }

        .portal-flyer-list strong {
          color: #163329;
        }

        .portal-flyer-check {
          width: 26px;
          height: 26px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(15, 110, 86, 0.1);
          color: #0f6e56;
          font-weight: 800;
          flex-shrink: 0;
        }

        .portal-flyer-steps {
          display: grid;
          gap: 0.85rem;
          margin-top: 0.4rem;
        }

        .portal-flyer-step {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 0.8rem;
          align-items: start;
          padding: 0.95rem 1rem;
          border-radius: 18px;
          background: rgba(15, 110, 86, 0.05);
        }

        .portal-flyer-step-number {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          background: #0f6e56;
          color: #ffffff;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .portal-flyer-step strong {
          color: #163329;
          display: block;
          margin-bottom: 0.2rem;
        }

        .portal-flyer-highlight {
          margin-top: 1rem;
          padding: 1rem;
          border-radius: 18px;
          background: rgba(26, 107, 181, 0.07);
          border: 1px solid rgba(26, 107, 181, 0.12);
          color: #21473b;
          font-size: 0.95rem;
          line-height: 1.65;
        }

        .portal-flyer-portal {
          margin-top: 1rem;
          padding: 1rem;
          border-radius: 18px;
          background: #0f6e56;
          color: white;
        }

        .portal-flyer-portal-label {
          font-size: 0.74rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.78;
        }

        .portal-flyer-portal-url {
          display: block;
          margin-top: 0.35rem;
          font-size: 1rem;
          font-weight: 800;
          word-break: break-word;
        }

        .portal-flyer-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-top: 1.1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(15, 110, 86, 0.1);
          color: #5f746b;
          font-size: 0.88rem;
        }

        @media print {
          body {
            background: white !important;
          }

          .portal-flyer-toolbar {
            display: none !important;
          }

          .portal-flyer-shell {
            width: 100%;
            margin: 0;
          }

          .portal-flyer-sheet {
            border: none;
            border-radius: 0;
            box-shadow: none;
          }
        }

        @media (max-width: 860px) {
          .portal-flyer-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="portal-flyer-shell">
        <div className="portal-flyer-toolbar">
          <button type="button" className="portal-flyer-copy" onClick={() => navigator.clipboard.writeText(portalUrl)}>
            <Globe size={16} />
            Copy portal link
          </button>
          <button type="button" className="portal-flyer-print" onClick={() => window.print()}>
            <Download size={16} />
            Print A4 flyer
          </button>
        </div>

        <article className="portal-flyer-sheet">
          <header className="portal-flyer-hero">
            <div className="portal-flyer-badge">
              <Smartphone size={14} />
              RemedacarePOS Patient Portal
            </div>
            <h1>Your pharmacy on your phone.</h1>
            <p>
              Request prescriptions, book appointments, ask for delivery, and follow live pharmacy updates from one secure
              mobile-friendly portal.
            </p>
          </header>

          <div className="portal-flyer-grid">
            <section className="portal-flyer-card">
              <div className="portal-flyer-title">
                <Phone />
                <h2>What patients can do</h2>
              </div>

              <ul className="portal-flyer-list">
                <li>
                  <span className="portal-flyer-check">1</span>
                  <div>
                    <strong>Register once</strong>
                    Use your phone number to create your profile for one pharmacy branch.
                  </div>
                </li>
                <li>
                  <span className="portal-flyer-check">2</span>
                  <div>
                    <strong>Request a prescription</strong>
                    Send refill requests, upload prescription photos, and accept alternatives online.
                  </div>
                </li>
                <li>
                  <span className="portal-flyer-check">3</span>
                  <div>
                    <strong>Book an appointment</strong>
                    Schedule phone calls, video consultations, or pickup visits.
                  </div>
                </li>
                <li>
                  <span className="portal-flyer-check">4</span>
                  <div>
                    <strong>Request delivery</strong>
                    Ask for medicine delivery and follow dispatch updates on your phone.
                  </div>
                </li>
                <li>
                  <span className="portal-flyer-check">5</span>
                  <div>
                    <strong>Track updates</strong>
                    See pharmacist messages, appointment confirmations, and delivery timelines in one place.
                  </div>
                </li>
              </ul>

              <div className="portal-flyer-highlight">
                Always use the <strong>same phone number</strong> so your prescriptions, appointments, deliveries, and
                updates stay linked to your profile.
              </div>
            </section>

            <section className="portal-flyer-card">
              <div className="portal-flyer-title">
                <QrCode />
                <h2>How to start</h2>
              </div>

              <div className="portal-flyer-steps">
                <div className="portal-flyer-step">
                  <span className="portal-flyer-step-number">1</span>
                  <div>
                    <strong>Open the patient portal</strong>
                    Visit the link below and choose your pharmacy branch.
                  </div>
                </div>
                <div className="portal-flyer-step">
                  <span className="portal-flyer-step-number">2</span>
                  <div>
                    <strong>Install it like an app</strong>
                    Android: tap <em>Install patient portal</em>. iPhone: Safari → <em>Share</em> → <em>Add to Home Screen</em>.
                  </div>
                </div>
                <div className="portal-flyer-step">
                  <span className="portal-flyer-step-number">3</span>
                  <div>
                    <strong>Use it anytime</strong>
                    Open it from your home screen for faster access to your pharmacy.
                  </div>
                </div>
              </div>

              <div className="portal-flyer-portal">
                <div className="portal-flyer-portal-label">Portal link</div>
                <span className="portal-flyer-portal-url">{portalUrl}</span>
              </div>

              <div className="portal-flyer-highlight">
                <strong>Need help?</strong> Ask the pharmacy staff to help you install the portal on your phone.
              </div>

              <div className="portal-flyer-footer">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                  <Share2 size={15} />
                  Share this page with patients
                </span>
                <span>Powered by PharmaCourse + RemedacarePOS</span>
              </div>
            </section>
          </div>
        </article>
      </div>
    </div>
  )
}
