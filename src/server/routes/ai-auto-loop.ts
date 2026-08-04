import { Router } from "express";
import { runAIProposalEngine } from "../../ai/autoprog/ai-proposal-engine";

const router = Router();

let running = false;
let enabled = false;
let timer: NodeJS.Timeout | null = null;
let lastRun: any = null;

const INTERVAL_MS = Number(process.env.ORA_AI_LOOP_MS || 5 * 60 * 1000);

async function tick() {
  if (!enabled || running) return;

  running = true;

  try {
    const result = await runAIProposalEngine();

    lastRun = {
      ok: true,
      at: new Date().toISOString(),
      result,
    };

    console.log("[ORA AI LOOP]", lastRun);
  } catch (error: any) {
    lastRun = {
      ok: false,
      at: new Date().toISOString(),
      error: error?.message || "AI_LOOP_FAILED",
    };

    console.error("[ORA AI LOOP ERROR]", lastRun);
  } finally {
    running = false;
  }
}

router.post("/api/ora/ai/loop/start", async (_req, res) => {
  enabled = true;

  if (!timer) {
    timer = setInterval(tick, INTERVAL_MS);
  }

  void tick();

  return res.json({
    ok: true,
    enabled,
    intervalMs: INTERVAL_MS,
    message:
      "Modo autónomo activado: ORA puede generar propuestas, pero no aprobar ni aplicar.",
  });
});

router.post("/api/ora/ai/loop/stop", async (_req, res) => {
  enabled = false;

  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  return res.json({
    ok: true,
    enabled,
    message: "Modo autónomo detenido.",
  });
});

router.get("/api/ora/ai/loop/status", async (_req, res) => {
  return res.json({
    ok: true,
    enabled,
    running,
    intervalMs: INTERVAL_MS,
    lastRun,
    rule: "Solo genera propuestas. Aprobar y aplicar requiere Kairos.",
  });
});

export default router;
