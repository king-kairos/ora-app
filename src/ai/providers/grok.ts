export async function callGrok({
  apiKey,
  model,
  system,
  input,
}: {
  apiKey: string;
  model: string;
  system: string;
  input: string;
}) {
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: system,
          },
          {
            role: "user",
            content: input,
          },
        ],
      }),
    });

    const data = await res.json();

    const text =
      data?.choices?.[0]?.message?.content ||
      "Grok respondió sin texto.";

    return {
      ok: true,
      text,
    };
  } catch (e: any) {
    return {
      ok: false,
      error: e.message,
    };
  }
}
