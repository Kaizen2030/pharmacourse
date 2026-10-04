import { mkdir, rm } from "node:fs/promises"
import express from "express"
import cors from "cors"
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from "@whiskeysockets/baileys"
import pino from "pino"
import QRCode from "qrcode"
import { createClient } from "@supabase/supabase-js"

const port = Number(process.env.PORT || 8787)
const authDirectory = process.env.WHATSAPP_AUTH_DIR || "./data/whatsapp-auth"
const allowedOrigins = new Set((process.env.APP_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean))

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const app = express()
const sessions = new Map()
const jobs = new Map()
const lastBroadcastAt = new Map()
const logger = pino({ level: process.env.LOG_LEVEL || "warn" })

function normalizeNumber(value) {
  let number = String(value || "").replace(/\D/g, "")
  if (number.startsWith("0")) number = `254${number.slice(1)}`
  if (number.length < 9 || number.length > 15) throw new Error("Enter a valid WhatsApp number.")
  return number
}

function publicInstance(session) {
  return {
    id: session.id,
    label: session.label,
    status: session.status,
    phone: session.phone ? `+${session.phone}` : null,
    qr: session.qr,
  }
}

async function getTutor(userId) {
  const { data, error } = await supabase
    .from("instructors")
    .select("id, name, whatsapp_number")
    .eq("linked_user_id", userId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error("This login is not linked to a tutor profile.")
  if (!data.whatsapp_number) throw new Error("Save your WhatsApp number in tutor settings first.")
  return { ...data, whatsapp_number: normalizeNumber(data.whatsapp_number) }
}

async function authorizeTutor(request, response, next) {
  try {
    const token = (request.get("authorization") || "").replace(/^Bearer\s+/i, "")
    if (!token) return response.status(401).json({ error: "Sign in to continue." })
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return response.status(401).json({ error: "Your session is invalid or expired." })
    request.user = user
    request.tutor = await getTutor(user.id)
    next()
  } catch (error) {
    response.status(403).json({ error: error.message || "Tutor account verification failed." })
  }
}

function requireOwnedInstance(request, response, next) {
  if (request.params.id !== request.tutor.id) {
    return response.status(403).json({ error: "You can only manage your own WhatsApp connection." })
  }
  next()
}

async function startInstance(tutor) {
  const existing = sessions.get(tutor.id)
  if (existing && ["connecting", "awaiting_scan", "connected"].includes(existing.status)) return existing

  const session = {
    id: tutor.id,
    label: tutor.name,
    expectedPhone: tutor.whatsapp_number,
    phone: null,
    status: "connecting",
    qr: null,
    socket: null,
    manualClose: false,
  }
  sessions.set(session.id, session)

  const sessionDirectory = `${authDirectory}/${session.id}`
  await mkdir(sessionDirectory, { recursive: true })
  const { state, saveCreds } = await useMultiFileAuthState(sessionDirectory)
  const socket = makeWASocket({
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ["PharmaCourse", "Chrome", "1.0.0"],
  })
  session.socket = socket
  socket.ev.on("creds.update", saveCreds)
  socket.ev.on("connection.update", async (update) => {
    if (sessions.get(session.id) !== session) return
    if (update.qr) {
      session.qr = update.qr
      session.status = "awaiting_scan"
    }
    if (update.connection === "open") {
      const actualPhone = String(socket.user?.id || "").split(":")[0].replace(/\D/g, "")
      if (actualPhone !== session.expectedPhone) {
        session.status = "wrong_account"
        session.qr = null
        await socket.logout().catch(() => {})
        return
      }
      session.phone = actualPhone
      session.qr = null
      session.status = "connected"
    }
    if (update.connection === "close") {
      const statusCode = update.lastDisconnect?.error?.output?.statusCode
      session.socket = null
      session.phone = null
      session.qr = null
      if (session.manualClose || statusCode === DisconnectReason.loggedOut) {
        session.status = "disconnected"
        return
      }
      session.status = "reconnecting"
      setTimeout(() => void startInstance(tutor).catch(() => { session.status = "error" }), 3000)
    }
  })
  return session
}

async function getOwnedCourse(tutorId, courseId) {
  const { data, error } = await supabase
    .from("courses")
    .select("id, title")
    .eq("id", courseId)
    .eq("instructor_id", tutorId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error("This course is not assigned to your tutor profile.")
  return data
}

async function getOptedInRecipients(courseId) {
  const { data: enrollments, error: enrollmentError } = await supabase
    .from("course_enrollments")
    .select("user_id")
    .eq("course_id", courseId)
  if (enrollmentError) throw enrollmentError
  const userIds = [...new Set((enrollments || []).map((row) => row.user_id).filter(Boolean))]
  if (!userIds.length) return []

  const { data: profiles, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, whatsapp_number")
    .in("id", userIds)
    .eq("whatsapp_opted_in", true)
  if (profileError) throw profileError
  return (profiles || []).flatMap((profile) => {
    try {
      return profile.whatsapp_number ? [{ id: profile.id, number: normalizeNumber(profile.whatsapp_number) }] : []
    } catch {
      return []
    }
  })
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true)
    return callback(new Error("Origin is not allowed"))
  },
}))
app.use(express.json({ limit: "16kb" }))
app.get("/health", (_request, response) => response.json({ ok: true }))
app.use("/", authorizeTutor)

app.get("/instances", (request, response) => {
  const session = sessions.get(request.tutor.id)
  response.json(session ? [publicInstance(session)] : [])
})

app.post("/instances", async (request, response) => {
  try {
    if (request.body?.id && request.body.id !== request.tutor.id) {
      return response.status(403).json({ error: "Instance must belong to your tutor profile." })
    }
    const session = await startInstance({ ...request.tutor, name: request.body?.label || request.tutor.name })
    response.json(publicInstance(session))
  } catch (error) {
    response.status(500).json({ error: error.message || "Could not create WhatsApp connection." })
  }
})

app.get("/instances/:id/qr", requireOwnedInstance, async (request, response) => {
  try {
    let session = sessions.get(request.params.id)
    if (!session) session = await startInstance(request.tutor)
    const qr = session.qr ? await QRCode.toDataURL(session.qr, { width: 260, margin: 1 }) : null
    response.json({ ...publicInstance(session), qr })
  } catch (error) {
    response.status(500).json({ error: error.message || "Could not load pairing QR." })
  }
})

app.post("/instances/:id/pair", requireOwnedInstance, async (request, response) => {
  try {
    const phone = normalizeNumber(request.body?.phone)
    if (phone !== request.tutor.whatsapp_number) {
      return response.status(400).json({ error: "The pairing number must match your saved tutor WhatsApp number." })
    }
    let session = sessions.get(request.params.id)
    if (!session) session = await startInstance(request.tutor)
    if (session.status === "connected") return response.json(publicInstance(session))
    response.json({ ...publicInstance(session), pairing: "Scan the QR code returned by GET /instances/:id/qr." })
  } catch (error) {
    response.status(400).json({ error: error.message || "Could not begin pairing." })
  }
})

app.post("/instances/:id/restart", requireOwnedInstance, async (request, response) => {
  const current = sessions.get(request.params.id)
  if (current?.socket) current.socket.end(new Error("Tutor requested reconnect"))
  sessions.delete(request.params.id)
  try {
    response.json(publicInstance(await startInstance(request.tutor)))
  } catch (error) {
    response.status(500).json({ error: error.message || "Could not reconnect WhatsApp." })
  }
})

app.delete("/instances/:id", requireOwnedInstance, async (request, response) => {
  const session = sessions.get(request.params.id)
  if (session) {
    session.manualClose = true
    await session.socket?.logout().catch(() => {})
    sessions.delete(request.params.id)
  }
  await rm(`${authDirectory}/${request.params.id}`, { recursive: true, force: true })
  response.json({ ok: true })
})

app.post("/instances/:id/send", requireOwnedInstance, async (request, response) => {
  try {
    const session = sessions.get(request.params.id)
    if (session?.status !== "connected" || !session.socket) return response.status(503).json({ error: "Connect your WhatsApp account first." })
    const course = await getOwnedCourse(request.tutor.id, request.body?.courseId)
    const text = String(request.body?.text || "").trim().slice(0, 1500)
    const recipientNumber = normalizeNumber(request.body?.to)
    if (!text) return response.status(400).json({ error: "Message cannot be empty." })
    const recipients = await getOptedInRecipients(course.id)
    const recipient = recipients.find((item) => item.number === recipientNumber)
    if (!recipient) return response.status(403).json({ error: "Only an opted-in learner enrolled in your course can receive a message." })
    await session.socket.sendMessage(`${recipient.number}@s.whatsapp.net`, { text })
    response.json({ ok: true })
  } catch (error) {
    response.status(400).json({ error: error.message || "Message was not sent." })
  }
})

app.post("/instances/:id/broadcast", requireOwnedInstance, async (request, response) => {
  try {
    const session = sessions.get(request.params.id)
    if (session?.status !== "connected" || !session.socket) return response.status(503).json({ error: "Connect your WhatsApp account first." })
    const lastSentAt = lastBroadcastAt.get(session.id) || 0
    if (Date.now() - lastSentAt < 15 * 60 * 1000) {
      return response.status(429).json({ error: "Wait 15 minutes between course broadcasts." })
    }
    const course = await getOwnedCourse(request.tutor.id, request.body?.courseId)
    const text = String(request.body?.text || "").trim().slice(0, 1500)
    if (!text) return response.status(400).json({ error: "Message cannot be empty." })
    const recipients = (await getOptedInRecipients(course.id)).slice(0, 200)
    if (recipients.length === 0) return response.status(400).json({ error: "There are no opted-in learners enrolled in this course." })
    const jobId = crypto.randomUUID()
    const job = { id: jobId, ownerId: request.user.id, instanceId: session.id, status: "queued", sent: 0, failed: 0 }
    jobs.set(jobId, job)
    lastBroadcastAt.set(session.id, Date.now())

    void (async () => {
      job.status = "sending"
      for (const recipient of recipients) {
        try {
          await session.socket.sendMessage(`${recipient.number}@s.whatsapp.net`, { text })
          job.sent += 1
        } catch {
          job.failed += 1
        }
        await new Promise((resolve) => setTimeout(resolve, 1200))
      }
      job.status = "complete"
      const { error } = await supabase.from("whatsapp_broadcast_log").insert({
        instance_id: session.id,
        course_id: course.id,
        sent: job.sent,
        failed: job.failed,
        created_by: request.user.id,
      })
      if (error) console.error("Broadcast log write failed:", error.message)
    })().catch((error) => {
      job.status = "failed"
      job.error = error.message
    })
    response.status(202).json({ jobId, recipients: recipients.length })
  } catch (error) {
    response.status(400).json({ error: error.message || "Broadcast was not started." })
  }
})

app.get("/jobs/:jobId", (request, response) => {
  const job = jobs.get(request.params.jobId)
  if (!job || job.ownerId !== request.user.id) return response.status(404).json({ error: "Job not found." })
  response.json({ id: job.id, status: job.status, sent: job.sent, failed: job.failed, error: job.error || null })
})

app.listen(port, "0.0.0.0", () => console.log(`Self-hosted WhatsApp gateway listening on port ${port}`))