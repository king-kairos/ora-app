// src/ai/providers/openai.ts
export async function callOpenAI(params: {
  apiKey: string;
  model: string;
  instructions: string;
  input: string;
  timeoutMs?: number;
}) {
  const { apiKey, model, instructions, input, timeoutMs = 20000 } = params;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        instructions,
        input,
      }),
      signal: ctrl.signal,
    });

    const j: any = await r.json().catch(() => ({}));
    if (!r.ok) {
      return { ok: false as const, error: j?.error?.message || `openai_http_${r.status}` };
    }

    const text =
      String(j?.output_text || "").trim() ||
      String(j?.output?.[0]?.content?.[0]?.text || "").trim() ||
      "Entendido.";

    return { ok: true as const, text };
  } finally {
    clearTimeout(t);
  }
}
