import express from "express";
import { runConsultationsParaOraHealthSmgModule } from "../ai/modules/consultations-para-ora-health-smg";

const router = express.Router();

router.post("/api/ora/health-smg/consultations", async (req, res) => {
  try {
    const result = await runConsultationsParaOraHealthSmgModule(req.body);

    return res.json({
      ok: true,
      source: "consultations-module",
      result,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "consultations_module_failed",
      detail: error instanceof Error ? error.message : "unknown_error",
    });
  }
});

export default router;
