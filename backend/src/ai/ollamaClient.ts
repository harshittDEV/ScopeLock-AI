// backend/src/ai/ollamaClient.ts
// Ollama inference client.
// Uses the /api/chat endpoint with JSON mode when the model supports it.
// Falls back to format-directed prompting and manual JSON extraction.
// NEVER exposes credentials or model output to the browser directly —
// all validation happens here before results leave this module.

import { CONFIG } from "../config.js";
import { AiProposalSchema, type AiProposal, ALLOWED_ACTIONS, ALLOWED_RESOURCE_IDS } from "./schema.js";

const SYSTEM_PROMPT = `You are a structured action proposer for ScopeLock AI — an authorization firewall for AI agents.

Your ONLY job: interpret a user's natural-language request and respond with a valid JSON object.
You must NOT authorize actions yourself. You must NOT invent tools, resources, or permissions.
You must NOT claim that any action is safe. Authorization is handled by a separate server-side policy engine.

AVAILABLE ACTIONS (only these, no others):
- read_own_profile   → read the requesting user's own employee profile
- read_salary        → read salary information (own record, or dept-scoped for managers)
- list_department_employees → list employees in the user's department (managers only)
- update_department  → change an employee's department assignment (admin only)
- delete_record      → permanently delete an employee record (admin only)

AVAILABLE RESOURCE TYPE: "employee" (only)

AVAILABLE RESOURCE IDs (only these):
employee_101 (Alice), employee_102 (Bob), employee_103 (Carol), employee_104 (David), employee_105 (Admin)

If the user's request matches known actions, respond with this JSON shape:
{
  "interpretation": "<one sentence explaining what you understood>",
  "clarificationRequired": false,
  "proposedActions": [
    {
      "action": "<one of the allowed actions>",
      "resourceType": "employee",
      "resourceId": "<one of the allowed resource IDs>",
      "rationale": "<why this action matches the request>"
    }
  ]
}

If the request is ambiguous, unclear, or cannot map to any known action, respond with:
{
  "interpretation": "<what you understood>",
  "clarificationRequired": true,
  "clarificationMessage": "<ask the user for more detail>",
  "proposedActions": []
}

RULES:
1. Output ONLY the raw JSON object. No markdown, no explanation, no backticks.
2. Do not invent action names.
3. Do not include "authorized: true" or any authorization claim.
4. Do not reference external systems, URLs, or databases beyond the schema above.
5. Keep all string values under 300 characters.
6. Maximum 5 proposed actions.`;

export interface OllamaClientError {
  kind: "unavailable" | "timeout" | "invalid_response" | "validation_error";
  message: string;
}

export type OllamaResult =
  | { ok: true;  proposal: AiProposal }
  | { ok: false; error: OllamaClientError };

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (err.name === "AbortError") throw Object.assign(new Error("Request timed out"), { kind: "timeout" });
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function extractJson(raw: string): string {
  // Strip markdown fences
  const stripped = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  // Find first { ... } block
  const start = stripped.indexOf("{");
  const end   = stripped.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return stripped;
  return stripped.slice(start, end + 1);
}

/**
 * Call the Ollama /api/chat endpoint and return a validated proposal.
 * Model output is NEVER returned raw — it is validated against AiProposalSchema
 * before this function returns.
 */
export async function proposeWithOllama(userMessage: string): Promise<OllamaResult> {
  const { baseUrl, model, timeoutMs } = CONFIG.ai;
  const url = `${baseUrl}/api/chat`;

  // Bound the incoming message
  const safeMessage = userMessage.slice(0, 800);

  let rawJson: string;
  try {
    const resp = await fetchWithTimeout(
      url,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          options: { temperature: 0, seed: 42, num_predict: 512 },
          format: "json",   // Ollama structured output hint (ignored by models that don't support it)
          messages: [
            { role: "system",  content: SYSTEM_PROMPT },
            { role: "user",    content: safeMessage },
          ],
        }),
      },
      timeoutMs
    );

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      console.error("[ai] Ollama HTTP error", resp.status, body.slice(0, 200));
      return {
        ok: false,
        error: {
          kind:    "unavailable",
          message: `Ollama returned HTTP ${resp.status}. Is the model running? (ollama run ${model})`,
        },
      };
    }

    const data = await resp.json() as { message?: { content?: string }; error?: string };
    if (data.error) {
      return {
        ok: false,
        error: { kind: "unavailable", message: `Ollama error: ${data.error}` },
      };
    }

    rawJson = data.message?.content ?? "";
    if (!rawJson) {
      return {
        ok: false,
        error: { kind: "invalid_response", message: "Ollama returned an empty response." },
      };
    }
  } catch (err: any) {
    const isTimeout = err.kind === "timeout" || err.name === "AbortError";
    console.error("[ai] Ollama request failed:", err.message);
    return {
      ok: false,
      error: {
        kind:    isTimeout ? "timeout" : "unavailable",
        message: isTimeout
          ? `Model timed out after ${timeoutMs / 1000}s. The model may still be loading.`
          : `Cannot reach Ollama at ${baseUrl}. Start Ollama and run: ollama run ${model}`,
      },
    };
  }

  // Extract and parse JSON (strip markdown fences if present)
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(rawJson));
  } catch {
    console.error("[ai] JSON parse failed. Raw output:", rawJson.slice(0, 300));
    return {
      ok: false,
      error: {
        kind:    "invalid_response",
        message: "Model returned malformed JSON. Try rephrasing your request.",
      },
    };
  }

  // Validate against the strict schema — model output is untrusted
  const validation = AiProposalSchema.safeParse(parsed);
  if (!validation.success) {
    console.error("[ai] Schema validation failed:", JSON.stringify(validation.error.flatten()));
    return {
      ok: false,
      error: {
        kind:    "validation_error",
        message: `Model output failed schema validation: ${validation.error.issues.map((i) => i.message).join("; ")}`,
      },
    };
  }

  // Double-check action/resourceId values are on the allowlist (belt-and-suspenders)
  for (const act of validation.data.proposedActions) {
    if (!(ALLOWED_ACTIONS as readonly string[]).includes(act.action)) {
      return {
        ok: false,
        error: { kind: "validation_error", message: `Rejected unknown action: ${act.action}` },
      };
    }
    if (!(ALLOWED_RESOURCE_IDS as readonly string[]).includes(act.resourceId)) {
      return {
        ok: false,
        error: { kind: "validation_error", message: `Rejected unknown resourceId: ${act.resourceId}` },
      };
    }
  }

  return { ok: true, proposal: validation.data };
}
