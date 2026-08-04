import express from "express";
import { runPatientRecordParaOraHealthSmgModule } from "../ai/modules/patient-record-para-ora-health-smg";

const router = express.Router();

router.post("/api/ora/health-smg/patient-record", async (req, res) => {
  try {
    const result = await runPatientRecordParaOraHealthSmgModule(req.body);

    return res.json({
      ok: true,
      source: "patient-record-module",
      result,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "patient_record_module_failed",
      detail: error instanceof Error ? error.message : "unknown_error",
    });
  }
});

export default router;
