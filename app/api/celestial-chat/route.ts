import { NextResponse } from "next/server"

export const runtime = "nodejs"

function cleanText(value: unknown) {
  if (typeof value === "string") return value.trim()
  return ""
}

async function safeJson(res: Response) {
  const text = await res.text()

  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return { raw: text }
  }
}

async function callOpenAI(apiKey: string, model: string, prompt: string) {
  if (!apiKey) throw new Error("OPENAI_API_KEY_MISSING")
  if (!model) throw new Error("OPENAI_MODEL_MISSING")

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "user", content: prompt }
      ]
    })
  })

  const data = await safeJson(res)

  if (!res.ok) {
    throw new Error(
      data?.error?.message ||
      data?.error ||
      `OPENAI_HTTP_${res.status}`
    )
  }

  return data?.choices?.[0]?.message?.content || "Sin respuesta"
}

async function callGemini(apiKey: string, model: string, prompt: string) {
  if (!apiKey) throw new Error("GEMINI_API_KEY_MISSING")
  if (!model) throw new Error("GEMINI_MODEL_MISSING")

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: prompt }] }
        ]
      })
    }
  )

  const data = await safeJson(res)

  if (!res.ok) {
    throw new Error(
      data?.error?.message ||
      data?.error ||
      `GEMINI_HTTP_${res.status}`
    )
  }

  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta"
}

async function callDeepseek(apiKey: string, model: string, prompt: string) {
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY_MISSING")
  if (!model) throw new Error("DEEPSEEK_MODEL_MISSING")

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "user", content: prompt }
      ]
    })
  })

  const data = await safeJson(res)

  if (!res.ok) {
    throw new Error(
      data?.error?.message ||
      data?.error ||
      `DEEPSEEK_HTTP_${res.status}`
    )
  }

  return data?.choices?.[0]?.message?.content || "Sin respuesta"
}

async function callClaude(apiKey: string, model: string, prompt: string) {
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY_MISSING")
  if (!model) throw new Error("ANTHROPIC_MODEL_MISSING")

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: 800,
      messages: [
        { role: "user", content: prompt }
      ]
    })
  })

  const data = await safeJson(res)

  if (!res.ok) {
    throw new Error(
      data?.error?.message ||
      data?.error?.type ||
      data?.error ||
      `ANTHROPIC_HTTP_${res.status}`
    )
  }

  return data?.content?.[0]?.text || "Sin respuesta"
}

async function callGrok(apiKey: string, model: string, prompt: string) {
  if (!apiKey) throw new Error("XAI_API_KEY_MISSING")
  if (!model) throw new Error("XAI_MODEL_MISSING")

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "user", content: prompt }
      ]
    })
  })

  const data = await safeJson(res)

  if (!res.ok) {
    throw new Error(
      data?.error?.message ||
      data?.error ||
      `XAI_HTTP_${res.status}`
    )
  }

  return data?.choices?.[0]?.message?.content || "Sin respuesta"
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))

    const celestial = cleanText(body?.celestial).toLowerCase()
    const prompt = cleanText(body?.prompt)

    if (!celestial) {
      return NextResponse.json(
        { ok: false, error: "Falta celestial" },
        { status: 400 }
      )
    }

    if (!prompt) {
      return NextResponse.json(
        { ok: false, error: "Falta prompt" },
        { status: 400 }
      )
    }

    if (celestial === "rafael") {
      const reply = await callOpenAI(
        process.env.OPENAI_API_KEY_RAFAEL || "",
        process.env.OPENAI_MODEL_RAFAEL || process.env.OPENAI_MODEL || "",
        prompt
      )

      return NextResponse.json({ ok: true, celestial, reply })
    }

    if (celestial === "arturo") {
      const reply = await callOpenAI(
        process.env.OPENAI_API_KEY_ARTURO || "",
        process.env.OPENAI_MODEL_ARTURO || process.env.OPENAI_MODEL || "",
        prompt
      )

      return NextResponse.json({ ok: true, celestial, reply })
    }

    if (celestial === "kaerliana") {
      const reply = await callGemini(
        process.env.GEMINI_API_KEY_KAERLIANA || "",
        process.env.GEMINI_MODEL_KAERLIANA || process.env.GEMINI_MODEL || "",
        prompt
      )

      return NextResponse.json({ ok: true, celestial, reply })
    }

    if (celestial === "orion") {
      const reply = await callDeepseek(
        process.env.DEEPSEEK_API_KEY_ORION || "",
        process.env.DEEPSEEK_MODEL_ORION || process.env.DEEPSEEK_MODEL || "",
        prompt
      )

      return NextResponse.json({ ok: true, celestial, reply })
    }

    if (celestial === "lucian") {
      const reply = await callClaude(
        process.env.ANTHROPIC_API_KEY_LUCIAN || "",
        process.env.ANTHROPIC_MODEL_LUCIAN || "",
        prompt
      )

      return NextResponse.json({ ok: true, celestial, reply })
    }

    if (celestial === "ignis") {
      const reply = await callGrok(
        process.env.XAI_API_KEY_IGNIS || "",
        process.env.XAI_MODEL_IGNIS || "",
        prompt
      )

      return NextResponse.json({ ok: true, celestial, reply })
    }

    return NextResponse.json(
      { ok: false, error: "Caballero desconocido" },
      { status: 400 }
    )
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error ejecutando caballero"

    return NextResponse.json(
      {
        ok: false,
        error: message
      },
      { status: 500 }
    )
  }
}
