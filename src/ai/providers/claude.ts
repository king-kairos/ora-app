export async function callClaude({
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
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        system,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: input,
          },
        ],
      }),
    });

    const data = await res.json();

    const text =
      data?.content?.[0]?.text ||
      "Claude respondió sin texto.";

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
