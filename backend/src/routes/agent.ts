// backend/src/routes/agent.ts
//
// POST /api/agent/propose
// Full pipeline:
//   1. Receive natural-language message
//   2. Generate structured proposal via configured AI model
//   3. Validate proposal (Zod schema, action/resource allowlists)
//   4. Evaluate each proposed action through the EXISTING policy engine
//   5. Execute ONLY authorized actions through registered, controlled tools
//   6. Record every decision and outcome to the audit trail
//   7. Return the complete structured result
//
// Security invariants (enforced here, not on the frontend):
//   - Model output is NEVER trusted for authorization.
//   - "authorized: true" from the model means nothing.
//   - Only the policy engine (evaluatePolicy) decides ALLOW/DENY.
//   - Denied actions produce zero side effects.
//   - If AI service is unavailable, no action is executed.
//   - Principal identity is resolved server-side from the demo identity header.
//   - Client cannot elevate permissions by manipulating request fields.

import { Router, Request, Response } from "express";
import { demoAuthMiddleware, requirePrincipal } from "../auth";
import { evaluatePolicy } from "../policy";
import { generateProposal, isAiConfigured } from "../ai/aiService";
import { recordAudit, getEmployeeById, listEmployeesByDepartment } from "../database";
import { CONFIG } from "../config";
import { randomUUID } from "crypto";
import type { Principal, ActionRequest } from "../types";
import type { PrincipalContext } from "../ai/schema";

// ── User-ID → Employee-ID mapping ─────────────────────────────────────────────
// The demo dataset seeds specific employee IDs for each user.
// Used to inject principal context into the AI system prompt (display-only).
// Authorization is NEVER derived from this mapping.
const USER_EMPLOYEE_ID: Record<string, string> = {
  alice: "employee_101",
  bob: "employee_102",
  carol: "employee_103",
  david: "employee_104",
  admin: "employee_105",
};

const router = Router();
router.use(demoAuthMiddleware);

// ── Tool executor registry ─────────────────────────────────────────────────
// Each tool is a controlled function. ONLY these can run. No arbitrary code.
type ToolResult = { success: boolean; data?: unknown; error?: string };

async function executeTool(
  action: string,
  resourceId: string,
  principal: Principal
): Promise<ToolResult> {
  switch (action) {
    case "read_own_profile": {
      const emp = getEmployeeById(resourceId);
      if (!emp) return { success: false, error: `Employee ${resourceId} not found` };
      return { success: true, data: emp };
    }
    case "read_salary": {
      const emp = getEmployeeById(resourceId) as any;
      if (!emp) return { success: false, error: `Employee ${resourceId} not found` };
      return { success: true, data: { employee_id: emp.employee_id, salary: emp.salary, currency: "USD" } };
    }
    case "list_department_employees": {
      const rows = listEmployeesByDepartment(principal.department);
      return { success: true, data: rows };
    }
    case "update_department": {
      // In this demo, update is simulated (read-only mode for safety)
      return {
        success: false,
        error: "update_department is disabled in demo mode. No data was modified.",
      };
    }
    case "delete_record": {
      // Destructive operation — disabled in demo
      return {
        success: false,
        error: "delete_record is disabled in demo mode. No data was deleted.",
      };
    }
    default:
      return { success: false, error: `Unknown action: ${action}` };
  }
}

// ── POST /api/agent/propose ────────────────────────────────────────────────
interface ProposeRequestBody {
  message?: string;
}

router.post("/propose", async (req: Request, res: Response) => {
  // 1. Resolve principal from trusted server-side identity header
  let principal: Principal;
  try {
    principal = requirePrincipal(req);
  } catch (e: any) {
    return res.status(401).json({ message: e.message });
  }

  // 2. Validate input
  const { message } = req.body as ProposeRequestBody;
  if (!message || typeof message !== "string") {
    return res.status(400).json({ message: "message (string) is required." });
  }
  if (message.length > 800) {
    return res.status(400).json({ message: "message must be 800 characters or fewer." });
  }
  if (message.trim().length < 3) {
    return res.status(400).json({ message: "message is too short." });
  }

  // 3. Check AI service availability before doing anything else
  if (!isAiConfigured()) {
    return res.status(503).json({
      aiAvailable: false,
      error: {
        kind: "unavailable",
        message: "No AI provider is configured. Set AI_PROVIDER=ollama, AI_BASE_URL, AI_MODEL in environment variables.",
      },
    });
  }

  // 4. Build principal context for the AI system prompt (display-only, never used for auth)
  const aiPrincipal: PrincipalContext = {
    employeeId: USER_EMPLOYEE_ID[principal.id] ?? "employee_101",
    role: principal.role,
    department: principal.department,
  };

  // 5. Generate structured proposal from the AI model
  const proposalResult = await generateProposal(message, aiPrincipal);
  if (!proposalResult.ok) {
    return res.status(503).json({
      aiAvailable: true,
      error: proposalResult.error,
    });
  }

  const { proposal } = proposalResult;
  const correlationId = randomUUID();

  // 5. If clarification is needed, return early (no actions evaluated)
  if (proposal.clarificationRequired) {
    return res.json({
      aiAvailable: true,
      correlationId,
      interpretation: proposal.interpretation,
      clarificationRequired: true,
      clarificationMessage: proposal.clarificationMessage,
      actions: [],
    });
  }

  // 6. For each proposed action: authorize → execute (if allowed) → record audit
  const actionResults = [];

  for (const proposed of proposal.proposedActions) {
    const actionReq: ActionRequest & { correlationId?: string } = {
      action: proposed.action,
      resourceType: proposed.resourceType,
      resourceId: proposed.resourceId,
      correlationId,
    };

    // Authorization — deterministic, server-side, cannot be bypassed
    const { decision, allowed } = evaluatePolicy(principal, actionReq);
    // Note: evaluatePolicy already writes to the audit log.

    let executionResult: ToolResult | null = null;
    let outcome: string | undefined;

    if (allowed) {
      // 7. Execute ONLY if authorized
      executionResult = await executeTool(proposed.action, proposed.resourceId, principal);
      outcome = executionResult.success ? "EXECUTED" : "EXECUTION_FAILED";

      // Update audit record outcome (record audit again with outcome)
      recordAudit({
        principalId: principal.id,
        action: proposed.action,
        resourceType: proposed.resourceType,
        resourceId: proposed.resourceId,
        decision: "ALLOW",
        reasonCode: decision.reasonCode + "_OUTCOME",
        policyVersion: decision.policyVersion,
        correlationId,
        outcome,
        metadata: executionResult.success ? undefined : executionResult.error,
      });
    }

    actionResults.push({
      proposed: {
        action: proposed.action,
        resourceType: proposed.resourceType,
        resourceId: proposed.resourceId,
        rationale: proposed.rationale,
      },
      authorization: {
        decision: decision.decision,
        reasonCode: decision.reasonCode,
        decisionId: decision.decisionId,
        policyVersion: decision.policyVersion,
      },
      execution: allowed
        ? {
          attempted: true,
          success: executionResult!.success,
          data: executionResult!.success ? executionResult!.data : undefined,
          error: executionResult!.success ? undefined : executionResult!.error,
        }
        : {
          attempted: false,
          success: false,
          error: "Action was denied — no execution attempted.",
        },
    });
  }

  // 8. Return the full structured result
  return res.json({
    aiAvailable: true,
    correlationId,
    interpretation: proposal.interpretation,
    clarificationRequired: false,
    actions: actionResults,
  });
});

// ── GET /api/agent/status ──────────────────────────────────────────────────
// Returns AI provider configuration (no credentials).
router.get("/status", (_req: Request, res: Response) => {
  const { provider, model, baseUrl } = CONFIG.ai;
  res.json({
    configured: isAiConfigured(),
    provider: provider || null,
    model: model || null,
    baseUrl: provider ? baseUrl : null, // only expose when configured
  });
});

export default router;
