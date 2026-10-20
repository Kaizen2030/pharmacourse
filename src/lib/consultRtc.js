// 1-on-1 WebRTC call over Supabase Realtime Broadcast (no signaling server of your own).
// Uses the "perfect negotiation" pattern so both sides can safely renegotiate
// (screen share, ICE restarts after a network drop) without glare.
//
// The channel name contains a secret handed out only by the `consult` Edge Function,
// so only the two authorised people can join it.

const CONNECT_RETRY_MS = 3000

export async function callConsultApi(supabase, action, appointmentId) {
  const { data, error } = await supabase.functions.invoke("consult", {
    body: { action, appointment_id: appointmentId },
  })

  if (error) {
    let code = "request_failed"
    try {
      const payload = await error.context?.json?.()
      if (payload?.error) code = payload.error
    } catch {
      /* ignore */
    }
    const err = new Error(code)
    err.code = code
    throw err
  }

  return data
}

export function describeConsultError(code) {
  switch (code) {
    case "unauthorized":
      return "Please sign in again to continue."
    case "forbidden":
      return "This consultation is not linked to your account."
    case "not_found":
      return "We could not find this appointment."
    case "not_started":
      return "The pharmacist has not started the consultation yet."
    case "appointment_closed":
      return "This appointment is no longer active."
    default:
      return "We could not reach the consultation service. Check your connection and try again."
  }
}

export class ConsultCall {
  constructor({ supabase, topic, role, iceServers, onRemoteStream, onConnection, onChat, onPeer, onEnded, onScreenShareStopped }) {
    this.supabase = supabase
    this.topic = topic
    this.role = role
    this.iceServers = iceServers
    this.cb = { onRemoteStream, onConnection, onChat, onPeer, onEnded, onScreenShareStopped }

    this.clientId = crypto.randomUUID()
    this.polite = role === "patient"
    this.peerId = null
    this.pc = null
    this.channel = null
    this.chat = null
    this.pending = []
    this.makingOffer = false
    this.ignoreOffer = false
    this.localStream = null
    this.screenStream = null
    this.remoteStream = null
    this.disconnectTimer = null
    this.closed = false
  }

  async start(localStream) {
    this.localStream = localStream

    this.channel = this.supabase.channel(this.topic, {
      config: { broadcast: { self: false, ack: false } },
    })

    this.channel
      .on("broadcast", { event: "hello" }, ({ payload }) => this.#onHello(payload))
      .on("broadcast", { event: "signal" }, ({ payload }) => this.#onSignal(payload))
      .on("broadcast", { event: "bye" }, ({ payload }) => {
        if (payload?.from === this.peerId) this.cb.onEnded?.("peer")
      })

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("realtime_timeout")), 15000)
      this.channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timeout)
          resolve()
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          clearTimeout(timeout)
          reject(new Error("realtime_failed"))
        }
      })
    })

    this.#send("hello", { from: this.clientId, role: this.role })
  }

  // ---------- signaling ----------
  #send(event, payload) {
    if (!this.channel || this.closed) return
    void this.channel.send({ type: "broadcast", event, payload })
  }

  #onHello(payload) {
    if (!payload?.from || payload.role === this.role) return
    if (payload.from === this.peerId) return

    // New peer (first join, or the other side reloaded): build a fresh connection.
    this.peerId = payload.from
    this.#buildConnection()
    this.#send("hello", { from: this.clientId, role: this.role }) // ack, sent before any offer
    this.cb.onPeer?.(true)

    this.localStream?.getTracks().forEach((track) => this.pc.addTrack(track, this.localStream))
    this.#limitBitrate()

    const queued = this.pending.splice(0)
    queued.forEach((message) => void this.#onSignal(message))
  }

  #buildConnection() {
    if (this.pc) {
      this.pc.onicecandidate = null
      this.pc.ontrack = null
      this.pc.onnegotiationneeded = null
      this.pc.onconnectionstatechange = null
      this.pc.close()
    }

    this.makingOffer = false
    this.ignoreOffer = false
    this.remoteStream = new MediaStream()
    this.cb.onRemoteStream?.(this.remoteStream)

    const pc = new RTCPeerConnection({ iceServers: this.iceServers, bundlePolicy: "max-bundle" })
    this.pc = pc

    // In-call text chat travels over the connection itself, so nothing is stored.
    this.chat = pc.createDataChannel("chat", { negotiated: true, id: 0 })
    this.chat.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message?.text) this.cb.onChat?.({ from: "peer", text: String(message.text), at: Date.now() })
      } catch {
        /* ignore malformed */
      }
    }

    pc.ontrack = ({ track }) => {
      this.remoteStream.addTrack(track)
      this.cb.onRemoteStream?.(this.remoteStream)
    }

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) this.#send("signal", { from: this.clientId, candidate: candidate.toJSON() })
    }

    pc.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true
        await pc.setLocalDescription()
        this.#send("signal", { from: this.clientId, description: pc.localDescription.toJSON() })
      } catch (error) {
        console.error("[consult] negotiation failed", error)
      } finally {
        this.makingOffer = false
      }
    }

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      this.cb.onConnection?.(state)
      clearTimeout(this.disconnectTimer)

      if (state === "failed") {
        pc.restartIce()
      } else if (state === "disconnected") {
        // Brief mobile network blips often recover alone; if not, force an ICE restart.
        this.disconnectTimer = setTimeout(() => {
          if (!this.closed && this.pc === pc && pc.connectionState !== "connected") pc.restartIce()
        }, CONNECT_RETRY_MS)
      }
    }
  }

  async #onSignal(message) {
    if (!message || message.from === this.clientId) return
    if (!this.pc || (this.peerId && message.from !== this.peerId)) {
      if (!this.pc) this.pending.push(message)
      return
    }

    const pc = this.pc
    const { description, candidate } = message

    try {
      if (description) {
        const collision = description.type === "offer" && (this.makingOffer || pc.signalingState !== "stable")
        this.ignoreOffer = !this.polite && collision
        if (this.ignoreOffer) return

        await pc.setRemoteDescription(description)
        if (description.type === "offer") {
          await pc.setLocalDescription()
          this.#send("signal", { from: this.clientId, description: pc.localDescription.toJSON() })
        }
      } else if (candidate) {
        try {
          await pc.addIceCandidate(candidate)
        } catch (error) {
          if (!this.ignoreOffer) throw error
        }
      }
    } catch (error) {
      console.error("[consult] signal handling failed", error)
    }
  }

  // Keep video modest so calls hold up on mixed 3G/4G.
  #limitBitrate() {
    const sender = this.pc?.getSenders().find((item) => item.track?.kind === "video")
    if (!sender) return
    try {
      const params = sender.getParameters()
      if (!params.encodings?.length) params.encodings = [{}]
      params.encodings[0].maxBitrate = 700_000
      void sender.setParameters(params)
    } catch {
      /* not supported everywhere */
    }
  }

  // ---------- controls ----------
  setMicEnabled(enabled) {
    this.localStream?.getAudioTracks().forEach((track) => (track.enabled = enabled))
  }

  setCameraEnabled(enabled) {
    this.localStream?.getVideoTracks().forEach((track) => (track.enabled = enabled))
  }

  sendChat(text) {
    const value = String(text || "").trim()
    if (!value || this.chat?.readyState !== "open") return false
    this.chat.send(JSON.stringify({ text: value.slice(0, 1000) }))
    return true
  }

  get canShareScreen() {
    return typeof navigator.mediaDevices?.getDisplayMedia === "function"
  }

  async startScreenShare() {
    const sender = this.pc?.getSenders().find((item) => item.track?.kind === "video")
    if (!sender || !this.canShareScreen) return false

    this.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
    const [screenTrack] = this.screenStream.getVideoTracks()
    screenTrack.onended = () => void this.stopScreenShare()
    await sender.replaceTrack(screenTrack)
    return true
  }

  async stopScreenShare() {
    if (!this.screenStream) return
    this.screenStream.getTracks().forEach((track) => track.stop())
    this.screenStream = null

    const sender = this.pc?.getSenders().find((item) => item.track?.kind === "video" || item.track === null)
    const cameraTrack = this.localStream?.getVideoTracks()[0]
    if (sender && cameraTrack) await sender.replaceTrack(cameraTrack)
    this.cb.onScreenShareStopped?.()
  }

  // ---------- teardown ----------
  close({ notifyPeer = true } = {}) {
    if (this.closed) return
    if (notifyPeer) this.#send("bye", { from: this.clientId })
    this.closed = true
    clearTimeout(this.disconnectTimer)

    this.screenStream?.getTracks().forEach((track) => track.stop())
    this.localStream?.getTracks().forEach((track) => track.stop())
    this.chat?.close()
    this.pc?.close()
    // Give the "bye" message a moment to leave before the channel is torn down.
    const channel = this.channel
    if (channel) setTimeout(() => void this.supabase.removeChannel(channel), 400)
  }
}
