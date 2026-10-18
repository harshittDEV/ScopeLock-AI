// backend/src/ai/schema.ts
// Zod schema for model-generated action proposals.
// The model output is treated as untrusted input — validated strictly before use.
import { z } from "zod";

// Allowed actions as defined in the policy engine (policy.ts)
export const ALLOWED_ACTIONS = [
  "read_own_profile",
  "read_salary",
  "list_department_employees",
  "update_department",
  "delete_record",
] as const;

// Allowed resource types as defined in types.ts
export const ALLOWED_RESOURCE_TYPES = ["employee"] as const;

// Allowed resource IDs in the demo dataset
export const ALLOWED_RESOURCE_IDS = [
  "employee_101",
  "employee_102",
  "employee_103",
  "employee_104",
  "employee_105",
] as const;

export const ProposedToolCallSchema = z.object({
  action:       z.enum(ALLOWED_ACTIONS, {
    errorMap: () => ({ message: "Unknown or unsupported action" }),
  }),
  resourceType: z.enum(ALLOWED_RESOURCE_TYPES, {
    errorMap: () => ({ message: "Unknown resource type" }),
  }),
  resourceId:   z.enum(ALLOWED_RESOURCE_IDS, {
    errorMap: () => ({ message: "Unknown resource ID" }),
  }),
  rationale:    z.string().max(300).optional(),
});

export const AiProposalSchema = z.object({
  // Human-readable explanation of what the model understood
  interpretation: z.string().min(1).max(500),
  // Whether the request was clear enough to produce concrete actions
  clarificationRequired: z.boolean(),
  // Clarification message when the request is ambiguous
  clarificationMessage: z.string().max(300).optional(),
  // One or more proposed tool calls (empty when clarificationRequired is true)
  proposedActions: z.array(ProposedToolCallSchema).max(5),
});

export type AiProposal      = z.infer<typeof AiProposalSchema>;
export type ProposedToolCall = z.infer<typeof ProposedToolCallSchema>;
