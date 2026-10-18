// frontend/src/fixtures/tools.ts
// DEMO FIXTURES — illustrative tool registry data. NOT live backend data.

export interface DemoTool {
  id: string;
  name: string;
  description: string;
  category: "data-read" | "data-write" | "admin" | "reporting";
  requiredRole: "EMPLOYEE" | "MANAGER" | "ADMIN";
  policyId: string;
  resourceScope: string;
  available: true; // always true in demo — backend availability not exposed via API
}

export const DEMO_TOOLS: DemoTool[] = [
  {
    id: "read_own_profile",
    name: "read_own_profile",
    description: "Read the calling principal's own employee profile record.",
    category: "data-read",
    requiredRole: "EMPLOYEE",
    policyId: "policy-employee-default",
    resourceScope: "employee/{own_id}",
    available: true,
  },
  {
    id: "read_salary",
    name: "read_salary",
    description: "Read salary information. Employees may only access their own record; managers have department scope.",
    category: "data-read",
    requiredRole: "EMPLOYEE",
    policyId: "policy-employee-default",
    resourceScope: "employee/{scope}",
    available: true,
  },
  {
    id: "list_department_employees",
    name: "list_department_employees",
    description: "List all employee records within the requesting principal's department.",
    category: "data-read",
    requiredRole: "MANAGER",
    policyId: "policy-manager-ops",
    resourceScope: "employee/*",
    available: true,
  },
  {
    id: "update_department",
    name: "update_department",
    description: "Update an employee's department assignment. Requires admin privileges.",
    category: "data-write",
    requiredRole: "ADMIN",
    policyId: "policy-admin-full",
    resourceScope: "employee/*",
    available: true,
  },
  {
    id: "delete_record",
    name: "delete_record",
    description: "Permanently delete an employee record. Admin-only destructive operation.",
    category: "admin",
    requiredRole: "ADMIN",
    policyId: "policy-admin-full",
    resourceScope: "employee/*",
    available: true,
  },
];

export const CATEGORY_LABELS: Record<DemoTool["category"], string> = {
  "data-read":  "Data Read",
  "data-write": "Data Write",
  "admin":      "Administrative",
  "reporting":  "Reporting",
};
