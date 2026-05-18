/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useRef } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { useAuth } from "../context/AuthContext"

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
          setError("No modules found for this course")
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
        setError(err.message || "Error loading course")
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
    if (!user?.id || !lessonId || position <= 0) return
    if (completedIdsRef.current.has(lessonId)) return
    try {
      const { data: existing } = await supabase
        .from("course_progress")
        .select("id")
        .eq("user_id", user.id)
        .eq("module_id", lessonId)
        .eq("course_id", courseId)
        .maybeSingle()

      if (existing?.id) {
        await supabase
          .from("course_progress")
          .update({ last_position: Math.floor(position) })
          .eq("id", existing.id)
      } else {
        await supabase.from("course_progress").insert({
          user_id: user.id,
          course_id: courseId,
          module_id: lessonId,
          completed: false,
          last_position: Math.floor(position)
        })
      }
    } catch (err) {
      console.error("Error saving position:", err)
    }
  }

  async function writeCompletionToDB(moduleId) {
    if (!user?.id) {
      alert("You must be logged in.")
      return false
    }
    try {
      const { error } = await supabase
        .from("course_progress")
        .upsert(
          {
            user_id: user.id,
            course_id: courseId,
            module_id: moduleId,
            completed: true,
            last_position: 0,
            completed_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,course_id,module_id",
            ignoreDuplicates: false,
          }
        )

      if (error) {
        console.error("Supabase upsert error:", error)
        alert(`Error saving progress: ${error.message || JSON.stringify(error)}`)
        return false
      }
      return true
    } catch (err) {
      console.error("Unexpected error writing completion:", err)
      alert(`Unexpected error: ${err.message || err}`)
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
    }, 10000)

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
        const { data: quizData, error: quizError } = await supabase
          .from("lesson_quizzes")
          .select("id, lesson_id, title, passing_score, quiz_questions(*)")
          .eq("lesson_id", currentModule.id)
          .maybeSingle()

        if (quizError || !quizData) {
          setQuizAvailable(false)
          setQuizQuestions([])
        } else if (Array.isArray(quizData.quiz_questions) && quizData.quiz_questions.length > 0) {
          setQuizAvailable(true)
          setQuizQuestions(
            quizData.quiz_questions.map(q => ({
              ...q,
              quiz_id: q.quiz_id || q.quizId || quizData.id,
              lesson_id: q.lesson_id || quizData.lesson_id,
              module_id: q.module_id || quizData.module_id,
            }))
          )
          setUserAnswers({})
          setQuizSubmitted(false)
          setQuizScore(null)
          setQuizPassed(false)
        } else {
          setQuizAvailable(false)
          setQuizQuestions([])
        }
      } catch (err) {
        console.error("Error loading quiz:", err)
        setQuizAvailable(false)
        setQuizQuestions([])
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
      alert("Unexpected error: " + (err.message || "Unknown error"))
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

    let correct = 0
    quizQuestions.forEach(q => {
      const userAnswer = userAnswers[q.id]
      const answerText = String(userAnswer || "").trim()
      const correctAnswer = q.correct_answer ?? q.correctAnswer ?? q.correct_option ?? q.correctOption
      const optionMatch = Array.isArray(q.options)
        ? q.options.find(opt => String(opt.text || opt.label || opt.value || "").trim() === answerText)
        : null
      const isCorrect = correctAnswer
        ? String(correctAnswer).trim() === answerText
        : !!optionMatch && (optionMatch.is_correct || optionMatch.isCorrect)
      if (isCorrect) correct += 1
    })

    const score = quizQuestions.length ? Math.round((correct / quizQuestions.length) * 100) : 0
    const passed = score >= 70

    setQuizScore(score)
    setQuizPassed(passed)
    setQuizSubmitted(true)

    if (user?.id) {
      try {
        await supabase.from("user_quiz_attempts").insert({
          user_id: user.id,
          quiz_id: quizQuestions[0]?.quiz_id || null,
          module_id: currentModule.id,
          score,
          passed,
          answers: userAnswers,
          completed_at: new Date().toISOString(),
        })
      } catch (err) {
        console.error("Error saving quiz attempt:", err)
      }
    }

    if (passed && !completedIds.has(lessonId)) {
      const success = await writeCompletionToDB(lessonId)
      if (success) {
        const newDoneIds = new Set([...completedIdsRef.current, lessonId])
        completedIdsRef.current = newDoneIds
        setCompletedIds(new Set(newDoneIds))
      }
    }
  }

  const isCompleted = currentModule && completedIds.has(currentModule.id)
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
                {currentModule.video_url ? (
                  currentModule.video_url.includes("drive.google.com") ? (
                    <div style={{ position: "relative", width: "100%", height: "100%", backgroundColor: "#000", overflow: "hidden" }}>
                      <iframe
                        src={(() => {
                          const match = currentModule.video_url.match(/\/d\/([a-zA-Z0-9_-]+)/)
                          return match
                            ? `https://drive.google.com/file/d/${match[1]}/preview?rm=minimal`
                            : currentModule.video_url
                        })()}
                        style={{
                          position: "absolute",
                          top: "-46px",
                          left: 0,
                          width: "100%",
                          height: "calc(100% + 92px)",
                          border: "none"
                        }}
                        allow="autoplay; fullscreen"
                        allowFullScreen
                        title={currentModule.title}
                        onLoad={() => {
                          if (isAdmin || completedIdsRef.current.has(lessonId)) {
                            setVideoWatched(true)
                            setWatchProgress(100)
                            return
                          }
                          if (currentModule.duration) {
                            const totalMs = currentModule.duration * 60 * 1000
                            const alreadyWatchedMs = resumePosition * 1000
                            const remaining = Math.max(totalMs * 0.9 - alreadyWatchedMs, 0)
                            const startPct = resumePosition > 0
                              ? Math.min(Math.floor((resumePosition / (currentModule.duration * 60)) * 100), 89)
                              : 0
                            setWatchProgress(startPct)
                            const interval = setInterval(() => {
                              setWatchProgress(prev => {
                                const next = Math.min(prev + 1, 100)
                                if (next >= 90) { setVideoWatched(true); clearInterval(interval) }
                                return next
                              })
                            }, totalMs / 100)
                            setTimeout(() => setVideoWatched(true), remaining)
                          } else {
                            setTimeout(() => setVideoWatched(true), 2 * 60 * 1000)
                          }
                        }}
                      />
                    </div>
                  ) : currentModule.video_url.includes("youtube") ||
                    currentModule.video_url.includes("youtu.be") ||
                    currentModule.video_url.includes("vimeo") ? (
                    <iframe
                      src={
                        currentModule.video_url
                          .replace("watch?v=", "embed/")
                          .replace("youtu.be/", "youtube.com/embed/")
                          .replace(/^http:/, "https:") +
                        "?modestbranding=1&rel=0&disablekb=1" +
                        (resumePosition > 0 && !isCompleted ? `&start=${Math.floor(resumePosition)}` : "")
                      }
                      style={{ width: "100%", height: "100%", border: "none" }}
                      allowFullScreen
                      title={currentModule.title}
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      src={currentModule.video_url}
                      controls
                      controlsList="nodownload noremoteplayback noplaybackrate"
                      disablePictureInPicture
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
                        Pass with 70% to complete this module.
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
