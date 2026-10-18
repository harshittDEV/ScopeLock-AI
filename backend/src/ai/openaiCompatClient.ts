// backend/src/ai/openaiCompatClient.ts
//
// OpenAI-compatible inference client.
// Supports any provider that implements the POST /chat/completions endpoint,
// including Groq, Together AI, OpenRouter, and self-hosted vLLM.
//
// Response format: OpenAI ChatCompletion — NOT the Ollama /api/chat format.
// These are different schemas. This adapter is NOT a copy of ollamaClient.ts.
//
// URL construction:
//   AI_BASE_URL = "https://api.groq.com/openai/v1"   (provider docs API base)
//   Adapter appends: /chat/completions
//   Final URL:       https://api.groq.com/openai/v1/chat/completions
//
//   Do NOT set AI_BASE_URL to https://api.groq.com/openai/v1/chat/completions —
//   that would result in /chat/completions/chat/completions.
//
// Auth: Bearer token from AI_API_KEY. Never sent to the browser.
// Credentials are logged at debug level only as "present/absent", never as values.

import { CONFIG } from "../config.js";
import {
  AiProposalSchema,
  type AiProposal,
  ALLOWED_ACTIONS,
  ALLOWED_RESOURCE_IDS,
} from "./schema.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface OpenAiCompatError {
  kind: "unavailable" | "auth" | "rate_limit" | "timeout" | "invalid_response" | "validation_error";
  message: string;
  httpStatus?: number;
}

export type OpenAiCompatResult =
  | { ok: true;  proposal: AiProposal }
  | { ok: false; error: OpenAiCompatError };

// OpenAI ChatCompletion response shape (minimal subset we need)
interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
    finish_reason?: string;
  }>;
  error?: {
    message?: string;
    type?:    string;
    code?:    string | number;
  };
}

// ── Shared system prompt (identical to Ollama adapter) ────────────────────────
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

// ── URL helpers ───────────────────────────────────────────────────────────────

/** Strip trailing slashes from a base URL. */
function normalizeBase(base: string): string {
  return base.replace(/\/+$/, "");
}

/** Build the chat-completions URL, preventing double path segments. */
function buildChatUrl(baseUrl: string): string {
  const base = normalizeBase(baseUrl);
  // Guard: if the caller already appended /chat/completions, don't double it
  if (base.endsWith("/chat/completions")) return base;
  return `${base}/chat/completions`;
}

// ── Timeout fetch ─────────────────────────────────────────────────────────────

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw Object.assign(new Error("Request timed out"), { kind: "timeout" });
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── JSON extraction (strip markdown fences some providers add) ────────────────

function extractJson(raw: string): string {
  const stripped = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = stripped.indexOf("{");
  const end   = stripped.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return stripped;
  return stripped.slice(start, end + 1);
}

// ── Map HTTP status codes to typed error kinds ────────────────────────────────

function errorKindFromStatus(status: number): OpenAiCompatError["kind"] {
  if (status === 401 || status === 403) return "auth";
  if (status === 429)                   return "rate_limit";
  if (status >= 500)                    return "unavailable";
  return "unavailable";
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Call an OpenAI-compatible /chat/completions endpoint and return a validated proposal.
 * Model output is NEVER returned raw.
 */
export async function proposeWithOpenAiCompat(
  userMessage: string
): Promise<OpenAiCompatResult> {
  const { baseUrl, model, apiKey, timeoutMs } = CONFIG.ai;

  if (!baseUrl) {
    return {
      ok: false,
      error: {
        kind: "unavailable",
        message: "AI_BASE_URL is not set. Set it to your provider's API base URL (e.g. https://api.groq.com/openai/v1).",
      },
    };
  }

  if (!apiKey) {
    return {
      ok: false,
      error: {
        kind: "auth",
        message:
          "AI_API_KEY is not set. Add the key as a secret in your Render environment panel (never commit it).",
      },
    };
  }

  const url = buildChatUrl(baseUrl);
  const safeMessage = userMessage.slice(0, 800);

  // Note: not all OpenAI-compatible providers support every parameter.
  // Keeping to a safe common subset: model, messages, temperature, max_tokens.
  // Providers that do support response_format: { type: "json_object" } will be
  // prompted to return JSON via the system prompt even without that field.
  const requestBody = {
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: safeMessage   },
    ],
    temperature: 0,
    max_tokens:  512,
    // response_format is intentionally omitted — not supported by all providers.
    // JSON output is enforced via the system prompt instead.
  };

  let rawJson: string;
  try {
    const resp = await fetchWithTimeout(
      url,
      {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      },
      timeoutMs
    );

    const data: ChatCompletionResponse = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      const providerMsg = data?.error?.message ?? "";
      const kind = errorKindFromStatus(resp.status);
      console.error("[ai/openai-compat] HTTP error", resp.status, providerMsg.slice(0, 200));

      const humanMsg: Record<OpenAiCompatError["kind"], string> = {
        auth:             "Authentication failed. Verify AI_API_KEY is correct and not expired.",
        rate_limit:       "Provider rate limit hit. Wait briefly and try again.",
        unavailable:      `Provider returned HTTP ${resp.status}${providerMsg ? `: ${providerMsg}` : ""}. Check AI_BASE_URL and provider status.`,
        timeout:          "Request timed out.",
        invalid_response: "Invalid response from provider.",
        validation_error: "Model output failed validation.",
      };

      return { ok: false, error: { kind, message: humanMsg[kind], httpStatus: resp.status } };
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return {
        ok: false,
        error: {
          kind:    "invalid_response",
          message: "Provider returned an empty message content. The model may have refused the request.",
        },
      };
    }
    rawJson = content;
  } catch (err: any) {
    const isTimeout = err.kind === "timeout" || err.name === "AbortError";
    console.error("[ai/openai-compat] Request failed:", err.message);
    return {
      ok: false,
      error: {
        kind:    isTimeout ? "timeout" : "unavailable",
        message: isTimeout
          ? `Request timed out after ${timeoutMs / 1000}s.`
          : `Cannot reach provider at ${normalizeBase(baseUrl)}. Verify AI_BASE_URL is reachable from the deployed backend.`,
      },
    };
  }

  // Parse JSON — strip markdown fences some providers add
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(rawJson));
  } catch {
    console.error("[ai/openai-compat] JSON parse failed. Raw:", rawJson.slice(0, 300));
    return {
      ok: false,
      error: {
        kind:    "invalid_response",
        message: "Model returned malformed JSON. Try rephrasing your request or choosing a different model.",
      },
    };
  }

  // Validate against strict schema
  const validation = AiProposalSchema.safeParse(parsed);
  if (!validation.success) {
    console.error("[ai/openai-compat] Schema validation failed:", JSON.stringify(validation.error.flatten()));
    return {
      ok: false,
      error: {
        kind:    "validation_error",
        message: `Model output failed schema validation: ${validation.error.issues.map((i) => i.message).join("; ")}`,
      },
    };
  }

  // Belt-and-suspenders allowlist check
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
