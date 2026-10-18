// backend/src/routes/health.ts
// GET /api/health
//
// Reports:
//   - Server health (always 200 if the process is running)
//   - AI provider configuration status (separate from server health)
//   - Database reachability
//
// IMPORTANT: "healthy" here means the server process is reachable.
// It does NOT guarantee the AI model is configured or reachable.
// Check aiProvider.configured to determine AI readiness.

import { Router, Request, Response } from "express";
import { db } from "../database";
import { CONFIG } from "../config";
const router = Router();

router.get("/", (_req: Request, res: Response) => {
  // Check database
  let dbOk = false;
  try {
    db.prepare("SELECT 1").get();
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const aiConfigured = Boolean(CONFIG.ai.provider);

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: dbOk ? "ok" : "error",
    aiProvider: {
      configured: aiConfigured,
      provider: aiConfigured ? CONFIG.ai.provider : null,
      model: aiConfigured ? CONFIG.ai.model : null,
      // baseUrl is included only when configured — never expose credentials
      baseUrl: aiConfigured ? CONFIG.ai.baseUrl : null,
      // Note: "configured" means env vars are set, NOT that the model is reachable.
      // A live connectivity check is available at GET /api/agent/status.
    },
    demoIdentity: CONFIG.enableDemoIdentity
      ? "enabled (NOT production-grade authentication)"
      : "disabled",
  });
});

export default router;
