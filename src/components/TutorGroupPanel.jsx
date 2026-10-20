import { useCallback, useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import { isGroupInviteUrl } from "../lib/courseGroup"
import { waGateway } from "../lib/waGateway"
import { confirmDialog } from "../lib/dialog"

const labelStyle = { display: "grid", gap: ".3rem", fontSize: ".8rem", color: "var(--text-500)" }

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
      setError(/course_whatsapp_groups/i.test(loadError.message) ? "Run supabase/group_invites_setup.sql to enable class groups." : loadError.message)
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
    if (saveError) setError(saveError.message)
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
      setError(verifyError.message)
    } finally { setBusy(false) }
  }

  async function inviteEveryone() {
    if (!(await confirmDialog({ title: "Invite current students?", message: "Queue the group invite for every student already enrolled. Students without a WhatsApp number and consent are skipped.", confirmLabel: "Queue invites" }))) return
    setError(""); setNote(""); setBusy(true)
    const { data, error: rpcError } = await supabase.rpc("queue_group_invites_for_course", { p_course: courseId })
    if (rpcError) setError(rpcError.message)
    else { setNote(`${data} invite${data === 1 ? "" : "s"} queued.`); await load() }
    setBusy(false)
  }

  const pending = stats.queued || 0
  return (
    <div style={{ border: "1px solid var(--border)", borderLeft: "4px solid #25D366", borderRadius: 8, padding: ".9rem", display: "grid", gap: ".7rem" }}>
      <div>
        <strong style={{ fontSize: ".95rem" }}>Class WhatsApp group</strong>
        <p style={{ margin: ".25rem 0 0", color: "var(--text-500)", fontSize: ".82rem" }}>
          Students see the invite the moment they enroll, and it is also sent to their WhatsApp if they added a number and consented. The link is hidden from people who have not enrolled.
        </p>
      </div>
      {error ? <div role="alert" style={{ color: "var(--danger)", fontSize: ".85rem" }}>{error}</div> : null}
      <label style={labelStyle}>
        Group invite link
        <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://chat.whatsapp.com/..." />
      </label>
      <label style={labelStyle}>
        Welcome message (optional)
        <input value={welcome} maxLength={200} onChange={(event) => setWelcome(event.target.value)} placeholder="Welcome! Introduce yourself and ask questions here." />
      </label>
      <label style={{ display: "flex", gap: ".5rem", alignItems: "center", fontSize: ".85rem" }}>
        <input type="checkbox" checked={auto} onChange={(event) => setAuto(event.target.checked)} style={{ accentColor: "#0F6E56" }} />
        Invite students automatically when they enroll
      </label>
      <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={busy}>{busy ? "Saving…" : "Save group"}</button>
        {group && gatewayInstanceId ? <button type="button" className="btn btn-outline" onClick={() => void verify()} disabled={busy}>{group.group_jid ? "Re-check group" : "Connect group for tips"}</button> : null}
        {group ? <button type="button" className="btn btn-outline" onClick={() => void inviteEveryone()} disabled={busy}>Invite current students</button> : null}
      </div>
      {group && !group.group_jid ? <p style={{ margin: 0, fontSize: ".8rem", color: "var(--text-500)" }}>{gatewayInstanceId ? "Tap “Connect group for tips” so tips can be posted into the group (your linked number must be a member, ideally an admin)." : "Link your WhatsApp above to post tips into the group."}</p> : null}
      {group ? (
        <p style={{ margin: 0, fontSize: ".8rem", color: "var(--text-500)" }}>
          Invites: {stats.sent || 0} sent · {pending} waiting · {stats.skipped || 0} skipped (no number/consent) · {stats.failed || 0} failed
        </p>
      ) : null}
      {note ? <p role="status" style={{ margin: 0, color: "#0F6E56", fontSize: ".82rem" }}>{note}</p> : null}
    </div>
  )
}
