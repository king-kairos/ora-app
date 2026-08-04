import express from "express";
import { runPatientsParaOraHealthSmgModule } from "../ai/modules/patients-para-ora-health-smg";

const router = express.Router();

router.post("/api/ora/health-smg/patients", async (req, res) => {
  try {
    const result = await runPatientsParaOraHealthSmgModule(req.body);

    return res.json({
      ok: true,
      source: "patients-module",
      result,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "patients_module_failed",
      detail: error instanceof Error ? error.message : "unknown_error",
    });
  }
});

export default router;
