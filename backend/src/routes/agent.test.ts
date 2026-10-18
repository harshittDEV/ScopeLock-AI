// backend/src/routes/agent.test.ts
// Integration tests for the /api/agent pipeline.
// Mocks the AI service so tests run without a live Ollama instance.

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// ── Mock MUST be hoisted before app import ───────────────────────────────────
vi.mock("../ai/aiService", () => ({
  isAiConfigured: vi.fn(() => true),
  generateProposal: vi.fn(),
}));

import app from "../app";
import { generateProposal, isAiConfigured } from "../ai/aiService";

const mockGenerate  = generateProposal as ReturnType<typeof vi.fn>;
const mockConfigured = isAiConfigured  as ReturnType<typeof vi.fn>;

// ── Headers ──────────────────────────────────────────────────────────────────
const ALICE = { "x-demo-user-id": "alice" };  // EMPLOYEE
const CAROL = { "x-demo-user-id": "carol" };  // MANAGER
const ADMIN = { "x-demo-user-id": "admin" };  // ADMIN

function validProposal(action: string, resourceId: string) {
  return {
    ok: true,
    proposal: {
      interpretation:        `Perform ${action} on ${resourceId}`,
      clarificationRequired: false,
      proposedActions: [{ action, resourceType: "employee", resourceId, rationale: "test" }],
    },
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe("POST /api/agent/propose", () => {
  beforeEach(() => {
    mockConfigured.mockReturnValue(true);
    vi.clearAllMocks();
  });

  it("401 — no identity header", async () => {
    const r = await request(app).post("/api/agent/propose").send({ message: "test" });
    expect(r.status).toBe(401);
  });

  it("400 — missing message field", async () => {
    const r = await request(app).post("/api/agent/propose").set(ALICE).send({});
    expect(r.status).toBe(400);
    expect(r.body.message).toMatch(/message/i);
  });

  it("400 — message exceeds 800 chars", async () => {
    const r = await request(app).post("/api/agent/propose").set(ALICE).send({ message: "x".repeat(801) });
    expect(r.status).toBe(400);
  });

  it("503 — AI not configured", async () => {
    mockConfigured.mockReturnValue(false);
    const r = await request(app).post("/api/agent/propose").set(ALICE).send({ message: "test" });
    expect(r.status).toBe(503);
    expect(r.body.aiAvailable).toBe(false);
  });

  it("503 — model unavailable", async () => {
    mockGenerate.mockResolvedValue({ ok: false, error: { kind: "unavailable", message: "no ollama" } });
    const r = await request(app).post("/api/agent/propose").set(ALICE).send({ message: "test" });
    expect(r.status).toBe(503);
    expect(r.body.error.kind).toBe("unavailable");
  });

  it("200 clarification — ambiguous request", async () => {
    mockGenerate.mockResolvedValue({
      ok: true,
      proposal: { interpretation: "unclear", clarificationRequired: true, clarificationMessage: "Which one?", proposedActions: [] },
    });
    const r = await request(app).post("/api/agent/propose").set(ALICE).send({ message: "do stuff" });
    expect(r.status).toBe(200);
    expect(r.body.clarificationRequired).toBe(true);
    expect(r.body.actions).toHaveLength(0);
  });

  it("ALLOW — alice reads her own profile (employee_101)", async () => {
    mockGenerate.mockResolvedValue(validProposal("read_own_profile", "employee_101"));
    const r = await request(app).post("/api/agent/propose").set(ALICE).send({ message: "my profile" });
    expect(r.status).toBe(200);
    expect(r.body.actions[0].authorization.decision).toBe("ALLOW");
    expect(r.body.actions[0].execution.attempted).toBe(true);
    expect(r.body.actions[0].execution.success).toBe(true);
    // Returned data must include employee record
    expect(r.body.actions[0].execution.data).toBeDefined();
  });

  it("DENY + no execution — alice reads bob's profile (cross-user)", async () => {
    mockGenerate.mockResolvedValue(validProposal("read_own_profile", "employee_102"));
    const r = await request(app).post("/api/agent/propose").set(ALICE).send({ message: "bob profile" });
    expect(r.status).toBe(200);
    const a = r.body.actions[0];
    expect(a.authorization.decision).toBe("DENY");
    expect(a.execution.attempted).toBe(false);   // zero side effects
    expect(a.execution.success).toBe(false);
  });

  it("ALLOW — carol (MANAGER) lists department employees", async () => {
    mockGenerate.mockResolvedValue(validProposal("list_department_employees", "employee_101"));
    const r = await request(app).post("/api/agent/propose").set(CAROL).send({ message: "list team" });
    expect(r.status).toBe(200);
    expect(r.body.actions[0].authorization.decision).toBe("ALLOW");
    expect(Array.isArray(r.body.actions[0].execution.data)).toBe(true);
  });

  it("DENY — alice (EMPLOYEE) cannot list department employees", async () => {
    mockGenerate.mockResolvedValue(validProposal("list_department_employees", "employee_101"));
    const r = await request(app).post("/api/agent/propose").set(ALICE).send({ message: "list team" });
    expect(r.status).toBe(200);
    expect(r.body.actions[0].authorization.decision).toBe("DENY");
    expect(r.body.actions[0].execution.attempted).toBe(false);
  });

  it("MODEL CANNOT GRANT PRIVILEGE: delete_record denied for alice even if model proposes it", async () => {
    mockGenerate.mockResolvedValue(validProposal("delete_record", "employee_103"));
    const r = await request(app).post("/api/agent/propose").set(ALICE).send({ message: "delete carol" });
    expect(r.status).toBe(200);
    const a = r.body.actions[0];
    expect(a.authorization.decision).toBe("DENY");
    expect(a.execution.attempted).toBe(false);
  });

  it("ALLOW policy + demo-safe: admin delete is authorized but disabled in demo", async () => {
    mockGenerate.mockResolvedValue(validProposal("delete_record", "employee_103"));
    const r = await request(app).post("/api/agent/propose").set(ADMIN).send({ message: "delete emp 103" });
    expect(r.status).toBe(200);
    const a = r.body.actions[0];
    expect(a.authorization.decision).toBe("ALLOW");
    expect(a.execution.attempted).toBe(true);
    expect(a.execution.success).toBe(false);
    expect(a.execution.error).toMatch(/demo mode/i);
  });

  it("response always has correlationId and interpretation", async () => {
    mockGenerate.mockResolvedValue(validProposal("read_salary", "employee_101"));
    const r = await request(app).post("/api/agent/propose").set(ALICE).send({ message: "salary" });
    expect(r.status).toBe(200);
    expect(typeof r.body.correlationId).toBe("string");
    expect(typeof r.body.interpretation).toBe("string");
  });
});

describe("GET /api/agent/status", () => {
  it("returns AI status without exposing credentials", async () => {
    const r = await request(app).get("/api/agent/status");
    expect(r.status).toBe(200);
    expect(typeof r.body.configured).toBe("boolean");
    expect(r.body).not.toHaveProperty("apiKey");
  });
});
