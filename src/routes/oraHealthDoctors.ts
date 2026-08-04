import express from "express";
import { runDoctorsParaOraHealthSmgModule } from "../ai/modules/doctors-para-ora-health-smg";

const router = express.Router();

router.post("/api/ora/health-smg/doctors", async (req, res) => {
  try {
    const result = await runDoctorsParaOraHealthSmgModule(req.body);

    return res.json({
      ok: true,
      source: "doctors-module",
      result,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "doctors_module_failed",
      detail: error instanceof Error ? error.message : "unknown_error",
    });
  }
});

export default router;
