// backend/src/ai/aiService.ts
// Provider-agnostic AI service entry point.
// Routes to the configured provider (ollama | openai-compat | none).
// All provider adapters return a validated AiProposal or a typed error —
// never raw model output.

import { CONFIG } from "../config";
import { proposeWithOllama } from "./ollamaClient";
import { proposeWithOpenAiCompat } from "./openaiCompatClient";
import type { AiProposal, PrincipalContext } from "./schema";

export type AiErrorKind =
  | "unavailable"
  | "auth"
  | "rate_limit"
  | "timeout"
  | "invalid_response"
  | "validation_error";

export type AiServiceResult =
  | { ok: true;  proposal: AiProposal }
  | { ok: false; error: { kind: AiErrorKind; message: string } };

/**
 * Generate a structured action proposal from a natural-language user message.
 *
 * @param userMessage  The natural-language request from the user (max 800 chars).
 * @param principal    Optional principal context injected into the system prompt
 *                     so the model knows which employee is calling. This is
 *                     display-only — authorization is NEVER derived from it.
 *
 * IMPORTANT: The returned proposal is NOT authorized. Every proposed action
 * must still be evaluated through the server-side policy engine (evaluatePolicy)
 * before any execution is attempted.
 */
export async function generateProposal(
  userMessage: string,
  principal?: PrincipalContext
): Promise<AiServiceResult> {
  const provider = CONFIG.ai.provider;

  if (!provider) {
    return {
      ok: false,
      error: {
        kind: "unavailable",
        message: [
          "No AI provider is configured.",
          "For local development: set AI_PROVIDER=ollama and run `ollama run llama3.2:3b`.",
          "For hosted deployment: set AI_PROVIDER=openai-compat, AI_BASE_URL, AI_MODEL, and AI_API_KEY.",
          "Example (Groq): AI_PROVIDER=openai-compat, AI_BASE_URL=https://api.groq.com/openai/v1, AI_MODEL=openai/gpt-oss-20b",
        ].join(" "),
      },
    };
  }

  if (provider === "ollama") {
    return proposeWithOllama(userMessage, principal);
  }

  if (provider === "openai-compat") {
    return proposeWithOpenAiCompat(userMessage, principal);
  }

  // Unknown provider value — config error, fail clearly
  return {
    ok: false,
    error: {
      kind: "unavailable",
      message: `Unknown AI_PROVIDER value: "${String(provider)}". Supported values: "ollama", "openai-compat".`,
    },
  };
}

export function isAiConfigured(): boolean {
  return Boolean(CONFIG.ai.provider);
}
