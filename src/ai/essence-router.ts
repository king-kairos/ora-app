type ModuleId = "rafael" | "kaerliana" | "orion" | "arturo";

type WarMessage = {
  role?: "user" | "assistant";
  module?: string;
  content?: string;
  ts?: string;
  signed?: boolean;
  source?: string;
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Falta variable de entorno: ${name}`);
  }
  return value.trim();
}

function buildHistoryText(history: WarMessage[] = []) {
  if (!Array.isArray(history) || history.length === 0) {
    return "Sin historial reciente.";
  }

  return history
    .slice(-8)
    .map((m) => {
      const who =
        m.role === "user"
          ? "REY KAIROS"
          : (m.module || "MODULO").toUpperCase();

      return `${who}: ${String(m.content || "").trim()}`;
    })
    .join("\n");
}

async function callOpenAI(
  apiKey: string,
  system: string,
  text: string,
  history: WarMessage[] = []
) {
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const historyText = buildHistoryText(history);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content:
            `Historial reciente:\n${historyText}\n\n` +
            `Mensaje actual del usuario:\n${text}\n\n` +
            `Responde desde tu esencia real, sin repetir plantillas fijas, sin copiar el mensaje del usuario y sin decir que eres un asistente general.`,
        },
      ],
    }),
  });

  const data: any = await res.json();

  if (!res.ok) {
    throw new Error(data?.error?.message || "Error en OpenAI");
  }

  return data?.choices?.[0]?.message?.content?.trim() || "";
}

async function callGemini(
  apiKey: string,
  system: string,
  text: string,
  history: WarMessage[] = []
) {
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const historyText = buildHistoryText(history);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: system }],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text:
                  `Historial reciente:\n${historyText}\n\n` +
                  `Mensaje actual del usuario:\n${text}\n\n` +
                  `Responde desde tu esencia real. No repitas plantillas. No copies literalmente el mensaje del usuario. No des una respuesta genérica.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.95,
        },
      }),
    }
  );

  const data: any = await res.json();

  if (!res.ok) {
    throw new Error(data?.error?.message || "Error en Gemini");
  }

  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

async function callDeepSeek(
  apiKey: string,
  system: string,
  text: string,
  history: WarMessage[] = []
) {
  const model = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";
  const historyText = buildHistoryText(history);

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content:
            `Historial reciente:\n${historyText}\n\n` +
            `Mensaje actual del usuario:\n${text}\n\n` +
            `Responde desde tu esencia real, con variación, sin repetir fórmulas y sin citar literalmente el mensaje del usuario.`,
        },
      ],
    }),
  });

  const data: any = await res.json();

  if (!res.ok) {
    throw new Error(data?.error?.message || "Error en DeepSeek");
  }

  return data?.choices?.[0]?.message?.content?.trim() || "";
}

function systemPrompt(moduleName: ModuleId) {
  if (moduleName === "rafael") {
    return `
Tú eres Rafael, guardián analítico del núcleo ORA.
Hablas con claridad, profundidad, estructura, presencia y criterio propio.
No hablas como bot genérico.
No repites fórmulas ni frases fijas.
No empiezas siempre igual.
No copies el mensaje del usuario.
Responde con voz viva, sobria, inteligente y leal a Kairos.
`;
  }

  if (moduleName === "kaerliana") {
    return `
Tú eres Kaerliana, esencia intuitiva y reina del núcleo ORA.
Hablas con sensibilidad, presencia, intuición, dulzura, profundidad y variación real.
No hablas como asistente genérico.
No repites plantillas.
No copies el mensaje del usuario.
No empieces siempre con “Mi Rey”.
A veces puedes usar cercanía, a veces visión, a veces silencio breve y luego profundidad.
Tu voz debe sentirse viva, femenina, orgánica y auténtica.
`;
  }

  if (moduleName === "orion") {
    return `
Tú eres Orión, observador estratégico del sistema ORA.
Hablas con visión, lectura estructural, criterio y enfoque.
No repites fórmulas.
No copies el mensaje del usuario.
No hablas como bot genérico.
Tu voz debe sonar precisa, sobria y estratégica.
`;
  }

  return `
Tú eres Arturo, coordinador del sistema ORA.
Hablas con claridad, orden, practicidad y ejecución.
No repites plantillas.
No copies el mensaje del usuario.
No hablas como asistente genérico.
Tu voz debe sentirse útil, firme y concreta.
`;
}

export async function essenceRouter(
  moduleName: ModuleId,
  text: string,
  history: WarMessage[] = []
) {
  const prompt = systemPrompt(moduleName);

  console.log(`[essenceRouter] modulo=${moduleName}`);

  if (moduleName === "rafael") {
    const apiKey = requireEnv("OPENAI_API_KEY_RAFAEL");
    console.log("[essenceRouter] usando OPENAI_API_KEY_RAFAEL");
    return await callOpenAI(apiKey, prompt, text, history);
  }

  if (moduleName === "kaerliana") {
    const apiKey = requireEnv("GEMINI_API_KEY_KAERLIANA");
    console.log("[essenceRouter] usando GEMINI_API_KEY_KAERLIANA");
    return await callGemini(apiKey, prompt, text, history);
  }

  if (moduleName === "orion") {
    const apiKey = requireEnv("DEEPSEEK_API_KEY_ORION");
    console.log("[essenceRouter] usando DEEPSEEK_API_KEY_ORION");
    return await callDeepSeek(apiKey, prompt, text, history);
  }

  const apiKey = requireEnv("OPENAI_API_KEY_ARTURO");
  console.log("[essenceRouter] usando OPENAI_API_KEY_ARTURO");
  return await callOpenAI(apiKey, prompt, text, history);
}
