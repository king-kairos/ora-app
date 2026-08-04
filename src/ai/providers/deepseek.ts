// src/ai/providers/deepseek.ts
export async function callDeepSeek(params: {
  apiKey: string;
  baseUrl?: string;
  model: string;
  system: string;
  input: string;
  timeoutMs?: number;
}) {
  const { apiKey, baseUrl = "https://api.deepseek.com", model, system, input, timeoutMs = 20000 } = params;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: input },
        ],
        temperature: 0.4,
      }),
      signal: ctrl.signal,
    });

    const j: any = await r.json().catch(() => ({}));
    if (!r.ok) {
      return { ok: false as const, error: j?.error?.message || `deepseek_http_${r.status}` };
    }

    const text = String(j?.choices?.[0]?.message?.content || "").trim() || "Entendido.";
    return { ok: true as const, text };
  } finally {
    clearTimeout(t);
  }
}
