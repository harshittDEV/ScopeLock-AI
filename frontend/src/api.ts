// frontend/src/api.ts
const BASE = `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api`;

export type UserRole = "EMPLOYEE" | "MANAGER" | "ADMIN";

export interface DemoUser {
  id: string;
  label: string;
  role: UserRole;
  department: string;
}

export const DEMO_USERS: DemoUser[] = [
  { id: "alice", label: "Alice (Employee – Engineering)", role: "EMPLOYEE", department: "Engineering" },
  { id: "bob", label: "Bob (Employee – Engineering)", role: "EMPLOYEE", department: "Engineering" },
  { id: "carol", label: "Carol (Manager – Engineering)", role: "MANAGER", department: "Engineering" },
  { id: "david", label: "David (Employee – Finance)", role: "EMPLOYEE", department: "Finance" },
  { id: "admin", label: "Admin (Admin – Operations)", role: "ADMIN", department: "Operations" },
];

function headers(userId?: string) {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (userId) h["x-demo-user-id"] = userId;
  return h;
}

async function get<T>(path: string, userId?: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: headers(userId) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function post<T>(path: string, body: unknown, userId?: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: headers(userId),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || `${res.status}`);
  }
  return res.json();
}

export const api = {
  health: () => get<{ status: string; timestamp: string }>("/health"),

  metrics: (userId?: string) =>
    get<{
      period: null;
      totals: { requests: number; allowed: number; denied: number; executionFailures: number };
    }>("/metrics", userId),

  audit: (params: {
    page?: number;
    pageSize?: number;
    decision?: string;
    action?: string;
    from?: string;
    to?: string;
  }, userId?: string) => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.pageSize) q.set("pageSize", String(params.pageSize));
    if (params.decision) q.set("decision", params.decision);
    if (params.action) q.set("action", params.action);
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    return get<{
      items: AuditEvent[];
      pagination: { page: number; pageSize: number; total: number };
    }>(`/audit?${q}`, userId);
  },

  authorizeAction: (
    action: string,
    resourceType: string,
    resourceId: string,
    userId: string
  ) =>
    post<{
      decision: { decision: "ALLOW" | "DENY"; reasonCode: string; decisionId: string };
      allowed: boolean;
    }>("/tools", { action, resourceType, resourceId }, userId),
};

export interface AuditEvent {
  event_id: string;
  timestamp: string;
  principal_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  decision: "ALLOW" | "DENY";
  reason_code: string;
  policy_version: string;
  correlation_id: string | null;
  outcome: string | null;
  metadata: string | null;
}
