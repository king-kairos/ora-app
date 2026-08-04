import fs from "fs";
import path from "path";
import { Router } from "express";

const router = Router();

const FILE = path.join(process.cwd(), "data/ora/branches.json");

router.get("/branches", (req, res) => {
  try {
    if (!fs.existsSync(FILE)) {
      return res.json({
        ok: true,
        branches: [],
      });
    }

    const raw = fs.readFileSync(FILE, "utf-8");
    const data = JSON.parse(raw);

    return res.json({
      ok: true,
      branches: data.branches || [],
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: e.message,
    });
  }
});

export default router;
