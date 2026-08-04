import { Router } from "express";
import { runAIProposalEngine } from "../../ai/autoprog/ai-proposal-engine";

const router = Router();

router.post("/api/ora/ai/run", async (_req, res) => {
  try {
    const result = await runAIProposalEngine();
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error?.message || "AI_ENGINE_FAILED",
    });
  }
});

export default router;
