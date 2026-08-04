import express from "express";
import { runAnalyticsParaOraHealthSmgModule } from "../ai/modules/analytics-para-ora-health-smg";

const router = express.Router();

router.post("/api/ora/health-smg/analytics", async (req, res) => {
  try {
    const result = await runAnalyticsParaOraHealthSmgModule(req.body);

    return res.json({
      ok: true,
      source: "analytics-module",
      result,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "analytics_module_failed",
      detail: error instanceof Error ? error.message : "unknown_error",
    });
  }
});

export default router;
