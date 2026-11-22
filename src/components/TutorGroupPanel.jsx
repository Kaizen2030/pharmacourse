import { useCallback, useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import { isGroupInviteUrl } from "../lib/courseGroup"
import { waGateway } from "../lib/waGateway"
import { confirmDialog } from "../lib/dialog"
import { friendlyError } from "../lib/friendlyError"
import { gatewayError } from "../lib/waGateway"
import { Link2, UsersRound } from "lucide-react"

export default function TutorGroupPanel({ courseId, gatewayInstanceId = "", onChange }) {
  const [group, setGroup] = useState(null)
  const [url, setUrl] = useState("")
  const [auto, setAuto] = useState(true)
  const [welcome, setWelcome] = useState("")
  const [stats, setStats] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [note, setNote] = useState("")

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase.from("course_whatsapp_groups").select("*").eq("course_id", courseId).maybeSingle()
    if (loadError) {
      setError(/course_whatsapp_groups/i.test(loadError.message) ? "Class WhatsApp groups are not switched on for this site yet. Ask an administrator." : friendlyError(loadError, "We could not load the class group."))
      return
    }
    setGroup(data || null)
    setUrl(data?.invite_url || "")
    setAuto(data ? data.auto_invite : true)
    setWelcome(data?.welcome_text || "")
    onChange?.(data || null)
    const { data: rows } = await supabase.rpc("group_invite_stats", { p_course: courseId })
    setStats(Object.fromEntries((rows || []).map((row) => [row.status, Number(row.total)])))
  }, [courseId, onChange])

  useEffect(() => { if (courseId) void load() }, [courseId, load])

  async function save() {
    setError(""); setNote("")
    if (!isGroupInviteUrl(url)) { setError("Paste a group invite link that starts with https://chat.whatsapp.com/"); return }
    setBusy(true)
    const changedLink = group?.invite_url !== url.trim()
    const { error: saveError } = await supabase.from("course_whatsapp_groups").upsert({
      course_id: courseId,
      invite_url: url.trim(),
      auto_invite: auto,
      welcome_text: welcome.trim() || null,
      ...(changedLink ? { group_jid: null } : null),
      updated_at: new Date().toISOString(),
    })
    if (saveError) setError(friendlyError(saveError, "We could not save the class group. Please try again."))
    else { setNote("Class group saved. New students will get the invite automatically."); await load() }
    setBusy(false)
  }

  async function verify() {
    setError(""); setNote(""); setBusy(true)
    try {
      const result = await waGateway.resolveGroup(gatewayInstanceId, url.trim())
      if (!result?.jid) throw new Error("The gateway could not find that group. Make sure your linked number is a member.")
      const { error: jidError } = await supabase.from("course_whatsapp_groups").update({ group_jid: result.jid }).eq("course_id", courseId)
      if (jidError) throw jidError
      setNote(`Group connected${result.subject ? `: ${result.subject}` : ""}. Tips can now be posted into it.`)
      await load()
    } catch (verifyError) {
      setError(verifyError?.code ? friendlyError(verifyError, "We could not save the connection.") : gatewayError(verifyError))
    } finally { setBusy(false) }
  }

  async function inviteEveryone() {
    if (!(await confirmDialog({ title: "Invite current students?", message: "Queue the group invite for every student already enrolled. Students without a WhatsApp number and consent are skipped.", confirmLabel: "Queue invites" }))) return
    setError(""); setNote(""); setBusy(true)
    const { data, error: rpcError } = await supabase.rpc("queue_group_invites_for_course", { p_course: courseId })
    if (rpcError) setError(friendlyError(rpcError, "We could not queue the invites. Please try again."))
    else { setNote(`${data} invite${data === 1 ? "" : "s"} queued.`); await load() }
    setBusy(false)
  }

  const pending = stats.queued || 0
  const state = !group ? "none" : group.group_jid ? "connected" : "saved"
  const stateLabel = { none: "Not set up", saved: "Saved · not connected for tips", connected: "Connected for tips" }[state]

  return (
    <section className="wa-block">
      <div className="wa-block-head">
        <span className="wa-block-icon group" aria-hidden="true"><UsersRound size={18} /></span>
        <div>
          <h4>Class WhatsApp group</h4>
          <p className="wa-muted">Enrolled students see the invite straight away, and get it on WhatsApp if they added a number and agreed. The link stays hidden from everyone else.</p>
        </div>
        <span className={`wa-status ${state === "connected" ? "connected" : state === "saved" ? "pending" : ""}`}>{stateLabel}</span>
      </div>

      {error ? <p role="alert" className="wa-alert error">{error}</p> : null}

      <div className="wa-row">
        <div className="wa-field">
          <label htmlFor={`group-url-${courseId}`}>Group invite link</label>
          <input id={`group-url-${courseId}`} type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://chat.whatsapp.com/..." />
        </div>
        <div className="wa-field">
          <label htmlFor={`group-welcome-${courseId}`}>Welcome message (optional)</label>
          <input id={`group-welcome-${courseId}`} value={welcome} maxLength={200} onChange={(event) => setWelcome(event.target.value)} placeholder="Welcome! Introduce yourself and ask questions here." />
        </div>
      </div>

      <label className="wa-toggle">
        <input type="checkbox" checked={auto} onChange={(event) => setAuto(event.target.checked)} />
        <span className="wa-switch" aria-hidden="true" />
        <span>
          <strong>Invite students automatically when they enrol</strong>
          <span className="wa-hint">Only students who added a WhatsApp number and agreed to messages.</span>
        </span>
      </label>

      <div className="wa-actions">
        <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={busy}>{busy ? "Saving…" : "Save group"}</button>
        {group && gatewayInstanceId ? (
          <button type="button" className="btn btn-outline" onClick={() => void verify()} disabled={busy}>
            <Link2 size={16} aria-hidden="true" /> {group.group_jid ? "Re-check group" : "Connect group for tips"}
          </button>
        ) : null}
        {group ? <button type="button" className="btn btn-outline" onClick={() => void inviteEveryone()} disabled={busy}>Invite current students</button> : null}
      </div>

      {state === "saved" ? (
        <p className="wa-hint">
          {gatewayInstanceId
            ? "Tap “Connect group for tips” so tips can be posted into the group. Your linked number must be a member (ideally an admin)."
            : "Link your WhatsApp above to post tips into the group."}
        </p>
      ) : null}

      {group ? (
        <div className="wa-stats" aria-label="Group invites">
          <div><strong>{stats.sent || 0}</strong><span>Sent</span></div>
          <div><strong>{pending}</strong><span>Waiting</span></div>
          <div title="No WhatsApp number or no consent"><strong>{stats.skipped || 0}</strong><span>Skipped</span></div>
          <div className={stats.failed ? "bad" : ""}><strong>{stats.failed || 0}</strong><span>Failed</span></div>
        </div>
      ) : null}
      {note ? <p role="status" className="wa-alert ok">{note}</p> : null}
    </section>
  )
}
