const LOOP_URL = "http://127.0.0.1:3000/api/autoprog/loop";
const INTERVAL_MS = 30000;

let running = false;

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(body),
  });

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, raw: text };
  }
}

async function getJson(url) {
  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, raw: text };
  }
}

async function tick() {
  if (running) {
    console.log("[daemon] ciclo omitido: aún ejecutando");
    return;
  }

  running = true;

  try {
    const status = await getJson(LOOP_URL);
    console.log("[daemon] estado:", status);

    const result = await postJson(LOOP_URL, {
      source: "ora-daemon",
      kairosMode: true,
    });

    console.log("[daemon] resultado:", result);
  } catch (error) {
    console.error("[daemon] error:", error);
  } finally {
    running = false;
  }
}

console.log("[daemon] ORA daemon iniciado");
tick();
setInterval(tick, INTERVAL_MS);
