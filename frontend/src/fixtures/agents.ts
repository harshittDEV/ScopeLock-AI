// frontend/src/fixtures/agents.ts
// DEMO FIXTURES — illustrative data for presentation only.
// These records are NOT live backend data.

export interface DemoAgent {
  id: string;
  name: string;
  description: string;
  status: "active" | "idle" | "error";
  policyId: string;
  policyName: string;
  tools: string[];
  lastActivity: string; // ISO string
  requestsTotal: number;
  requestsAllowed: number;
  requestsDenied: number;
}

export const DEMO_AGENTS: DemoAgent[] = [
  {
    id: "agent-research-01",
    name: "Research Agent",
    description: "Searches and retrieves documents from authorized internal knowledge sources.",
    status: "active",
    policyId: "policy-research",
    policyName: "Research Scope Policy",
    tools: ["search_documents", "read_file", "list_directory"],
    lastActivity: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    requestsTotal: 47,
    requestsAllowed: 38,
    requestsDenied: 9,
  },
  {
    id: "agent-reporting-01",
    name: "Reporting Agent",
    description: "Generates summary reports from analytics and operational metrics.",
    status: "active",
    policyId: "policy-reporting",
    policyName: "Analytics Read Policy",
    tools: ["generate_report", "read_analytics", "export_csv"],
    lastActivity: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    requestsTotal: 22,
    requestsAllowed: 22,
    requestsDenied: 0,
  },
  {
    id: "agent-hr-01",
    name: "HR Assistant",
    description: "Handles HR queries — access strictly limited to own-record data.",
    status: "idle",
    policyId: "policy-hr-limited",
    policyName: "HR Read-Only Policy",
    tools: ["read_own_profile", "read_salary"],
    lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    requestsTotal: 14,
    requestsAllowed: 11,
    requestsDenied: 3,
  },
  {
    id: "agent-ops-01",
    name: "Operations Agent",
    description: "Manages department-level operational data. Manager-scoped access.",
    status: "idle",
    policyId: "policy-manager",
    policyName: "Manager Operations Policy",
    tools: ["list_department_employees", "read_salary", "update_department"],
    lastActivity: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    requestsTotal: 31,
    requestsAllowed: 28,
    requestsDenied: 3,
  },
  {
    id: "agent-admin-01",
    name: "Admin Agent",
    description: "Elevated-privilege agent for administrative operations. Requires admin identity.",
    status: "error",
    policyId: "policy-admin",
    policyName: "Admin Full Policy",
    tools: ["delete_record", "update_department", "list_department_employees"],
    lastActivity: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    requestsTotal: 8,
    requestsAllowed: 6,
    requestsDenied: 2,
  },
];
