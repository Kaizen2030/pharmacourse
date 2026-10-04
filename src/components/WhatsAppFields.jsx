import { MODES, isWhatsAppUrl } from "../lib/tutorWhatsApp"

export default function WhatsAppFields({ value, onChange, inherit = false }) {
  const set = (key, nextValue) => onChange({ ...value, [key]: nextValue })
  const mode = value.whatsapp_mode || (inherit ? "" : "channel")
  const urlBad = value.whatsapp_url && !isWhatsAppUrl(value.whatsapp_url)
  const enabledValue = value.whatsapp_enabled == null ? "inherit" : value.whatsapp_enabled ? "on" : "off"

  return (
    <div className="card" style={{ padding: "1.25rem", borderLeft: "4px solid #25D366", display: "grid", gap: "0.9rem" }}>
      <div>
        <h3 style={{ margin: 0, fontSize: "1rem" }}>WhatsApp {inherit ? "for this course" : "settings"}</h3>
        <p style={{ margin: "0.3rem 0 0", color: "var(--text-500)", fontSize: "0.85rem" }}>
          Choose what students see on this tutor's course. Only WhatsApp links are accepted.
        </p>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Show WhatsApp card</label>
          <select
            value={inherit ? enabledValue : value.whatsapp_enabled ? "on" : "off"}
            onChange={(event) => set("whatsapp_enabled", event.target.value === "inherit" ? null : event.target.value === "on")}
          >
            {inherit ? <option value="inherit">Use tutor's setting</option> : null}
            <option value="on">Yes</option>
            <option value="off">No, hide it</option>
          </select>
        </div>
        <div className="form-group">
          <label>Type</label>
          <select value={mode} onChange={(event) => set("whatsapp_mode", event.target.value || null)}>
            {inherit ? <option value="">Use tutor's setting</option> : null}
            {Object.entries(MODES).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>WhatsApp account number</label>
        <input value={value.whatsapp_number || ""} onChange={(event) => set("whatsapp_number", event.target.value)} placeholder="0712 345 678" />
        <small style={{ color: "var(--text-500)" }}>Used for direct chat and to verify your self-hosted linked-device session. Direct-chat numbers are public on the course page.</small>
      </div>

      {mode === "chat" ? (
        <p style={{ margin: 0, color: "var(--text-500)", fontSize: "0.82rem" }}>Students can see this number when you choose direct chat. Use a business number if you want privacy.</p>
      ) : (
        <div className="form-group">
          <label>{mode === "group" ? "Group invite link" : "Channel link"}</label>
          <input value={value.whatsapp_url || ""} onChange={(event) => set("whatsapp_url", event.target.value)} placeholder={mode === "group" ? "https://chat.whatsapp.com/..." : "https://whatsapp.com/channel/..."} />
          {urlBad ? <small style={{ color: "var(--danger)" }}>Enter a valid WhatsApp link.</small> : null}
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label>Card title (optional)</label>
          <input value={value.whatsapp_title || ""} onChange={(event) => set("whatsapp_title", event.target.value)} maxLength={80} />
        </div>
        <div className="form-group">
          <label>Short description (optional)</label>
          <input value={value.whatsapp_blurb || ""} onChange={(event) => set("whatsapp_blurb", event.target.value)} maxLength={160} />
        </div>
      </div>
    </div>
  )
}