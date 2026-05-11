import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { CheckCircle, AlertCircle, Loader, ChevronRight } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { supabase } from "../lib/supabaseClient"

const SCORE_COLOR = score => score == null ? "#888" : score >= 80 ? "#0F6E56" : score >= 50 ? "#E09B00" : "#E24B4A"
const SCORE_LABEL = score => score == null ? "Not Scored" : score >= 80 ? "Excellent" : score >= 50 ? "Good Attempt" : "Needs Review"

function normalizeAiFeedback(parsed, questionCount) {
  const questions = Array.from({ length: questionCount }, (_, index) => {
    const item = parsed?.questions?.[index] || {}
    return {
      score: Number.isFinite(item.score) ? item.score : null,
      feedback: typeof item.feedback === "string" && item.feedback.trim()
        ? item.feedback.trim()
        : "Response recorded. Compare with the model answer for self-assessment.",
      correct_points: Array.isArray(item.correct_points) ? item.correct_points.filter(Boolean) : [],
      missed_points: Array.isArray(item.missed_points) ? item.missed_points.filter(Boolean) : []
    }
  })

  return {
    overall_score: Number.isFinite(parsed?.overall_score) ? parsed.overall_score : null,
    summary: typeof parsed?.summary === "string" && parsed.summary.trim()
      ? parsed.summary.trim()
      : "Your responses have been recorded.",
    questions
  }
}

export default function CaseSimulation() {
  const { simulationId } = useParams()
  const { user } = useAuth()
  const [sim, setSim] = useState(null)
  const [answers, setAnswers] = useState({})
  const [feedback, setFeedback] = useState(null)
  const [aiError, setAiError] = useState("")
  const [hasSavedAttempt, setHasSavedAttempt] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState("case")

  useEffect(() => {
    async function load() {
      if (!simulationId) return

      if (!user) {
        setLoading(false)
        return
      }

      const { data: simData } = await supabase
        .from("case_simulations")
        .select("*")
        .eq("id", simulationId)
        .single()

      setSim(simData || null)

      const { data: existing } = await supabase
        .from("simulation_responses")
        .select("*")
        .eq("simulation_id", simulationId)
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing) {
        setHasSavedAttempt(true)
        setAnswers(existing.responses || {})
        setFeedback(existing.ai_feedback || null)
        setStep("feedback")
      } else {
        setHasSavedAttempt(false)
      }

      setLoading(false)
    }

    load()
  }, [simulationId, user])

  const questions = Array.isArray(sim?.questions) ? sim.questions : []

  function startRetake() {
    setAnswers({})
    setFeedback(null)
    setAiError("")
    setStep("questions")
  }

  async function handleSubmit() {
    if (!user || !sim) return

    const unanswered = questions.filter((_, index) => !answers[index]?.trim())
    if (unanswered.length > 0) {
      alert(`Please answer all ${questions.length} question${questions.length > 1 ? "s" : ""} before submitting.`)
      return
    }

    setSubmitting(true)
    setAiError("")

    const promptParts = questions.map((question, index) => (
      `Question ${index + 1}: ${question.text}\n` +
      `Model Answer: ${question.model_answer || "Not provided"}\n` +
      `Learner's Answer: ${answers[index]}`
    )).join("\n\n")

    const fullPrompt = `You are a clinical pharmacy examiner assessing a pharmacy learner's case simulation. In your summary and feedback, refer to the learner in second person (for example: "You demonstrated..." or "Your answer showed..."). Never say "the student".
Be constructive, specific, and educational. Always reference Kenyan clinical practice guidelines where relevant.
Respond ONLY with a valid JSON object - no markdown, no backticks, no preamble.
Think step by step internally, but output only the JSON object.

Patient Case: ${sim.patient_scenario}

${promptParts}

Return a JSON object with this exact structure:
{
  "overall_score": <number 0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "questions": [
    {
      "score": <0-100>,
      "feedback": "<specific feedback for this answer>",
      "correct_points": ["point1", "point2"],
      "missed_points": ["point1", "point2"]
    }
  ]
}

Example output:
{"overall_score":85,"summary":"Strong antibiotic stewardship reasoning with a few dosing details to refine.","questions":[{"score":80,"feedback":"Good answer overall with clear justification.","correct_points":["Selected appropriate antibiotics","Explained stewardship rationale"],"missed_points":["Could be more precise on dosing"]}]}

Your output:`

    let aiFeedback = null

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("score-simulation", {
        body: { prompt: fullPrompt, questionCount: questions.length }
      })

      if (fnError || !fnData?.success) {
        throw new Error(fnData?.error || fnError?.message || "Edge function failed")
      }

      aiFeedback = normalizeAiFeedback(fnData.data, questions.length)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error("Simulation scoring error:", error)
      setAiError(message)
      aiFeedback = {
        overall_score: null,
        summary: "Your responses have been recorded. AI feedback is temporarily unavailable. Please review the model answers below.",
        questions: questions.map(() => ({
          score: null,
          feedback: "Response recorded. Compare with the model answer for self-assessment.",
          correct_points: [],
          missed_points: []
        }))
      }
    }

    const { error: insertError } = await supabase.from("simulation_responses").insert({
      user_id: user.id,
      simulation_id: sim.id,
      responses: answers,
      ai_feedback: aiFeedback,
      overall_score: aiFeedback.overall_score,
      submitted_at: new Date().toISOString()
    })

    if (insertError) {
      console.error("Failed to save response:", insertError)
    }

    setFeedback(aiFeedback)
    setStep("feedback")
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid #eee",
            borderTopColor: "#0F6E56",
            borderRadius: "50%",
            animation: "spin .7s linear infinite"
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!sim) {
    return (
      <div className="page" style={{ textAlign: "center" }}>
        <p style={{ color: "var(--text-500)" }}>Simulation not found.</p>
        <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: "1rem" }}>
          Back to Dashboard
        </Link>
      </div>
    )
  }

  const score = feedback?.overall_score ?? null

  if (step === "feedback") {
    return (
      <div className="page">
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "2rem 1rem 4rem" }}>
          <Link
            to="/dashboard"
            style={{ color: "var(--text-500)", fontSize: ".85rem", display: "inline-flex", alignItems: "center", gap: ".35rem", marginBottom: "1.5rem" }}
          >
            Back to Dashboard
          </Link>

          <div
            style={{
              background: `linear-gradient(135deg, ${SCORE_COLOR(score)}18, ${SCORE_COLOR(score)}08)`,
              border: `1.5px solid ${SCORE_COLOR(score)}40`,
              borderRadius: 18,
              padding: "2rem 2.5rem",
              marginBottom: "2rem",
              display: "flex",
              alignItems: "center",
              gap: "2rem",
              flexWrap: "wrap"
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3.5rem", fontWeight: 900, color: SCORE_COLOR(score), lineHeight: 1 }}>{score ?? "-"}</div>
              <div style={{ fontSize: ".78rem", fontWeight: 700, color: SCORE_COLOR(score), textTransform: "uppercase", letterSpacing: 0.8, marginTop: 4 }}>
                / 100
              </div>
            </div>
            <div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0a2e1f", marginBottom: ".35rem" }}>
                {SCORE_LABEL(score)}
              </div>
              <p style={{ color: "#555", fontSize: ".9rem", lineHeight: 1.7, margin: 0, maxWidth: 520 }}>
                {feedback?.summary}
              </p>
            </div>
          </div>

          {aiError && (
            <div
              style={{
                background: "#fff8e7",
                border: "1.5px solid #E09B00",
                borderRadius: 12,
                padding: "1rem 1.25rem",
                marginBottom: "1.25rem"
              }}
            >
              <p style={{ margin: "0 0 .35rem", fontSize: ".85rem", fontWeight: 700, color: "#7a4f00" }}>
                Gemini error
              </p>
              <p style={{ margin: 0, fontSize: ".82rem", color: "#7a4f00", lineHeight: 1.6 }}>
                {aiError}
              </p>
            </div>
          )}

          <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "#0a2e1f", marginBottom: "1rem" }}>Question Breakdown</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "2rem" }}>
            {questions.map((question, index) => {
              const questionFeedback = feedback?.questions?.[index] || {}
              const questionScore = questionFeedback.score ?? null

              return (
                <div key={index} style={{ background: "#fff", border: "1.5px solid #e8ede9", borderRadius: 14, overflow: "hidden" }}>
                  <div
                    style={{
                      padding: "1.1rem 1.4rem",
                      borderBottom: "1px solid #f0f0f0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "1rem"
                    }}
                  >
                    <div>
                      <span style={{ fontSize: ".72rem", fontWeight: 700, color: "#0F6E56", background: "#e8f5f0", padding: "2px 8px", borderRadius: 99 }}>
                        Q{index + 1}
                      </span>
                      <p style={{ fontSize: ".9rem", fontWeight: 700, color: "#0a2e1f", margin: ".4rem 0 0" }}>{question.text}</p>
                    </div>
                    <div style={{ textAlign: "center", flexShrink: 0 }}>
                      <div style={{ fontSize: "1.5rem", fontWeight: 900, color: SCORE_COLOR(questionScore) }}>{questionScore ?? "-"}</div>
                      <div style={{ fontSize: ".7rem", color: questionScore != null ? SCORE_COLOR(questionScore) : "var(--text-500)", fontWeight: 700 }}>
                        {questionScore != null ? "pts" : "not scored"}
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: "1.1rem 1.4rem" }}>
                    <div style={{ marginBottom: ".9rem" }}>
                      <p style={{ fontSize: ".72rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.4, margin: "0 0 .35rem" }}>
                        Your Answer
                      </p>
                      <p style={{ fontSize: ".88rem", color: "#333", lineHeight: 1.65, background: "#f8faf9", borderRadius: 8, padding: ".75rem", margin: 0 }}>
                        {answers[index]}
                      </p>
                    </div>

                    <div style={{ marginBottom: ".9rem" }}>
                      <p style={{ fontSize: ".72rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.4, margin: "0 0 .35rem" }}>
                        Feedback
                      </p>
                      <p style={{ fontSize: ".88rem", color: "#333", lineHeight: 1.65, margin: 0 }}>{questionFeedback.feedback}</p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
                      {questionFeedback.correct_points?.length > 0 && (
                        <div style={{ background: "#e8f5f0", borderRadius: 8, padding: ".75rem" }}>
                          <p style={{ fontSize: ".72rem", fontWeight: 700, color: "#0F6E56", margin: "0 0 .4rem", display: "flex", alignItems: "center", gap: 4 }}>
                            <CheckCircle size={11} /> Correct Points
                          </p>
                          {questionFeedback.correct_points.map((point, pointIndex) => (
                            <p key={pointIndex} style={{ fontSize: ".8rem", color: "#0a2e1f", margin: "0 0 .2rem" }}>
                              - {point}
                            </p>
                          ))}
                        </div>
                      )}

                      {questionFeedback.missed_points?.length > 0 && (
                        <div style={{ background: "#fdf2f2", borderRadius: 8, padding: ".75rem" }}>
                          <p style={{ fontSize: ".72rem", fontWeight: 700, color: "#E24B4A", margin: "0 0 .4rem", display: "flex", alignItems: "center", gap: 4 }}>
                            <AlertCircle size={11} /> Missed Points
                          </p>
                          {questionFeedback.missed_points.map((point, pointIndex) => (
                            <p key={pointIndex} style={{ fontSize: ".8rem", color: "#0a2e1f", margin: "0 0 .2rem" }}>
                              - {point}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    {question.model_answer && (
                      <div style={{ marginTop: ".9rem", background: "#f0faf7", border: "1px solid #b8dfd3", borderRadius: 8, padding: ".75rem" }}>
                        <p style={{ fontSize: ".72rem", fontWeight: 700, color: "#0F6E56", margin: "0 0 .3rem", textTransform: "uppercase", letterSpacing: 0.4 }}>
                          Model Answer
                        </p>
                        <p style={{ fontSize: ".83rem", color: "#2a5a47", lineHeight: 1.6, margin: 0 }}>{question.model_answer}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
            {hasSavedAttempt && (
              <button
                onClick={startRetake}
                className="btn btn-outline"
                style={{ cursor: "pointer" }}
              >
                Retake Simulation
              </button>
            )}
            <Link to="/courses" className="btn btn-outline">Browse More Courses</Link>
          </div>
        </div>
      </div>
    )
  }

  if (step === "case") {
    return (
      <div className="page">
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "2rem 1rem 4rem" }}>
          <Link
            to="/dashboard"
            style={{ color: "var(--text-500)", fontSize: ".85rem", display: "inline-flex", alignItems: "center", gap: ".35rem", marginBottom: "1.25rem" }}
          >
            Dashboard
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0a2e1f", margin: 0 }}>{sim.title}</h1>
            <span
              style={{
                fontSize: ".72rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: sim.difficulty_level === "advanced" ? "#E24B4A" : sim.difficulty_level === "intermediate" ? "#E09B00" : "#0F6E56",
                background: sim.difficulty_level === "advanced" ? "#fdf2f2" : sim.difficulty_level === "intermediate" ? "#fef9e7" : "#e8f5f0",
                padding: "3px 10px",
                borderRadius: 99,
                whiteSpace: "nowrap"
              }}
            >
              {sim.difficulty_level}
            </span>
          </div>

          <div style={{ background: "#fff", border: "1.5px solid #e8ede9", borderRadius: 16, padding: "2rem", marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "#0a2e1f", marginBottom: "1rem" }}>Patient Case</h2>
            <p style={{ color: "#444", lineHeight: 1.85, fontSize: ".95rem", margin: 0, whiteSpace: "pre-wrap" }}>
              {sim.patient_scenario}
            </p>
          </div>

          <div
            style={{
              background: "#e8f5f0",
              borderRadius: 12,
              padding: "1.25rem 1.5rem",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: ".75rem"
            }}
          >
            <p style={{ margin: 0, fontSize: ".88rem", color: "#2a5a47", lineHeight: 1.6 }}>
              Read the case carefully. You will answer <strong>{questions.length} question{questions.length !== 1 ? "s" : ""}</strong>. Your responses will be assessed by AI and compared against model answers.
            </p>
          </div>

          <button
            onClick={() => setStep("questions")}
            style={{
              background: "#0F6E56",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: ".85rem 2rem",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8
            }}
          >
            Start Answering <ChevronRight size={16} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "2rem 1rem 4rem" }}>
        <button
          onClick={() => setStep("case")}
          style={{ background: "none", border: "none", color: "var(--text-500)", fontSize: ".85rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: ".35rem", marginBottom: "1.25rem", padding: 0 }}
        >
          Back to Case
        </button>

        <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0a2e1f", marginBottom: ".35rem" }}>{sim.title}</h1>
        <p style={{ color: "var(--text-500)", fontSize: ".85rem", marginBottom: "2rem" }}>
          Answer all {questions.length} question{questions.length !== 1 ? "s" : ""} below
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "2rem" }}>
          {questions.map((question, index) => (
            <div key={index} style={{ background: "#fff", border: "1.5px solid #e8ede9", borderRadius: 14, padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: ".75rem", marginBottom: "1rem" }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "#0F6E56",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: ".78rem",
                    fontWeight: 800,
                    flexShrink: 0
                  }}
                >
                  {index + 1}
                </div>
                <p style={{ fontSize: ".95rem", fontWeight: 700, color: "#0a2e1f", margin: 0, lineHeight: 1.5 }}>{question.text}</p>
              </div>

              <textarea
                value={answers[index] || ""}
                onChange={event => setAnswers(current => ({ ...current, [index]: event.target.value }))}
                placeholder="Type your clinical answer here..."
                style={{
                  width: "100%",
                  padding: ".85rem 1rem",
                  border: answers[index]?.trim() ? "1.5px solid #0F6E56" : "1.5px solid #e0e0e0",
                  borderRadius: 9,
                  fontFamily: "inherit",
                  fontSize: ".9rem",
                  minHeight: 130,
                  resize: "vertical",
                  outline: "none",
                  background: answers[index]?.trim() ? "#fafcfb" : "#fff",
                  boxSizing: "border-box",
                  lineHeight: 1.65,
                  transition: "border-color .15s ease"
                }}
              />

              <p style={{ fontSize: ".72rem", color: answers[index]?.trim() ? "#0F6E56" : "#bbb", margin: ".35rem 0 0", fontWeight: 600 }}>
                {answers[index]?.trim() ? "Answered" : "Required"}
              </p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              background: "#0F6E56",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: ".85rem 2rem",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.8 : 1,
              display: "flex",
              alignItems: "center",
              gap: 8
            }}
          >
            {submitting
              ? <><Loader size={15} style={{ animation: "spin .7s linear infinite" }} /> Getting AI Feedback...</>
              : <>Submit and Get Feedback <ChevronRight size={16} /></>}
          </button>
          <Link to="/dashboard" style={{ color: "var(--text-500)", fontSize: ".88rem" }}>Cancel</Link>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}
