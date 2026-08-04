// src/ai/providers/gemini.ts
export async function callGemini(params: {
  apiKey: string;
  model: string;
  system: string;
  input: string;
  timeoutMs?: number;
}) {
  const { apiKey, model, system, input, timeoutMs = 20000 } = params;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: input }] }],
      }),
      signal: ctrl.signal,
    });

    const j: any = await r.json().catch(() => ({}));
    if (!r.ok) {
      return { ok: false, error: j?.error?.message || `gemini_http_${r.status}` };
    }

    const text =
      j?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("")?.trim() ||
      "Entendido.";

    return { ok: true, text };
  } finally {
    clearTimeout(t);
  }
}
