# ScopeLock AI

**A role-based authorization gateway with an audit trail and an authorization-aware dashboard.**

ScopeLock AI is a full-stack demonstration of how applications can evaluate access requests, enforce deterministic authorization policies on the server, and record decisions for later inspection. It includes a React dashboard, a TypeScript/Express API, a SQLite database, a policy engine, and a chat-style interface for trying common authorization actions.

> **Project status:** This repository is a demo/prototype, not a production-ready security product. It uses demo identities and a keyword-based assistant flow. Review the security notes before deploying or connecting it to real employee data.

## Table of contents

- [What it does](#what-it-does)
- [How it works](#how-it-works)
- [Authorization model](#authorization-model)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [API overview](#api-overview)
- [Database](#database)
- [Testing and builds](#testing-and-builds)
- [Security limitations and next steps](#security-limitations-and-next-steps)

## What it does

- **Role-based authorization:** evaluates actions against a principal's role and requested resource.
- **Default-deny decisions:** requests are denied unless a policy rule explicitly permits them.
- **Audit logging:** stores allow/deny decisions, reason codes, policy version, correlation ID, and optional outcome/metadata.
- **Audit-log browsing:** exposes a paginated API with filters such as decision, action, principal, resource ID, and time range.
- **Metrics:** provides request/decision totals for the dashboard.
- **Demo identities:** seeds example employee, manager, and admin identities and employee records.
- **Authorization-aware assistant:** translates a small set of natural-language requests into predefined actions, then asks the backend to evaluate them.
- **Dashboard pages:** includes Dashboard, Firewall, Audit Log, AI Assistant, and About views.

## How it works

1. A user chooses one of the seeded demo identities in the frontend.
2. The frontend sends a request to the Express API. In demo mode, the identity is supplied through the `x-demo-user-id` request header.
3. The backend resolves that identity into a principal containing an ID, role, and department.
4. The policy engine evaluates the action, resource type, resource ID, and principal role.
5. The engine returns an `ALLOW` or `DENY` decision with a reason code and policy version.
6. The decision is recorded in SQLite regardless of whether access was allowed or denied.
7. The UI displays the decision; audit and metrics endpoints provide data for observability views.

The assistant is not the security boundary. The server-side policy engine is intended to make the final decision. The current assistant implementation uses keyword matching and a predefined action map; the presence of AI provider environment variables does not by itself mean a model is integrated.

## Authorization model

The policy engine currently recognizes these roles:

| Role | Intended behavior in the demo |
|---|---|
| `EMPLOYEE` | Read own profile and own salary when the resource ID matches the employee mapping. |
| `MANAGER` | Read own profile; read salary and list department employees according to the current policy rules. |
| `ADMIN` | Allow the actions that reach the policy engine with a recognized resource type. |

The current supported resource type is `employee`. Decisions include reason codes such as `ALLOWED_OWN_RESOURCE`, `ALLOWED_DEPARTMENT_SCOPE`, `ALLOWED_ADMIN_POLICY`, `RESOURCE_ACCESS_NOT_PERMITTED`, `UNKNOWN_RESOURCE_TYPE`, and `INVALID_ACTION_REQUEST`.

**Important implementation detail:** the current manager `read_salary` rule does not actually verify that the target employee belongs to the manager's department. Do not interpret the intended department-scoped behavior as a guarantee of the current implementation. See [Security limitations and next steps](#security-limitations-and-next-steps).

## Tech stack

### Frontend

- React 19
- TypeScript
- Vite
- React Router
- Recharts
- Lucide React icons

### Backend

- Node.js and TypeScript
- Express
- SQLite via `better-sqlite3`
- Zod (available as a dependency for validation)
- Pino (available as a dependency for logging)
- UUID generation
- CORS and dotenv
- Vitest and Supertest development dependencies

## Project structure

```text
ScopeLock-AI-main/
├── README.md
├── .env.example
├── package.json                 # npm workspaces and root scripts
├── package-lock.json
├── frontend/
│   ├── package.json
│   ├── index.html
│   └── src/
│       ├── App.tsx               # Application layout and navigation
│       ├── api.ts                # Frontend API client and types
│       ├── main.tsx              # React entry point
│       ├── context/
│       │   └── UserContext.tsx   # Selected demo user context
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── Firewall.tsx
│       │   ├── AIAssistant.tsx
│       │   ├── AuditLog.tsx
│       │   └── About.tsx
│       └── index.css
└── backend/
    ├── package.json
    └── src/
        ├── server.ts             # HTTP server startup
        ├── app.ts                # Express app, middleware and routes
        ├── config.ts             # Environment configuration
        ├── auth.ts               # Demo identity resolution
        ├── policy.ts             # Authorization rules and decisions
        ├── database.ts           # SQLite schema, seeds and queries
        ├── types.ts              # Shared authorization types
        ├── middleware/
        │   ├── requestId.ts
        │   └── errorHandler.ts
        ├── routes/
        │   ├── health.ts
        │   ├── demo.ts
        │   ├── me.ts
        │   ├── employee.ts
        │   ├── admin.ts
        │   ├── tools.ts
        │   ├── metrics.ts
        │   └── audit.ts
        └── evaluation/
            └── types.ts
```

## Getting started

### Prerequisites

- Node.js compatible with the versions required by the installed Vite/TypeScript dependencies
- npm

### 1. Install dependencies

From the repository root:

```bash
npm install
```

### 2. Configure the backend

Create a local `.env` file in the repository root. Start from the example:

```bash
cp .env.example .env
```

For local development, the example values use port `4000`, the Vite frontend origin `http://localhost:5173`, and demo identity mode. The database path is resolved relative to the backend process's current working directory, so verify the path behavior for your chosen launch command and ensure its parent directory exists if needed.

### 3. Start the backend

In terminal 1, from the repository root:

```bash
npm run dev:backend
```

The API is configured to listen on port `4000` when `PORT=4000` is set.

### 4. Start the frontend

In terminal 2, from the repository root:

```bash
npm run dev:frontend
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

You can also try the root `npm run dev` script, which starts both workspace development scripts in the background. Running the frontend and backend in separate terminals is easier to troubleshoot.

### 5. Verify the API

```bash
curl http://localhost:4000/api/health
```

To test an authorization request using the seeded demo identity:

```bash
curl -X POST http://localhost:4000/api/tools \
  -H 'Content-Type: application/json' \
  -H 'x-demo-user-id: alice' \
  -d '{"action":"read_salary","resourceType":"employee","resourceId":"employee_101"}'
```

The response includes a decision object and an `allowed` boolean. The exact response may include generated decision IDs and other fields.

## Environment variables

| Variable | Purpose | Example |
|---|---|---|
| `PORT` | Backend listening port | `4000` |
| `NODE_ENV` | Runtime environment label | `development` |
| `DATABASE_PATH` | SQLite database file path | `./backend/data/scopelock.db` |
| `FRONTEND_ORIGIN` | Comma-separated allowed frontend origins | `http://localhost:5173` |
| `ENABLE_DEMO_IDENTITY` | Enables header-based demo identity selection | `true` |
| `AI_PROVIDER` | Reserved/configuration field for an AI provider | Empty by default |
| `AI_MODEL` | Reserved/configuration field for a model name | Empty by default |
| `AI_BASE_URL` | Reserved/configuration field for a model API base URL | Empty by default |
| `AI_API_KEY` | Reserved/configuration field for a model API key | Empty by default |

The inspected assistant flow does not call an external model; do not put a production API key in the environment expecting the current assistant to use it.

## API overview

The backend mounts these route groups under `/api`:

| Route | Purpose |
|---|---|
| `GET /api/health` | Health/status check. |
| `/api/demo` | Demo-related endpoints. |
| `/api/me` | Current principal/profile-related endpoint(s). |
| `/api/employee` | Employee-related endpoint(s). |
| `/api/admin` | Admin-related endpoint(s). |
| `POST /api/tools` | Evaluate an authorization action. Requires an established principal. |
| `GET /api/metrics` | Return decision/request metrics. |
| `GET /api/audit` | Read paginated audit events with filters. |

The audit endpoint supports query parameters including `page`, `pageSize`, `decision`, `action`, `principal`, `resourceId`, `from`, and `to`. `pageSize` is bounded by the backend implementation.

For protected endpoints in demo mode, pass a valid `x-demo-user-id` header such as `alice`, `bob`, `carol`, `david`, or `admin`. Do not use this header-based mechanism as real authentication.

## Database

SQLite is initialized by `backend/src/database.ts`. The main tables are:

- **`users`** — demo identity, display name, role, and department.
- **`employees`** — employee ID, display name, department, job title, salary, and update timestamp.
- **`audit_events`** — principal, action, resource, decision, reason code, policy version, correlation ID, outcome, and metadata.

Demo users and employee records are seeded when the database has no users. Audit entries are written for authorization decisions, including denied requests.

## Testing and builds

From the repository root:

```bash
npm run build
npm test
```

The backend package defines a Vitest test script. The frontend package currently defines build, lint, dev, and preview scripts but no test script. Because the root `test` script invokes tests across all npm workspaces, confirm workspace test scripts are compatible before relying on it. If the root build fails, run the workspace builds individually to isolate the issue:

```bash
npm run build --prefix backend
npm run build --prefix frontend
```

## Security limitations and next steps

This codebase should be treated as a learning/demo project until the following issues are addressed:

1. **Replace demo identity with real authentication.** `x-demo-user-id` is user-selectable and must not be trusted in a production deployment. Use verified sessions or tokens and derive the principal from trusted server-side identity data.
2. **Enforce department scope.** The manager salary rule currently permits `read_salary` without checking the target employee's department. Implement and test explicit resource-level checks.
3. **Review authorization coverage.** The admin rule allows all requests that reach it for the recognized resource type; define a strict action allowlist and validate each action/resource combination.
4. **Protect audit data.** The audit route is mounted without the demo-auth middleware in the inspected app. Add appropriate authorization, tenant/department scoping, retention controls, and access logging.
5. **Validate request inputs.** Apply schema validation to body and query parameters, including allowed action names, resource types, IDs, dates, and pagination values.
6. **Harden deployment configuration.** Restrict CORS to intended origins in production, disable demo identity mode, manage secrets securely, and use environment-specific configuration.
7. **Add security tests.** Cover cross-employee access, cross-department manager access, unknown actions/resources, unauthenticated requests, and audit endpoint permissions.
8. **Clarify AI integration.** If an LLM is added, treat its output as an untrusted proposal. Keep policy evaluation and enforcement deterministic and server-side; never let model output grant permissions directly.
9. **Improve observability and reliability.** Ensure request/correlation IDs are propagated consistently, record execution outcomes, and define database backup and migration practices before using meaningful data.

## License

No license file was present in the inspected archive. Add a `LICENSE` file before publishing or accepting external contributions, and choose terms appropriate to the project.
