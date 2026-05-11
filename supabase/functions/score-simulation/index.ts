const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function extractText(data: any): string {
  return data?.candidates
    ?.flatMap((candidate: any) => candidate?.content?.parts || [])
    ?.map((part: any) => part?.text || "")
    ?.join("")
    ?.trim() || ""
}

function parseJson(raw: string) {
  const cleaned = raw.replace(/```json|```/g, "").trim()
  const first = cleaned.indexOf("{")
  const last = cleaned.lastIndexOf("}")

  if (first === -1 || last === -1 || last <= first) {
    throw new Error("No JSON object found")
  }

  return JSON.parse(cleaned.slice(first, last + 1))
}

function buildGenerationConfig(temperature: number) {
  return {
    temperature,
    maxOutputTokens: 1000,
    thinkingConfig: {
      thinkingBudget: 0,
    },
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { prompt } = await req.json()
    const geminiKey = Deno.env.get("GEMINI_API_KEY")

    if (!geminiKey) {
      throw new Error("GEMINI_API_KEY secret not set")
    }

    const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

    const makeRequest = async (promptText: string, temperature: number) => {
      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: promptText }] }],
          generationConfig: buildGenerationConfig(temperature),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error?.error?.message || `Gemini error ${response.status}`)
      }

      return response.json()
    }

    let parsed = null
    let usedRetry = false

    try {
      const data = await makeRequest(prompt, 0.3)
      const raw = extractText(data)
      if (!raw) throw new Error("Empty response")
      parsed = parseJson(raw)
    } catch {
      usedRetry = true
      const strictPrompt = `${prompt}\n\nIMPORTANT: Output only raw JSON. No markdown. No explanation. Start with { and end with }.`
      const data = await makeRequest(strictPrompt, 0.1)
      const raw = extractText(data)
      if (!raw) throw new Error("Empty retry response")
      parsed = parseJson(raw)
    }

    return new Response(
      JSON.stringify({ success: true, data: parsed, usedRetry }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
