import { useId } from "react"
import { MODES, isWhatsAppUrl } from "../lib/tutorWhatsApp"
import "../styles/wa-ui.css"

export default function WhatsAppFields({ value, onChange, inherit = false }) {
  const id = useId()
  const set = (key, nextValue) => onChange({ ...value, [key]: nextValue })
  const mode = value.whatsapp_mode || (inherit ? "" : "channel")
  const urlBad = value.whatsapp_url && !isWhatsAppUrl(value.whatsapp_url)
  const enabledValue = value.whatsapp_enabled == null ? "inherit" : value.whatsapp_enabled ? "on" : "off"

  return (
    <div className="wa-card wa-fields">
      <div>
        <h3>WhatsApp {inherit ? "for this course" : "settings"}</h3>
        <p className="wa-muted" style={{ marginTop: "0.3rem", fontSize: "0.85rem" }}>
          Choose what students see on this tutor's course. Only WhatsApp links are accepted.
        </p>
      </div>

      <div className="wa-row">
        <div className="wa-field">
          <label htmlFor={`${id}-enabled`}>Show WhatsApp card</label>
          <select
            id={`${id}-enabled`}
            value={inherit ? enabledValue : value.whatsapp_enabled ? "on" : "off"}
            onChange={(event) => set("whatsapp_enabled", event.target.value === "inherit" ? null : event.target.value === "on")}
          >
            {inherit ? <option value="inherit">Use tutor's setting</option> : null}
            <option value="on">Yes</option>
            <option value="off">No, hide it</option>
          </select>
        </div>
        <div className="wa-field">
          <label htmlFor={`${id}-mode`}>Type</label>
          <select id={`${id}-mode`} value={mode} onChange={(event) => set("whatsapp_mode", event.target.value || null)}>
            {inherit ? <option value="">Use tutor's setting</option> : null}
            {Object.entries(MODES).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
          </select>
        </div>
      </div>

      <div className="wa-field">
        <label htmlFor={`${id}-number`}>WhatsApp account number</label>
        <input id={`${id}-number`} type="tel" inputMode="tel" value={value.whatsapp_number || ""} onChange={(event) => set("whatsapp_number", event.target.value)} placeholder="0712 345 678" />
        <small>Used for direct chat and to verify your linked device. Direct-chat numbers are public on the course page.</small>
      </div>

      {mode === "chat" ? (
        <p className="wa-alert warn">Students can see this number when you choose direct chat. Use a business number if you want privacy.</p>
      ) : (
        <div className="wa-field">
          <label htmlFor={`${id}-url`}>{mode === "group" ? "Group invite link" : "Channel link"}</label>
          <input id={`${id}-url`} type="url" value={value.whatsapp_url || ""} onChange={(event) => set("whatsapp_url", event.target.value)} placeholder={mode === "group" ? "https://chat.whatsapp.com/..." : "https://whatsapp.com/channel/..."} aria-invalid={urlBad ? "true" : undefined} />
          {urlBad ? <small className="bad">Enter a valid WhatsApp link.</small> : null}
        </div>
      )}

      <div className="wa-row">
        <div className="wa-field">
          <label htmlFor={`${id}-title`}>Card title (optional)</label>
          <input id={`${id}-title`} value={value.whatsapp_title || ""} onChange={(event) => set("whatsapp_title", event.target.value)} maxLength={80} placeholder="Join our class channel" />
        </div>
        <div className="wa-field">
          <label htmlFor={`${id}-blurb`}>Short description (optional)</label>
          <input id={`${id}-blurb`} value={value.whatsapp_blurb || ""} onChange={(event) => set("whatsapp_blurb", event.target.value)} maxLength={160} placeholder="Weekly tips and live session reminders" />
        </div>
      </div>
    </div>
  )
}
