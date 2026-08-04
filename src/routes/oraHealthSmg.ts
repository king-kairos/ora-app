import express from "express";
import fs from "fs/promises";
import path from "path";
import { runOraHealthAudit } from "../ai/modules/ora-health-smg";

const router = express.Router();

const ORA_HEALTH_LATEST_REPORT = path.join(
  process.cwd(),
  "data",
  "ora-health",
  "latest-report.json"
);

router.get("/api/ora/health-smg/report", async (_req, res) => {
  try {
    const raw = await fs.readFile(ORA_HEALTH_LATEST_REPORT, "utf-8");
    const json = JSON.parse(raw);

    return res.json({
      ok: true,
      source: "latest-report",
      report: json,
    });
  } catch (error) {
    return res.status(404).json({
      ok: false,
      error: "latest_report_not_found",
      detail: error instanceof Error ? error.message : "unknown_error",
    });
  }
});

router.post("/api/ora/health-smg/report", async (_req, res) => {
  try {
    const result = await runOraHealthAudit();

    return res.json({
      source: "fresh-audit",
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "ora_health_audit_failed",
      detail: error instanceof Error ? error.message : "unknown_error",
    });
  }
});

export default router;
