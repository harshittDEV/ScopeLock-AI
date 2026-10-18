// backend/src/auth.ts
import { Request, Response, NextFunction } from "express";
import { getUserById } from "./database";
import { Principal } from "./types";
import { CONFIG } from "./config";
import { createHttpError } from "./middleware/errorHandler";

/**
 * Demo identity authentication middleware.
 * In development/demo mode (ENABLE_DEMO_IDENTITY=true) the client may provide
 * an "x-demo-user-id" header indicating which seeded identity to act as.
 * The header is ignored when demo mode is disabled.
 */
export function demoAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (!CONFIG.enableDemoIdentity) {
    // No authentication – treat as unauthenticated
    (req as any).principal = undefined;
    return next();
  }

  const demoId = req.header("x-demo-user-id");
  if (!demoId) {
    // Not provided – unauthenticated
    (req as any).principal = undefined;
    return next();
  }

  const user = getUserById(demoId);
  if (!user) {
    // Invalid demo identity – reject request early
    return next(createHttpError(401, "Invalid demo identity", true));
  }

  const principal: Principal = {
    id: user.id,
    role: user.role as any,
    department: user.department,
  };
  (req as any).principal = principal;
  next();
}

// Helper to retrieve principal, throwing if not established
export function requirePrincipal(req: Request): Principal {
  const principal = (req as any).principal as Principal | undefined;
  if (!principal) {
    throw createHttpError(401, "Authentication required", true);
  }
  return principal;
}
