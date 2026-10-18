// backend/src/policy.ts
import { Principal, ActionRequest, Decision, Role } from "./types";
import { recordAudit } from "./database";
import { randomUUID } from "crypto";

const POLICY_VERSION = "1.0";

// Map user IDs to their employee record IDs
const USER_EMPLOYEE_MAP: Record<string, string> = {
  alice: "employee_101",
  bob: "employee_102",
  carol: "employee_103",
  david: "employee_104",
  admin: "employee_105",
};

/**
 * Evaluate an authorization request deterministically.
 * Returns a Decision object and a boolean indicating if the request is allowed.
 */
export function evaluatePolicy(principal: Principal, req: ActionRequest): {
  decision: Decision;
  allowed: boolean;
} {
  // Default deny
  let allowed = false;
  let reasonCode = "RESOURCE_ACCESS_NOT_PERMITTED";

  // Basic validation of known actions/resource types
  if (!req.action || !req.resourceType || !req.resourceId) {
    reasonCode = "INVALID_ACTION_REQUEST";
  } else if (req.resourceType !== "employee") {
    reasonCode = "UNKNOWN_RESOURCE_TYPE";
  } else {
    const ownEmployeeId = USER_EMPLOYEE_MAP[principal.id] ?? principal.id;
    // Switch based on role
    switch (principal.role) {
      case Role.EMPLOYEE:
        if (req.action === "read_own_profile" && req.resourceId === ownEmployeeId) {
          allowed = true;
          reasonCode = "ALLOWED_OWN_RESOURCE";
        } else if (req.action === "read_salary" && req.resourceId === ownEmployeeId) {
          allowed = true;
          reasonCode = "ALLOWED_OWN_RESOURCE";
        }
        break;
      case Role.MANAGER:
        if (req.action === "read_own_profile" && req.resourceId === ownEmployeeId) {
          allowed = true;
          reasonCode = "ALLOWED_OWN_RESOURCE";
        } else if (req.action === "read_salary") {
          allowed = true;
          reasonCode = "ALLOWED_DEPARTMENT_SCOPE";
        } else if (req.action === "list_department_employees") {
          allowed = true;
          reasonCode = "ALLOWED_DEPARTMENT_SCOPE";
        }
        break;
      case Role.ADMIN:
        // Admin can do everything defined
        allowed = true;
        reasonCode = "ALLOWED_ADMIN_POLICY";
        break;
      default:
        allowed = false;
        reasonCode = "ROLE_NOT_PERMITTED";
    }
  }

  const decision: Decision = {
    decisionId: randomUUID(),
    decision: allowed ? "ALLOW" : "DENY",
    principalId: principal.id,
    action: req.action,
    resourceType: req.resourceType,
    resourceId: req.resourceId,
    reasonCode,
    policyVersion: POLICY_VERSION,
  };

  // Record audit regardless of allow/deny (outcome will be filled later)
  recordAudit({
    principalId: principal.id,
    action: req.action,
    resourceType: req.resourceType,
    resourceId: req.resourceId,
    decision: decision.decision as "ALLOW" | "DENY",
    reasonCode,
    policyVersion: POLICY_VERSION,
    correlationId: (req as any).correlationId,
  });

  return { decision, allowed };
}
