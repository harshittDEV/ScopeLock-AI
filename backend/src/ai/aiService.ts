// backend/src/ai/aiService.ts
// Provider-agnostic AI service entry point.
// Routes to the configured provider (ollama | openai-compat | none).
// All provider adapters must return validated AiProposals — never raw model output.

import { CONFIG } from "../config.js";
import { proposeWithOllama, type OllamaResult } from "./ollamaClient.js";
import type { AiProposal } from "./schema.js";

export type AiServiceResult =
  | { ok: true;  proposal: AiProposal }
  | { ok: false; error: { kind: string; message: string } };

/**
 * Generate a structured action proposal from a natural-language user message.
 * The returned proposal must STILL be authorized by the backend policy engine —
 * this function does not perform or imply authorization.
 */
export async function generateProposal(userMessage: string): Promise<AiServiceResult> {
  const provider = CONFIG.ai.provider;

  if (!provider) {
    return {
      ok: false,
      error: {
        kind: "unavailable",
        message:
          "No AI provider is configured. Set AI_PROVIDER=ollama and AI_BASE_URL in your environment, then run: ollama run llama3.2:3b",
      },
    };
  }

  if (provider === "ollama") {
    return proposeWithOllama(userMessage);
  }

  if (provider === "openai-compat") {
    // OpenAI-compatible endpoint (e.g. Together AI, Groq, OpenRouter, vLLM)
    // The Ollama client's format matches the OpenAI /v1/chat/completions shape
    // when Ollama is set up in OpenAI-compat mode. For a full OpenAI compat adapter,
    // implement here using CONFIG.ai.baseUrl + /v1/chat/completions with bearer auth.
    return {
      ok: false,
      error: {
        kind: "unavailable",
        message:
          "openai-compat provider is not yet fully implemented. Use AI_PROVIDER=ollama for local inference.",
      },
    };
  }

  return {
    ok: false,
    error: { kind: "unavailable", message: `Unknown AI_PROVIDER: ${String(provider)}` },
  };
}

export function isAiConfigured(): boolean {
  return Boolean(CONFIG.ai.provider);
}
