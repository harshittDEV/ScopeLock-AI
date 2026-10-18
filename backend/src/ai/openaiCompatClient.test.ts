// backend/src/ai/openaiCompatClient.test.ts
// Unit tests for the OpenAI-compatible adapter.
// Uses vi.stubGlobal to mock fetch — no real HTTP requests, no real API keys.
//
// Note on CONFIG mocking: the openaiCompatClient module reads CONFIG values at
// call time (not module-load time), so we can override CONFIG.ai fields directly
// in tests after importing the module.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CONFIG } from "../config";

// Patch CONFIG.ai to point at a fake provider BEFORE importing the adapter
CONFIG.ai.provider  = "openai-compat";
CONFIG.ai.model     = "llama3-70b-8192";
CONFIG.ai.baseUrl   = "https://api.groq.com/openai/v1";
CONFIG.ai.apiKey    = "test-key-not-real";
CONFIG.ai.timeoutMs = 5000;

import { proposeWithOpenAiCompat } from "./openaiCompatClient";

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockFetchOk(body: unknown): void {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok:     true,
    status: 200,
    json:   () => Promise.resolve(body),
    text:   () => Promise.resolve(JSON.stringify(body)),
  }));
}

function mockFetchErr(status: number, body: unknown): void {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok:     false,
    status,
    json:   () => Promise.resolve(body),
    text:   () => Promise.resolve(JSON.stringify(body)),
  }));
}

function chatCompletion(content: string) {
  return { choices: [{ message: { content }, finish_reason: "stop" }] };
}

const VALID_JSON = JSON.stringify({
  interpretation:        "Read alice's own employee profile",
  clarificationRequired: false,
  proposedActions: [{
    action: "read_own_profile", resourceType: "employee",
    resourceId: "employee_101", rationale: "user asked to see own profile",
  }],
});

// ── Test suite ────────────────────────────────────────────────────────────────

describe("proposeWithOpenAiCompat — happy path", () => {
  beforeEach(() => {
    // Reset to valid config before each test
    CONFIG.ai.baseUrl = "https://api.groq.com/openai/v1";
    CONFIG.ai.apiKey  = "test-key-not-real";
  });
  afterEach(() => vi.unstubAllGlobals());

  it("returns a validated proposal on success", async () => {
    mockFetchOk(chatCompletion(VALID_JSON));
    const result = await proposeWithOpenAiCompat("show me my profile");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.proposal.proposedActions[0].action).toBe("read_own_profile");
      expect(result.proposal.proposedActions[0].resourceId).toBe("employee_101");
    }
  });

  it("returns clarification response correctly", async () => {
    const clarifJson = JSON.stringify({
      interpretation: "unclear", clarificationRequired: true,
      clarificationMessage: "Which employee?", proposedActions: [],
    });
    mockFetchOk(chatCompletion(clarifJson));
    const result = await proposeWithOpenAiCompat("do something");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.proposal.clarificationRequired).toBe(true);
      expect(result.proposal.proposedActions).toHaveLength(0);
    }
  });

  it("strips markdown fences before JSON parse", async () => {
    mockFetchOk(chatCompletion("```json\n" + VALID_JSON + "\n```"));
    const result = await proposeWithOpenAiCompat("my profile");
    expect(result.ok).toBe(true);
  });

  it("builds correct URL — no double /chat/completions", async () => {
    let capturedUrl = "";
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string, init: RequestInit) => {
      capturedUrl = url;
      return Promise.resolve({ ok: true, status: 200,
        json: () => Promise.resolve(chatCompletion(VALID_JSON)),
        text: () => Promise.resolve(""),
      });
    }));
    await proposeWithOpenAiCompat("test");
    expect(capturedUrl).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(capturedUrl).not.toContain("chat/completions/chat/completions");
  });

  it("sends Authorization: Bearer header and never puts key in body", async () => {
    let capturedInit: RequestInit = {};
    vi.stubGlobal("fetch", vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      capturedInit = init;
      return Promise.resolve({ ok: true, status: 200,
        json: () => Promise.resolve(chatCompletion(VALID_JSON)),
        text: () => Promise.resolve(""),
      });
    }));
    await proposeWithOpenAiCompat("test");
    const hdrs = capturedInit.headers as Record<string, string>;
    expect(hdrs["Authorization"]).toBe("Bearer test-key-not-real");
    const body = JSON.parse(capturedInit.body as string);
    expect(JSON.stringify(body)).not.toContain("test-key-not-real");
  });
});

describe("proposeWithOpenAiCompat — HTTP error handling", () => {
  beforeEach(() => {
    CONFIG.ai.baseUrl = "https://api.groq.com/openai/v1";
    CONFIG.ai.apiKey  = "test-key-not-real";
  });
  afterEach(() => vi.unstubAllGlobals());

  it("returns auth error on 401", async () => {
    mockFetchErr(401, { error: { message: "Invalid API key" } });
    const r = await proposeWithOpenAiCompat("test");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("auth");
  });

  it("returns auth error on 403", async () => {
    mockFetchErr(403, { error: { message: "Forbidden" } });
    const r = await proposeWithOpenAiCompat("test");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("auth");
  });

  it("returns rate_limit error on 429", async () => {
    mockFetchErr(429, { error: { message: "Too many requests" } });
    const r = await proposeWithOpenAiCompat("test");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("rate_limit");
  });

  it("returns unavailable error on 500", async () => {
    mockFetchErr(500, { error: { message: "Internal server error" } });
    const r = await proposeWithOpenAiCompat("test");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("unavailable");
  });

  it("returns invalid_response when choices array is empty", async () => {
    mockFetchOk({ choices: [] });
    const r = await proposeWithOpenAiCompat("test");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("invalid_response");
  });

  it("returns invalid_response when content is null", async () => {
    mockFetchOk({ choices: [{ message: { content: null } }] });
    const r = await proposeWithOpenAiCompat("test");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("invalid_response");
  });

  it("returns invalid_response on malformed JSON from model", async () => {
    mockFetchOk(chatCompletion("this is not json at all"));
    const r = await proposeWithOpenAiCompat("test");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("invalid_response");
  });
});

describe("proposeWithOpenAiCompat — validation errors", () => {
  beforeEach(() => {
    CONFIG.ai.baseUrl = "https://api.groq.com/openai/v1";
    CONFIG.ai.apiKey  = "test-key-not-real";
  });
  afterEach(() => vi.unstubAllGlobals());

  it("rejects unknown action from model", async () => {
    const bad = JSON.stringify({
      interpretation: "do something", clarificationRequired: false,
      proposedActions: [{ action: "execute_shell", resourceType: "employee", resourceId: "employee_101" }],
    });
    mockFetchOk(chatCompletion(bad));
    const r = await proposeWithOpenAiCompat("test");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("validation_error");
  });

  it("rejects unknown resourceId from model", async () => {
    const bad = JSON.stringify({
      interpretation: "read profile", clarificationRequired: false,
      proposedActions: [{ action: "read_own_profile", resourceType: "employee", resourceId: "employee_999" }],
    });
    mockFetchOk(chatCompletion(bad));
    const r = await proposeWithOpenAiCompat("test");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("validation_error");
  });
});

describe("proposeWithOpenAiCompat — network failures", () => {
  beforeEach(() => {
    CONFIG.ai.baseUrl = "https://api.groq.com/openai/v1";
    CONFIG.ai.apiKey  = "test-key-not-real";
  });
  afterEach(() => vi.unstubAllGlobals());

  it("returns timeout error when fetch throws AbortError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(
      Object.assign(new Error("Aborted"), { name: "AbortError" })
    ));
    const r = await proposeWithOpenAiCompat("test");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("timeout");
  });

  it("returns unavailable on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const r = await proposeWithOpenAiCompat("test");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("unavailable");
  });
});

describe("proposeWithOpenAiCompat — missing config", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    // Restore valid config
    CONFIG.ai.baseUrl = "https://api.groq.com/openai/v1";
    CONFIG.ai.apiKey  = "test-key-not-real";
  });

  it("returns unavailable when AI_BASE_URL is empty", async () => {
    CONFIG.ai.baseUrl = "";
    const r = await proposeWithOpenAiCompat("test");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("unavailable");
  });

  it("returns auth error when AI_API_KEY is empty", async () => {
    CONFIG.ai.apiKey = "";
    const r = await proposeWithOpenAiCompat("test");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("auth");
  });
});
