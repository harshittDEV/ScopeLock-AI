// backend/src/database.ts
import Database from "better-sqlite3";
import { CONFIG } from "./config";
import { Role, Principal } from "./types";
import { randomUUID } from "crypto";

// Initialize DB connection (singleton)
export const db = new Database(CONFIG.databasePath);

// Ensure tables exist
export function initSchema() {
  // Users table (demo identities)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('EMPLOYEE','MANAGER','ADMIN')),
      department TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS employees (
      employee_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      department TEXT NOT NULL,
      job_title TEXT NOT NULL,
      salary INTEGER NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS audit_events (
      event_id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      principal_id TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      decision TEXT NOT NULL CHECK (decision IN ('ALLOW','DENY')),
      reason_code TEXT NOT NULL,
      policy_version TEXT NOT NULL,
      correlation_id TEXT,
      outcome TEXT,
      metadata TEXT
    );
  `);
}

// Seed demo data if not already present
export function seedDemoData() {
  const count = (db.prepare(`SELECT COUNT(*) as cnt FROM users`).get() as any).cnt as number;
  if (count > 0) return; // already seeded

  const insertUser = db.prepare(`INSERT INTO users (id, display_name, role, department) VALUES (?, ?, ?, ?)`);
  const users = [
    { id: "alice", name: "Alice", role: Role.EMPLOYEE, dept: "Engineering" },
    { id: "bob", name: "Bob", role: Role.EMPLOYEE, dept: "Engineering" },
    { id: "carol", name: "Carol", role: Role.MANAGER, dept: "Engineering" },
    { id: "david", name: "David", role: Role.EMPLOYEE, dept: "Finance" },
    { id: "admin", name: "Admin", role: Role.ADMIN, dept: "Operations" },
  ];
  const insertEmployee = db.prepare(`INSERT INTO employees (employee_id, display_name, department, job_title, salary) VALUES (?, ?, ?, ?, ?)`);
  const employees = [
    { empId: "employee_101", name: "Alice", dept: "Engineering", title: "Software Engineer", salary: 90000 },
    { empId: "employee_102", name: "Bob", dept: "Engineering", title: "Software Engineer", salary: 85000 },
    { empId: "employee_103", name: "Carol", dept: "Engineering", title: "Engineering Manager", salary: 120000 },
    { empId: "employee_104", name: "David", dept: "Finance", title: "Financial Analyst", salary: 80000 },
    { empId: "employee_105", name: "Admin", dept: "Operations", title: "System Administrator", salary: 130000 },
  ];

  const tx = db.transaction(() => {
    for (const u of users) {
      insertUser.run(u.id, u.name, u.role, u.dept);
    }
    for (const e of employees) {
      insertEmployee.run(e.empId, e.name, e.dept, e.title, e.salary);
    }
  });
  tx();
}

// Utility fetch functions
export function getUserById(id: string) {
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as (Principal & { display_name: string }) | undefined;
}

export function getEmployeeById(empId: string) {
  return db.prepare(`SELECT * FROM employees WHERE employee_id = ?`).get(empId);
}

export function listEmployeesByDepartment(dept: string) {
  return db.prepare(`SELECT * FROM employees WHERE department = ?`).all(dept);
}

export function updateEmployeeDepartment(empId: string, newDept: string) {
  const stmt = db.prepare(`UPDATE employees SET department = ?, updated_at = datetime('now') WHERE employee_id = ?`);
  const info = stmt.run(newDept, empId);
  return info.changes;
}

export function updateEmployeeSalary(empId: string, newSalary: number) {
  const stmt = db.prepare(`UPDATE employees SET salary = ?, updated_at = datetime('now') WHERE employee_id = ?`);
  const info = stmt.run(newSalary, empId);
  return info.changes;
}

// Audit logging
export function recordAudit(event: {
  principalId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  decision: "ALLOW" | "DENY";
  reasonCode: string;
  policyVersion: string;
  correlationId?: string;
  outcome?: string;
  metadata?: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO audit_events (
      event_id, principal_id, action, resource_type, resource_id,
      decision, reason_code, policy_version, correlation_id, outcome, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    randomUUID(),
    event.principalId ?? null,
    event.action,
    event.resourceType,
    event.resourceId ?? null,
    event.decision,
    event.reasonCode,
    event.policyVersion,
    event.correlationId ?? null,
    event.outcome ?? null,
    event.metadata ?? null
  );
}

// Initialize on module load
initSchema();
seedDemoData();
