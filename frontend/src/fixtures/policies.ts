// frontend/src/fixtures/policies.ts
// DEMO FIXTURES — illustrative policy data. NOT live backend configuration.

export interface DemoPolicy {
  id: string;
  name: string;
  description: string;
  scope: "EMPLOYEE" | "MANAGER" | "ADMIN";
  allowedActions: string[];
  deniedActions: string[];
  resources: string[];
  status: "active" | "draft" | "deprecated";
  version: string;
  lastUpdated: string;
}

export const DEMO_POLICIES: DemoPolicy[] = [
  {
    id: "policy-employee-default",
    name: "Employee Default Policy",
    description: "Standard access policy for all EMPLOYEE-role principals. Permits read access to own records only.",
    scope: "EMPLOYEE",
    allowedActions: ["read_own_profile", "read_salary"],
    deniedActions: ["list_department_employees", "update_department", "delete_record", "read_salary (other)"],
    resources: ["employee/{own_id}"],
    status: "active",
    version: "1.0",
    lastUpdated: "2025-10-01T00:00:00Z",
  },
  {
    id: "policy-manager-ops",
    name: "Manager Operations Policy",
    description: "Permits managers to read department-scoped employee data and salary information.",
    scope: "MANAGER",
    allowedActions: ["read_own_profile", "read_salary", "list_department_employees"],
    deniedActions: ["update_department", "delete_record"],
    resources: ["employee/*"],
    status: "active",
    version: "1.0",
    lastUpdated: "2025-10-01T00:00:00Z",
  },
  {
    id: "policy-admin-full",
    name: "Admin Full Access Policy",
    description: "Unrestricted access for ADMIN principals. All defined actions permitted.",
    scope: "ADMIN",
    allowedActions: ["read_own_profile", "read_salary", "list_department_employees", "update_department", "delete_record"],
    deniedActions: [],
    resources: ["employee/*"],
    status: "active",
    version: "1.0",
    lastUpdated: "2025-10-01T00:00:00Z",
  },
];
