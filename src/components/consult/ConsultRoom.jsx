import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, MessageSquare, Mic, MicOff, PhoneOff, ScreenShare, Send, ShieldCheck, Video, VideoOff } from "lucide-react"
import { ConsultCall, callConsultApi, describeConsultError } from "../../lib/consultRtc"

// Errors that will never fix themselves, so we stop polling for them.
const FATAL_CODES = new Set(["unauthorized", "forbidden", "not_found", "appointment_closed"])

function describeMediaError(error) {
  switch (error?.name) {
    case "NotAllowedError":
      return "Camera or microphone access was blocked. Allow access in your browser settings and reload this page."
    case "NotFoundError":
      return "No camera or microphone was found on this device."
    case "NotReadableError":
      return "Your camera or microphone is being used by another app. Close it and try again."
    default:
      return "We could not start your camera and microphone."
  }
}

export default function ConsultRoom({ role, appointmentId, supabase, onLeave }) {
  const isStaff = role === "staff"

  const [phase, setPhase] = useState("lobby") // lobby | call
  const [session, setSession] = useState(null)
  const [lobbyError, setLobbyError] = useState("")
  const [mediaError, setMediaError] = useState("")
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)

  const [connection, setConnection] = useState("new")
  const [peerPresent, setPeerPresent] = useState(false)
  const [peerLeft, setPeerLeft] = useState(false)
  const [remoteStream, setRemoteStream] = useState(null)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatDraft, setChatDraft] = useState("")
  const [messages, setMessages] = useState([])
  const [unread, setUnread] = useState(0)

  const localStreamRef = useRef(null)
  const callRef = useRef(null)
  const wakeLockRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const chatOpenRef = useRef(false)
  const chatEndRef = useRef(null)

  chatOpenRef.current = chatOpen

  // ---------- camera/mic preview ----------
  useEffect(() => {
    let cancelled = false

    async function openMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } },
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        localStreamRef.current = stream
        if (localVideoRef.current) localVideoRef.current.srcObject = stream
      } catch (error) {
        if (!cancelled) setMediaError(describeMediaError(error))
      }
    }

    void openMedia()

    return () => {
      cancelled = true
    }
  }, [])

  // Re-attach streams whenever the <video> elements mount (lobby -> call switches elements).
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) localVideoRef.current.srcObject = localStreamRef.current
  }, [phase])

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream
  }, [remoteStream, phase])

  // ---------- patient: wait until the pharmacist starts ----------
  useEffect(() => {
    if (isStaff || phase !== "lobby" || session) return undefined

    let stopped = false
    let timer

    async function poll() {
      try {
        const data = await callConsultApi(supabase, "join", appointmentId)
        if (stopped) return
        setSession(data)
        setLobbyError("")
      } catch (error) {
        if (stopped) return
        if (error.code === "not_started") {
          setLobbyError("")
          timer = setTimeout(poll, 5000)
        } else if (FATAL_CODES.has(error.code)) {
          setLobbyError(describeConsultError(error.code))
        } else {
          setLobbyError(describeConsultError(error.code))
          timer = setTimeout(poll, 8000)
        }
      }
    }

    void poll()

    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [isStaff, phase, session, supabase, appointmentId])

  // ---------- teardown ----------
  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release?.().catch(() => {})
    wakeLockRef.current = null
  }, [])

  useEffect(
    () => () => {
      callRef.current?.close()
      callRef.current = null
      localStreamRef.current?.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
      releaseWakeLock()
    },
    [releaseWakeLock],
  )

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "end" })
  }, [messages, chatOpen])

  // ---------- actions ----------
  async function handleStart() {
    setBusy(true)
    setLobbyError("")
    try {
      setSession(await callConsultApi(supabase, "start", appointmentId))
    } catch (error) {
      setLobbyError(describeConsultError(error.code))
    }
    setBusy(false)
  }

  async function handleJoin() {
    if (!session || !localStreamRef.current) return
    setBusy(true)
    setLobbyError("")

    try {
      const call = new ConsultCall({
        supabase,
        topic: session.topic,
        role,
        iceServers: session.iceServers,
        onRemoteStream: (stream) => setRemoteStream(stream),
        onConnection: (state) => setConnection(state),
        onPeer: (present) => {
          setPeerPresent(present)
          setPeerLeft(false)
        },
        onChat: (message) => {
          setMessages((current) => [...current, message])
          if (!chatOpenRef.current) setUnread((count) => count + 1)
        },
        onEnded: () => setPeerLeft(true),
        onScreenShareStopped: () => setSharing(false),
      })
      callRef.current = call
      await call.start(localStreamRef.current)
      setPhase("call")

      try {
        wakeLockRef.current = await navigator.wakeLock?.request("screen")
      } catch {
        /* optional */
      }
    } catch {
      callRef.current?.close({ notifyPeer: false })
      callRef.current = null
      setLobbyError("We could not connect to the call room. Check your connection and try again.")
    }
    setBusy(false)
  }

  async function handleLeave() {
    callRef.current?.close()
    callRef.current = null
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    releaseWakeLock()

    if (isStaff) {
      try {
        await callConsultApi(supabase, "end", appointmentId)
      } catch {
        /* the room expires on its own; nothing to show */
      }
    }
    onLeave?.()
  }

  function toggleMic() {
    const next = !micOn
    callRef.current?.setMicEnabled(next)
    setMicOn(next)
  }

  function toggleCamera() {
    const next = !camOn
    callRef.current?.setCameraEnabled(next)
    setCamOn(next)
  }

  async function toggleShare() {
    const call = callRef.current
    if (!call) return
    try {
      if (sharing) {
        await call.stopScreenShare()
        setSharing(false)
      } else {
        setSharing(await call.startScreenShare())
      }
    } catch {
      setSharing(false)
    }
  }

  function submitChat(event) {
    event.preventDefault()
    const text = chatDraft.trim()
    if (text && callRef.current?.sendChat(text)) {
      setMessages((current) => [...current, { from: "me", text, at: Date.now() }])
      setChatDraft("")
    }
  }

  function openChat() {
    setChatOpen((open) => !open)
    setUnread(0)
  }

  const canShare = Boolean(callRef.current?.canShareScreen) && !/Android|iPhone|iPad/i.test(navigator.userAgent)
  const stateLabel = !peerPresent
    ? isStaff ? "Waiting for the patient to join…" : "Waiting for the pharmacist…"
    : connection === "connected" ? "" : connection === "failed" || connection === "disconnected" ? "Reconnecting…" : "Connecting…"

  // ---------- render ----------
  if (phase === "lobby") {
    const ready = Boolean(session) && consent && !mediaError && Boolean(localStreamRef.current)
    return (
      <div className="cr-root">
        <ConsultStyles />
        <div className="cr-lobby">
          <h1 className="cr-title">{isStaff ? "Start video consultation" : "Video consultation"}</h1>

          <div className="cr-preview">
            {mediaError ? <p className="cr-preview-error">{mediaError}</p> : <video ref={localVideoRef} autoPlay playsInline muted />}
          </div>

          <label className="cr-consent">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>
              <ShieldCheck size={15} /> I agree to take part in this video consultation. It is <strong>not recorded</strong>, and
              only the start time and duration are saved.
            </span>
          </label>

          {lobbyError ? <p className="cr-error">{lobbyError}</p> : null}

          {isStaff && !session ? (
            <button className="cr-primary" type="button" onClick={handleStart} disabled={busy || Boolean(mediaError)}>
              {busy ? <Loader2 className="cr-spin" size={18} /> : null} Open the consultation room
            </button>
          ) : null}

          {!isStaff && !session && !lobbyError ? (
            <p className="cr-wait"><Loader2 className="cr-spin" size={16} /> Waiting for the pharmacist to open the room. This page updates by itself.</p>
          ) : null}

          {session ? (
            <button className="cr-primary" type="button" onClick={handleJoin} disabled={!ready || busy}>
              {busy ? <Loader2 className="cr-spin" size={18} /> : null} Join the call
            </button>
          ) : null}

          <button className="cr-link" type="button" onClick={handleLeave}>Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="cr-root cr-call">
      <ConsultStyles />

      <div className="cr-stage">
        <video ref={remoteVideoRef} className="cr-remote" autoPlay playsInline />
        {stateLabel || peerLeft ? (
          <div className="cr-banner">
            {peerLeft ? "The other person left the call." : <><Loader2 className="cr-spin" size={16} /> {stateLabel}</>}
          </div>
        ) : null}
        <video ref={localVideoRef} className={`cr-self${camOn ? "" : " cr-self-off"}`} autoPlay playsInline muted />
      </div>

      {chatOpen ? (
        <aside className="cr-chat">
          <div className="cr-chat-log">
            {messages.length ? messages.map((message, index) => (
              <div key={index} className={`cr-msg ${message.from === "me" ? "cr-msg-me" : ""}`}>{message.text}</div>
            )) : <p className="cr-chat-empty">Messages are not saved after the call.</p>}
            <div ref={chatEndRef} />
          </div>
          <form className="cr-chat-form" onSubmit={submitChat}>
            <input value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} placeholder="Type a message" maxLength={1000} />
            <button type="submit" aria-label="Send"><Send size={16} /></button>
          </form>
        </aside>
      ) : null}

      <div className="cr-controls">
        <button type="button" className={micOn ? "" : "cr-off"} onClick={toggleMic} aria-label={micOn ? "Mute microphone" : "Unmute microphone"}>
          {micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
        <button type="button" className={camOn ? "" : "cr-off"} onClick={toggleCamera} aria-label={camOn ? "Turn camera off" : "Turn camera on"}>
          {camOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>
        {canShare ? (
          <button type="button" className={sharing ? "cr-active" : ""} onClick={toggleShare} aria-label="Share screen">
            <ScreenShare size={20} />
          </button>
        ) : null}
        <button type="button" onClick={openChat} aria-label="Chat" className="cr-chat-toggle">
          <MessageSquare size={20} />
          {unread ? <span className="cr-dot">{unread}</span> : null}
        </button>
        <button type="button" className="cr-hangup" onClick={handleLeave} aria-label={isStaff ? "End consultation" : "Leave call"}>
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  )
}

function ConsultStyles() {
  return (
    <style>{`
      .cr-root{min-height:100dvh;background:#f4fbf8;color:#163329;display:grid;place-items:center;padding:1rem;font-family:inherit}
      .cr-lobby{width:min(460px,100%);display:grid;gap:.9rem}
      .cr-title{font-size:1.35rem;margin:0}
      .cr-preview{aspect-ratio:4/3;border-radius:18px;background:#0b241c;overflow:hidden;display:grid;place-items:center}
      .cr-preview video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
      .cr-preview-error{color:#fff;padding:1rem;text-align:center;margin:0}
      .cr-consent{display:flex;gap:.6rem;align-items:flex-start;font-size:.9rem;line-height:1.45}
      .cr-consent input{margin-top:.2rem}
      .cr-error{margin:0;padding:.7rem .9rem;border-radius:12px;background:#fdeceb;color:#8a2a22;font-size:.92rem}
      .cr-wait{margin:0;display:flex;gap:.5rem;align-items:center;color:#4f675e;font-size:.92rem}
      .cr-primary{min-height:50px;border:0;border-radius:999px;background:#0f6e56;color:#fff;font-weight:800;display:inline-flex;gap:.5rem;align-items:center;justify-content:center;cursor:pointer}
      .cr-primary:disabled{opacity:.5;cursor:not-allowed}
      .cr-link{border:0;background:none;color:#4f675e;text-decoration:underline;cursor:pointer;padding:.4rem}
      .cr-spin{animation:cr-spin 1s linear infinite}
      @keyframes cr-spin{to{transform:rotate(360deg)}}

      .cr-call{padding:0;background:#071d16;display:block;position:relative;overflow:hidden}
      .cr-stage{position:absolute;inset:0 0 88px 0;background:#071d16}
      .cr-remote{width:100%;height:100%;object-fit:contain;background:#071d16}
      .cr-self{position:absolute;right:12px;bottom:12px;width:min(32vw,150px);aspect-ratio:3/4;object-fit:cover;border-radius:14px;border:2px solid rgba(255,255,255,.7);background:#0b241c;transform:scaleX(-1)}
      .cr-self-off{opacity:.25}
      .cr-banner{position:absolute;left:50%;top:14px;transform:translateX(-50%);padding:.55rem .95rem;border-radius:999px;background:rgba(0,0,0,.65);color:#fff;font-size:.9rem;display:flex;gap:.5rem;align-items:center;white-space:nowrap}
      .cr-controls{position:absolute;left:0;right:0;bottom:0;height:88px;padding-bottom:env(safe-area-inset-bottom,0);display:flex;gap:.75rem;align-items:center;justify-content:center;background:rgba(7,29,22,.96)}
      .cr-controls button{position:relative;width:52px;height:52px;border-radius:50%;border:0;background:#1d3a30;color:#fff;display:grid;place-items:center;cursor:pointer}
      .cr-controls .cr-off{background:#b3342a}
      .cr-controls .cr-active{background:#0f6e56}
      .cr-controls .cr-hangup{background:#d93a2e}
      .cr-dot{position:absolute;top:-2px;right:-2px;min-width:18px;height:18px;border-radius:9px;background:#e8b04a;color:#2b1d00;font-size:.7rem;font-weight:800;display:grid;place-items:center;padding:0 4px}
      .cr-chat{position:absolute;right:0;top:0;bottom:88px;width:min(340px,100%);background:#fff;color:#163329;display:flex;flex-direction:column;box-shadow:-8px 0 24px rgba(0,0,0,.25)}
      .cr-chat-log{flex:1;overflow:auto;padding:.8rem;display:grid;gap:.4rem;align-content:start}
      .cr-chat-empty{color:#6b8077;font-size:.85rem;margin:0}
      .cr-msg{max-width:85%;padding:.5rem .75rem;border-radius:14px;background:#e8f5f0;font-size:.92rem;overflow-wrap:anywhere}
      .cr-msg-me{justify-self:end;background:#0f6e56;color:#fff}
      .cr-chat-form{display:flex;gap:.4rem;padding:.6rem;border-top:1px solid #dbe8e2}
      .cr-chat-form input{flex:1;min-width:0;border:1px solid #cbdad3;border-radius:999px;padding:.6rem .9rem;font:inherit}
      .cr-chat-form button{width:42px;height:42px;border:0;border-radius:50%;background:#0f6e56;color:#fff;display:grid;place-items:center}
    `}</style>
  )
}
