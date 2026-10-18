// backend/src/ai/aiService.ts
// Provider-agnostic AI service entry point.
// Routes to the configured provider (ollama | openai-compat | none).
// All provider adapters return a validated AiProposal or a typed error —
// never raw model output.

import { CONFIG } from "../config.js";
import { proposeWithOllama } from "./ollamaClient.js";
import { proposeWithOpenAiCompat } from "./openaiCompatClient.js";
import type { AiProposal } from "./schema.js";

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
 * IMPORTANT: The returned proposal is NOT authorized. Every proposed action
 * must still be evaluated through the server-side policy engine (evaluatePolicy)
 * before any execution is attempted.
 */
export async function generateProposal(userMessage: string): Promise<AiServiceResult> {
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
        ].join(" "),
      },
    };
  }

  if (provider === "ollama") {
    return proposeWithOllama(userMessage);
  }

  if (provider === "openai-compat") {
    return proposeWithOpenAiCompat(userMessage);
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
