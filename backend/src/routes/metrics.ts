// backend/src/routes/metrics.ts
import { Router, Request, Response } from "express";
import { db } from "../database";

const router = Router();

// GET /api/metrics – aggregated audit statistics
router.get("/", (_req: Request, res: Response) => {
  const total = (db.prepare(`SELECT COUNT(*) AS cnt FROM audit_events`).get() as any).cnt as number;
  const allowed = (db.prepare(`SELECT COUNT(*) AS cnt FROM audit_events WHERE decision = 'ALLOW'`).get() as any).cnt as number;
  const denied = (db.prepare(`SELECT COUNT(*) AS cnt FROM audit_events WHERE decision = 'DENY'`).get() as any).cnt as number;
  const failures = (db.prepare(`SELECT COUNT(*) AS cnt FROM audit_events WHERE outcome IS NOT NULL AND outcome <> ''`).get() as any).cnt as number;

  res.json({
    period: null,
    totals: {
      requests: total,
      allowed,
      denied,
      executionFailures: failures,
    },
  });
});

export default router;
