import express from "express";
import { runPrescriptionsParaOraHealthSmgModule } from "../ai/modules/prescriptions-para-ora-health-smg";

const router = express.Router();

router.post("/api/ora/health-smg/prescriptions", async (req, res) => {
  try {
    const result = await runPrescriptionsParaOraHealthSmgModule(req.body);

    return res.json({
      ok: true,
      source: "prescriptions-module",
      result,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "prescriptions_module_failed",
      detail: error instanceof Error ? error.message : "unknown_error",
    });
  }
});

export default router;
