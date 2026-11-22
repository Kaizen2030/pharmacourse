/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useRef } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { friendlyError } from "../lib/friendlyError"
import { useAuth } from "../context/AuthContext"
import { isEmbeddedVideo, parseLessonVideo } from "../lib/videoEmbed"

export default function CoursePlayer() {
  const { courseId, lessonId } = useParams()
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [modules, setModules] = useState([])
  const [currentModule, setCurrentModule] = useState(null)
  const [completedIds, setCompletedIds] = useState(new Set())
  const [marking, setMarking] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [videoWatched, setVideoWatched] = useState(false)
  const [watchProgress, setWatchProgress] = useState(0)
  const [resumePosition, setResumePosition] = useState(0)
  const [attachments, setAttachments] = useState([])
  const [quizQuestions, setQuizQuestions] = useState([])
  const [userAnswers, setUserAnswers] = useState({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizScore, setQuizScore] = useState(null)
  const [quizPassed, setQuizPassed] = useState(false)
  const [quizAvailable, setQuizAvailable] = useState(false)
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizMeta, setQuizMeta] = useState(null)
  const [quizMessage, setQuizMessage] = useState("")
  const videoRef = useRef(null)
  const lastTimeRef = useRef(0)
  const saveIntervalRef = useRef(null)
  const completedIdsRef = useRef(new Set())

  const idFieldFallbacks = ["lesson_id", "module_id"]

  async function selectByAnyId(table, select, itemId, fields = idFieldFallbacks, single = false) {
    let lastError = null
    for (const field of fields) {
      try {
        const query = supabase.from(table).select(select)
        const response = single
          ? await query.eq(field, itemId).maybeSingle()
          : await query.eq(field, itemId)

        if (response.error) {
          const msg = String(response.error.message || "").toLowerCase()
          const missingField = msg.includes("could not find") && msg.includes(field)
          if (missingField) {
            lastError = response.error
            continue
          }
          return response
        }

        return response
      } catch (err) {
        lastError = err
      }
    }

    return { data: null, error: lastError }
  }

  useEffect(() => {
    async function load() {
      try {
        setError(null)
        setVideoWatched(false)
        setWatchProgress(0)
        setResumePosition(0)
        lastTimeRef.current = 0

        if (saveIntervalRef.current) {
          clearInterval(saveIntervalRef.current)
          saveIntervalRef.current = null
        }

        const { data: mods, error: modsErr } = await supabase
          .from("course_modules")
          .select("*")
          .eq("course_id", courseId)
          .order("order_index")

        if (modsErr) throw modsErr

        if (!mods || mods.length === 0) {
          setError("This course's lessons open after you enrol. Visit the course page to join.")
          setLoading(false)
          return
        }

        setModules(mods)

        const current = mods.find(m => m.id === lessonId)
        if (!current) {
          setError(`Module not found: ${lessonId}`)
          setLoading(false)
          return
        }

        setCurrentModule(current)

        if (user?.id) {
          const { data: prog, error: progErr } = await supabase
            .from("course_progress")
            .select("module_id, completed, last_position")
            .eq("user_id", user.id)
            .eq("course_id", courseId)

          if (!progErr && prog) {
            const doneIds = new Set(prog.filter(p => p.completed).map(p => p.module_id))
            setCompletedIds(doneIds)
            completedIdsRef.current = doneIds

            const isAlreadyDone = doneIds.has(lessonId)
            if (isAlreadyDone) {
              setVideoWatched(true)
              setWatchProgress(100)
            } else {
              const thisProgress = prog.find(p => p.module_id === lessonId)
              if (thisProgress?.last_position > 0) {
                setResumePosition(thisProgress.last_position)
                lastTimeRef.current = thisProgress.last_position
              }
            }
          }
        }

        setLoading(false)
      } catch (err) {
        console.error("Error loading course player:", err)
        setError(friendlyError(err, "We could not load this course. Please refresh the page."))
        setLoading(false)
      }
    }

    if (courseId && lessonId) load()

    return () => {
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current)
    }
  }, [courseId, lessonId, user?.id])

  useEffect(() => {
    const video = videoRef.current
    if (!video || resumePosition <= 0) return

    const seekToPosition = () => {
      if (video.readyState >= 2) video.currentTime = resumePosition
    }

    video.addEventListener("loadedmetadata", seekToPosition)
    seekToPosition()

    return () => video.removeEventListener("loadedmetadata", seekToPosition)
  }, [resumePosition, currentModule])

  async function savePosition(position) {
    if (!user?.id || !lessonId || !courseId) return null
    if (completedIdsRef.current.has(lessonId)) return null
    try {
      const { data, error } = await supabase.rpc("record_watch_heartbeat", {
        p_course: courseId,
        p_module: lessonId,
        p_position: Math.max(Math.floor(position || 0), 0),
      })
      if (error) throw error
      if (data) {
        if (data.watched_seconds >= data.required_seconds) setVideoWatched(true)
      }
      return data
    } catch (err) {
      console.error("Error saving watch progress:", err)
      return null
    }
  }

  async function writeCompletionToDB(moduleId) {
    if (!user?.id) {
      alert("You must be logged in.")
      return false
    }
    try {
      const { error } = await supabase.rpc("complete_module", { p_course: courseId, p_module: moduleId })
      if (error) {
        alert(friendlyError(error, "This module could not be completed yet."))
        return false
      }
      return true
    } catch (err) {
      console.error("Unexpected error completing module:", err)
      alert("This module could not be completed right now. Please try again.")
      return false
    }
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const blockContextMenu = (e) => e.preventDefault()

    const lockPlaybackRate = () => {
      if (!isAdmin && !completedIdsRef.current.has(lessonId) && video.playbackRate !== 1) {
        video.playbackRate = 1
      }
    }

    const handleTimeUpdate = () => {
      if (isAdmin || completedIdsRef.current.has(lessonId)) {
        setWatchProgress(100)
        setVideoWatched(true)
        return
      }

      const currentTime = video.currentTime
      const maxAllowed = lastTimeRef.current + 1.5

      if (currentTime > maxAllowed) {
        video.currentTime = lastTimeRef.current
      } else {
        if (currentTime > lastTimeRef.current) lastTimeRef.current = currentTime
      }

      if (video.duration) {
        const percent = Math.floor((lastTimeRef.current / video.duration) * 100)
        setWatchProgress(percent)
        if (percent >= 90) setVideoWatched(true)
      }
    }

    const blockSpeedKeys = (e) => {
      if (!isAdmin && !completedIdsRef.current.has(lessonId) && [">", "<", ".", ","].includes(e.key)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    saveIntervalRef.current = setInterval(() => {
      if (!isAdmin && video && !video.paused && video.currentTime > 0 && !completedIdsRef.current.has(lessonId)) {
        savePosition(video.currentTime)
      }
    }, 15000)

    const saveOnPause = () => {
      if (!isAdmin && !completedIdsRef.current.has(lessonId)) savePosition(video.currentTime)
    }

    const saveOnUnload = () => {
      if (!isAdmin && !completedIdsRef.current.has(lessonId)) savePosition(video.currentTime)
    }

    const handleVideoEnd = async () => {
      if (completedIdsRef.current.has(lessonId)) return

      setVideoWatched(true)
      setWatchProgress(100)

      if (!isAdmin && quizAvailable && !quizPassed) {
        return
      }

      const success = await writeCompletionToDB(lessonId)
      if (!success) return

      const newDoneIds = new Set([...completedIdsRef.current, lessonId])
      completedIdsRef.current = newDoneIds
      setCompletedIds(new Set(newDoneIds))

      const idx = modules.findIndex(m => m.id === lessonId)
      if (idx >= 0 && idx < modules.length - 1) {
        setTimeout(() => navigate(`/learn/${courseId}/${modules[idx + 1].id}`), 1200)
      } else {
        setTimeout(() => navigate(`/certificate/${courseId}`), 1200)
      }
    }

    video.addEventListener("contextmenu", blockContextMenu)
    video.addEventListener("ratechange", lockPlaybackRate)
    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("pause", saveOnPause)
    video.addEventListener("ended", handleVideoEnd)
    video.addEventListener("keydown", blockSpeedKeys)
    document.addEventListener("keydown", blockSpeedKeys)
    window.addEventListener("beforeunload", saveOnUnload)

    return () => {
      video.removeEventListener("contextmenu", blockContextMenu)
      video.removeEventListener("ratechange", lockPlaybackRate)
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("pause", saveOnPause)
      video.removeEventListener("ended", handleVideoEnd)
      video.removeEventListener("keydown", blockSpeedKeys)
      document.removeEventListener("keydown", blockSpeedKeys)
      window.removeEventListener("beforeunload", saveOnUnload)
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current)
    }
  }, [currentModule, lessonId, user?.id, modules, quizAvailable, quizPassed, isAdmin])

  useEffect(() => {
    if (isAdmin || (currentModule && !currentModule.video_url)) setVideoWatched(true)
  }, [currentModule, isAdmin])

  // Embedded players do not report playback, so while the lesson is open and the tab is visible the page sends a
  // heartbeat every 15 s. The server credits real elapsed time only, and decides when the module may complete.
  useEffect(() => {
    const isEmbed = isEmbeddedVideo(parseLessonVideo(currentModule?.video_url).kind)
    if (!isEmbed || isAdmin || !user?.id || completedIdsRef.current.has(lessonId)) return undefined

    let cancelled = false
    const beat = async () => {
      if (cancelled || document.visibilityState !== "visible") return
      const data = await savePosition(0)
      if (cancelled || !data) return
      const pct = data.required_seconds > 0
        ? Math.min(Math.floor((data.watched_seconds / data.required_seconds) * 90), 100)
        : 100
      setWatchProgress(pct)
    }
    beat()
    const interval = setInterval(beat, 15000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [currentModule?.id, lessonId, isAdmin, user?.id])

  useEffect(() => {
    async function loadLessonExtras() {
      if (!currentModule?.id) return
      setQuizLoading(true)
      try {
        const { data: attachmentData } = await selectByAnyId(
          "lesson_attachments",
          "*",
          currentModule.id,
          ["lesson_id", "module_id"],
          false
        )
        setAttachments(attachmentData || [])
      } catch (err) {
        console.error("Error loading attachments:", err)
        setAttachments([])
      }

      try {
        const { data: quizData, error: quizError } = await supabase.rpc("get_lesson_quiz", { p_lesson: currentModule.id })
        setUserAnswers({})
        setQuizSubmitted(false)
        setQuizScore(null)
        setQuizPassed(false)
        setQuizMessage("")
        if (quizError || !quizData || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
          setQuizAvailable(false)
          setQuizQuestions([])
          setQuizMeta(null)
        } else {
          setQuizAvailable(true)
          setQuizMeta({ id: quizData.id, passing_score: quizData.passing_score, title: quizData.title })
          setQuizQuestions(quizData.questions)
        }
      } catch (err) {
        console.error("Error loading quiz:", err)
        setQuizAvailable(false)
        setQuizQuestions([])
        setQuizMeta(null)
      } finally {
        setQuizLoading(false)
      }
    }

    loadLessonExtras()
  }, [currentModule?.id])

  async function markComplete() {
    if (!user?.id || !currentModule) {
      alert("You must be logged in to mark a module as complete")
      return
    }
    if (!isAdmin && !videoWatched) {
      alert("Please watch at least 90% of the video before marking this module as complete.")
      return
    }
    if (!isAdmin && quizAvailable && !quizPassed) {
      alert("Please complete the lesson quiz before marking this module as complete.")
      return
    }

    setMarking(true)
    try {
      const success = await writeCompletionToDB(lessonId)
      if (!success) return

      const newDoneIds = new Set([...completedIdsRef.current, lessonId])
      completedIdsRef.current = newDoneIds
      setCompletedIds(new Set(newDoneIds))

      const currentIdx = modules.findIndex(m => m.id === lessonId)
      if (currentIdx < modules.length - 1) {
        navigate(`/learn/${courseId}/${modules[currentIdx + 1].id}`)
      } else {
        navigate(`/certificate/${courseId}`)
      }
    } catch (err) {
      console.error("Unexpected error in markComplete:", err)
      alert(friendlyError(err, "Something went wrong. Please try again."))
    } finally {
      setMarking(false)
    }
  }

  function askAboutLesson() {
    if (!currentModule) return
    const params = new URLSearchParams({
      course_id: courseId,
      module_id: currentModule.id,
      module_title: currentModule.title || "",
    })
    navigate(`/community?${params.toString()}`)
  }

  async function submitQuiz() {
    if (!quizQuestions.length) return
    const unanswered = quizQuestions.filter(q => !userAnswers[q.id]).length
    if (unanswered > 0) {
      alert("Please answer all questions before submitting the quiz.")
      return
    }

    if (!quizMeta?.id) return
    const { data: result, error: submitError } = await supabase.rpc("submit_quiz", { p_quiz: quizMeta.id, p_answers: userAnswers })
    if (submitError || !result) {
      setQuizMessage(submitError?.message || "Your answers could not be submitted. Please try again.")
      return
    }
    const passed = !!result.passed
    setQuizMessage("")
    setQuizScore(result.score)
    setQuizPassed(passed)
    setQuizSubmitted(true)

    // Complete straight away only if the lesson has been watched; otherwise the student finishes watching first.
    if (passed && (videoWatched || isAdmin) && !completedIds.has(lessonId)) {
      const success = await writeCompletionToDB(lessonId)
      if (success) {
        const newDoneIds = new Set([...completedIdsRef.current, lessonId])
        completedIdsRef.current = newDoneIds
        setCompletedIds(new Set(newDoneIds))
      }
    }
  }

  const isCompleted = currentModule && completedIds.has(currentModule.id)
  const lessonVideo = parseLessonVideo(currentModule?.video_url, { start: resumePosition > 0 && !isCompleted ? resumePosition : 0 })
  const currentIndex = modules.findIndex(m => m.id === lessonId)
  const prevModuleDone = currentIndex === 0 || completedIds.has(modules[currentIndex - 1]?.id)
  const isLocked = !isAdmin && !prevModuleDone && !isCompleted

  if (typeof document !== "undefined" && !document.getElementById("hide-video-overflow")) {
    const s = document.createElement("style")
    s.id = "hide-video-overflow"
    s.textContent = `
      video::-webkit-media-controls-overflow-button { display: none !important; }
      video::-webkit-media-controls-picture-in-picture-button { display: none !important; }
      video::-webkit-media-controls-fullscreen-button { display: none !important; }
    `
    document.head.appendChild(s)
  }

  if (loading) {
    return (
      <div className="page" style={{ padding: "2rem", textAlign: "center", color: "var(--text-500)" }}>
        <p>Loading course...</p>
      </div>
    )
  }

  if (error || !currentModule) {
    return (
      <div className="page" style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "var(--danger)", marginBottom: "1rem" }}>
          {error || "Module not found"}
        </p>
        <Link to="/courses" style={{ color: "var(--blue)", textDecoration: "underline" }}>
          ← Back to courses
        </Link>
      </div>
    )
  }

  return (
    <div className="page" style={{ padding: 0 }}>
      <div className="player-layout">
        <aside className="player-sidebar">
          <div className="player-sidebar-title">Course Modules ({modules.length})</div>
          {modules.map((mod, idx) => {
            const active = mod.id === lessonId
            const done = completedIds.has(mod.id)
            const prevDone = idx === 0 || completedIds.has(modules[idx - 1]?.id)
            const locked = !isAdmin && !prevDone && !done
            return (
              <div
                key={mod.id}
                onClick={() => {
                  if (locked) { alert("Complete the previous module first."); return }
                  if (videoRef.current && !completedIdsRef.current.has(lessonId)) {
                    savePosition(videoRef.current.currentTime)
                  }
                  navigate(`/learn/${courseId}/${mod.id}`)
                }}
                className={`player-lesson${active ? " active" : ""}${done ? " done" : ""}${locked ? " locked" : ""}`}
                style={{ cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.5 : 1 }}
              >
                <div className={`lesson-check${done ? " done" : active ? " active" : ""}`}>
                  {done ? "✓" : locked ? "🔒" : mod.duration ? `${mod.duration}'` : idx + 1}
                </div>
                <span style={{ flex: 1 }}>{mod.title}</span>
              </div>
            )
          })}
        </aside>

        <main className="player-main">
          <div className="player-mobile-nav">
            <label htmlFor="mobile-module-select">Jump to module</label>
            <select
              id="mobile-module-select"
              value={lessonId}
              onChange={(e) => {
                const nextId = e.target.value
                const nextIndex = modules.findIndex((mod) => mod.id === nextId)
                const locked = !isAdmin && nextIndex > 0 && !completedIds.has(modules[nextIndex - 1]?.id) && !completedIds.has(nextId)

                if (locked) return

                if (videoRef.current && !completedIdsRef.current.has(lessonId)) {
                  savePosition(videoRef.current.currentTime)
                }

                navigate(`/learn/${courseId}/${nextId}`)
              }}
            >
              {modules.map((mod, idx) => {
                const done = completedIds.has(mod.id)
                const prevDone = idx === 0 || completedIds.has(modules[idx - 1]?.id)
                const locked = !isAdmin && !prevDone && !done

                return (
                  <option key={mod.id} value={mod.id} disabled={locked}>
                    {locked ? "Locked: " : done ? "Done: " : ""}{mod.title}
                  </option>
                )
              })}
            </select>
          </div>

          {isLocked ? (
            <div className="video-placeholder" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "400px", gap: "1rem" }}>
              <span style={{ fontSize: "3rem" }}>🔒</span>
              <p style={{ color: "var(--text-500)", fontWeight: 600 }}>Complete the previous module to unlock this one.</p>
              <button className="btn btn-primary" onClick={() => navigate(`/learn/${courseId}/${modules[currentIndex - 1].id}`)}>
                ← Go to Previous Module
              </button>
            </div>
          ) : (
            <>
              <div className="video-container" style={{ position: "relative" }}>
                {currentModule.video_url && lessonVideo.kind !== "unsupported" && user?.email ? (
                  <div className="lesson-watermark" aria-hidden="true">{user.email} · {String(user.id).slice(0, 8)}</div>
                ) : null}
                {currentModule.video_url ? (
                  lessonVideo.kind === "unsupported" ? (
                    <div className="video-placeholder">
                      <div>
                        <p>This lesson's video link cannot be played.</p>
                        <small>Please let your tutor know so they can fix it.</small>
                      </div>
                    </div>
                  ) : isEmbeddedVideo(lessonVideo.kind) ? (
                    <iframe
                      key={lessonVideo.src}
                      src={lessonVideo.src}
                      title={currentModule.title}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, backgroundColor: "#000" }}
                      allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                      sandbox="allow-scripts allow-same-origin allow-presentation"
                      loading="lazy"
                      onLoad={() => {
                        if (isAdmin || completedIdsRef.current.has(lessonId)) {
                          setVideoWatched(true)
                          setWatchProgress(100)
                        }
                      }}
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      src={lessonVideo.src}
                      controls
                      controlsList="nodownload noremoteplayback noplaybackrate"
                      disablePictureInPicture
                      playsInline
                      onContextMenu={e => e.preventDefault()}
                      style={{ width: "100%", height: "100%", objectFit: "contain", backgroundColor: "#000" }}
                    />
                  )
                ) : (
                  <div className="video-placeholder">
                    <div>
                      <p>🎥 Video not uploaded yet</p>
                      <small>Check back soon!</small>
                    </div>
                  </div>
                )}
              </div>

              {resumePosition > 0 && !isCompleted && !isAdmin && (
                <div style={{ padding: "0.5rem 2rem", background: "#fef9c3", borderBottom: "1px solid #fde68a", fontSize: "0.85rem", color: "#92400e", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  ▶ Resuming from {Math.floor(resumePosition / 60)}m {Math.floor(resumePosition % 60)}s — where you left off
                </div>
              )}

              {isCompleted && (
                <div style={{ padding: "0.5rem 2rem", background: "#dcfce7", borderBottom: "1px solid #bbf7d0", fontSize: "0.85rem", color: "#15803d", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  ✅ You completed this module — rewatch freely and scrub anywhere
                </div>
              )}

              {isAdmin && (
                <div style={{ padding: "0.5rem 2rem", background: "#e8f5f0", borderBottom: "1px solid #b8dfd3", fontSize: "0.85rem", color: "#0F6E56", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  Admin preview mode - all modules unlocked, free scrubbing enabled, and certificate preview available.
                </div>
              )}

              {currentModule.video_url && !isCompleted && !isAdmin && (
                <div style={{ padding: "0.75rem 2rem", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-500)" }}>
                      {videoWatched ? "✅ Ready to complete" : `Watch ${Math.max(90 - watchProgress, 0)}% more to unlock completion`}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-500)" }}>{watchProgress}%</span>
                  </div>
                  <div style={{ height: "4px", background: "var(--border)", borderRadius: "2px" }}>
                    <div style={{
                      height: "100%",
                      width: `${watchProgress}%`,
                      background: videoWatched ? "var(--green, #16a34a)" : "var(--blue, #2563eb)",
                      borderRadius: "2px",
                      transition: "width 0.5s ease"
                    }} />
                  </div>
                </div>
              )}

              <div className="lesson-title-bar">
                <div>
                  <h2>{currentModule.title}</h2>
                  {currentModule.duration && (
                    <p style={{ color: "var(--text-500)", fontSize: "0.9rem", margin: "0.25rem 0 0 0" }}>
                      ⏱️ {currentModule.duration} minutes
                    </p>
                  )}
                </div>
                <div className="lesson-actions" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
                  <button
                    onClick={askAboutLesson}
                    className="btn btn-secondary"
                    style={{ minWidth: "12rem" }}
                  >
                    Ask about this lesson
                  </button>
                  {!isCompleted && (
                    <button
                      onClick={markComplete}
                      disabled={marking || (!videoWatched && !isAdmin)}
                      className="btn btn-primary"
                      title={!videoWatched && !isAdmin ? "Watch at least 90% of the video first" : ""}
                      style={{ opacity: videoWatched || isAdmin ? 1 : 0.5, cursor: videoWatched || isAdmin ? "pointer" : "not-allowed" }}
                    >
                      {marking ? "Saving…" : isAdmin ? "Mark Complete (Admin Preview)" : videoWatched ? "Mark as Complete →" : `Watch video to unlock (${watchProgress}%)`}
                    </button>
                  )}
                  {isCompleted && (
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ color: "var(--success, #16a34a)", fontWeight: 600 }}>✅ Completed</span>
                      {currentIndex < modules.length - 1 ? (
                        <button
                          className="btn btn-primary"
                          onClick={() => navigate(`/learn/${courseId}/${modules[currentIndex + 1].id}`)}
                          style={{ background: "#16a34a", borderColor: "#16a34a" }}
                        >
                          Next Module →
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary"
                          onClick={() => navigate(`/certificate/${courseId}`)}
                          style={{ background: "#16a34a", borderColor: "#16a34a" }}
                        >
                          {isAdmin ? "Preview Certificate" : "Get Certificate 🎓"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {currentModule.description && (
                <p className="lesson-desc">{currentModule.description}</p>
              )}

              {attachments.length > 0 && (
                <section style={{ marginTop: "1.5rem", padding: "1.75rem", borderRadius: "18px", background: "#f8faf9", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Lesson Materials</h3>
                      <p style={{ margin: "0.35rem 0 0", color: "var(--text-500)", fontSize: "0.93rem" }}>
                        Download supporting files for this lesson.
                      </p>
                    </div>
                    <span style={{ color: "var(--text-500)", fontSize: "0.9rem" }}>
                      {attachments.length} item{attachments.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginTop: "1.25rem" }}>
                    {attachments.map(att => (
                      <a
                        key={att.id}
                        href={att.file_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        style={{
                          padding: "1rem 1.1rem",
                          background: "#fff",
                          borderRadius: "14px",
                          border: "1px solid var(--border)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.35rem",
                          textDecoration: "none",
                          color: "inherit"
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{att.title || att.file_name || "Attachment"}</span>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-500)" }}>
                          {att.description || att.file_type || "Download file"}
                        </span>
                        <span style={{ alignSelf: "flex-start", fontSize: "0.8rem", color: "var(--primary)" }}>Download</span>
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {quizAvailable && (
                <section style={{ marginTop: "1.5rem", padding: "1.75rem", borderRadius: "18px", background: "#f8faf9", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                    <div>
                      <span style={{ display: "inline-block", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#0F6E56" }}>
                        Lesson Quiz
                      </span>
                      <h3 style={{ margin: "0.5rem 0 0", fontSize: "1.2rem" }}>
                        Pass with {quizMeta?.passing_score ?? 70}% to complete this module.
                      </h3>
                    </div>
                    <div style={{ fontWeight: 700, color: "#0F6E56" }}>
                      {quizSubmitted ? `Score: ${quizScore}%` : `${quizQuestions.length} questions`}
                    </div>
                  </div>

                  {quizLoading ? (
                    <p style={{ marginTop: "1rem", color: "var(--text-500)" }}>Loading quiz...</p>
                  ) : quizSubmitted ? (
                    <div style={{ marginTop: "1.5rem", display: "grid", gap: "1rem" }}>
                      <div style={{ padding: "1rem", borderRadius: "14px", background: quizPassed ? "#dcfce7" : "#fee2e2", color: quizPassed ? "#166534" : "#991b1b" }}>
                        <strong>{quizPassed ? "✅ Passed!" : "❌ Quiz incomplete"}</strong>
                        <p style={{ margin: "0.5rem 0 0" }}>
                          {quizPassed ? "You can now mark this module complete." : "Review your answers and try again."}
                        </p>
                      </div>
                      {!quizPassed && (
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => {
                            setQuizSubmitted(false)
                            setQuizScore(null)
                            setQuizPassed(false)
                            setUserAnswers({})
                          }}
                        >
                          Retake Quiz
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ marginTop: "1.5rem", display: "grid", gap: "1.5rem" }}>
                      {quizQuestions.map((question, idx) => (
                        <div key={question.id} style={{ padding: "1rem", borderRadius: "14px", background: "#fff", border: "1px solid var(--border)" }}>
                          <div style={{ marginBottom: "0.75rem", fontWeight: 700 }}>{idx + 1}. {question.question_text}</div>
                          <div style={{ display: "grid", gap: "0.75rem" }}>
                            {(question.options || []).map((opt, optIndex) => {
                              const optionText = String(opt.text || opt.label || opt.value || "").trim()
                              return (
                                <label key={optIndex} style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", color: "var(--text-900)" }}>
                                  <input
                                    type="radio"
                                    name={`quiz-${question.id}`}
                                    value={optionText}
                                    checked={userAnswers[question.id] === optionText}
                                    onChange={() => setUserAnswers(prev => ({ ...prev, [question.id]: optionText }))}
                                  />
                                  <span>{optionText}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      ))}

                      {quizMessage && (
                        <p role="alert" style={{ margin: 0, color: "#991b1b" }}>{quizMessage}</p>
                      )}
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={submitQuiz}
                        disabled={quizQuestions.some(q => !userAnswers[q.id])}
                      >
                        Submit Quiz
                      </button>
                    </div>
                  )}
                </section>
              )}

              <div style={{ marginTop: "2rem", padding: "0 2rem 2rem", borderTop: "1px solid var(--border)", paddingTop: "2rem" }}>
                <p style={{ color: "var(--text-500)", fontSize: "0.9rem" }}>
                  Module {currentIndex + 1} of {modules.length}
                </p>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
