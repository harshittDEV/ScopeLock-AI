import {
  ShieldCheck,
  ScrollText,
  Bot,
  Zap,
  Lock,
  Database,
  ExternalLink,
} from "lucide-react";

const STACK = [
  { label: "Frontend",   value: "React 19 + Vite 8" },
  { label: "Language",   value: "TypeScript" },
  { label: "Backend",    value: "Node.js + Express" },
  { label: "Database",   value: "SQLite (better-sqlite3)" },
  { label: "Charts",     value: "Recharts" },
  { label: "Icons",      value: "Lucide React" },
  { label: "Auth",       value: "Deterministic policy engine" },
  { label: "Audit",      value: "SQLite persisted events" },
  { label: "Hackathon",  value: "MLH — Best Open Source AI" },
];

const FEATURES = [
  {
    Icon: ShieldCheck,
    title: "Authorization Firewall",
    desc: "Every AI-proposed action passes through a centralized, deterministic policy engine before execution. The AI never determines final permissions.",
  },
  {
    Icon: ScrollText,
    title: "Immutable Audit Trail",
    desc: "All authorization decisions — allowed or denied — are persisted to SQLite. The audit log cannot be altered by the AI or the frontend.",
  },
  {
    Icon: Bot,
    title: "AI-Assisted Exploration",
    desc: "A natural-language assistant translates requests into structured actions, which are then validated and authorized server-side before execution.",
  },
  {
    Icon: Zap,
    title: "Live Security Dashboard",
    desc: "Real-time metrics derived from actual backend events. No fabricated data. Zero-values are shown when no events exist.",
  },
  {
    Icon: Lock,
    title: "Role-Based Access Control",
    desc: "Employees, Managers, and Admins have distinct permissions enforced exclusively on the backend. Client-supplied role claims are never trusted.",
  },
  {
    Icon: Database,
    title: "Demo-Safe Architecture",
    desc: "Synthetic employee records are used for demonstration. The security enforcement mechanisms are real and reflect production patterns.",
  },
];

const FLOW_STEPS = [
  "User Request",
  "AI Proposal",
  "Schema Validation",
  "Tool Registry",
  "Identity Resolution",
  "Policy Engine",
  "Protected Operation",
  "Audit Log",
];

const DEMO_IDENTITIES = [
  { id: "alice", name: "Alice",  role: "EMPLOYEE", dept: "Engineering" },
  { id: "bob",   name: "Bob",    role: "EMPLOYEE", dept: "Engineering" },
  { id: "carol", name: "Carol",  role: "MANAGER",  dept: "Engineering" },
  { id: "david", name: "David",  role: "EMPLOYEE", dept: "Finance" },
  { id: "admin", name: "Admin",  role: "ADMIN",    dept: "Operations" },
] as const;

const ROLE_BADGE_CLS: Record<string, string> = {
  EMPLOYEE: "badge-info",
  MANAGER:  "badge-warn",
  ADMIN:    "badge-deny",
};

export default function About() {
  return (
    <div>
      {/* Hero */}
      <div className="card about-hero">
        <ShieldCheck
          size={44}
          strokeWidth={1.5}
          style={{ color: "var(--accent)", marginBottom: 14, display: "block", margin: "0 auto 14px" }}
        />
        <h1>ScopeLock AI</h1>
        <p>
          A trustworthy, verifiable authorization firewall for AI agents.
          Every action proposed by AI is independently validated, authorized,
          and audited by a deterministic backend engine.
        </p>
      </div>

      {/* Feature cards */}
      <div className="feat-grid">
        {FEATURES.map((f) => (
          <div key={f.title} className="card feat">
            <f.Icon
              size={20}
              strokeWidth={1.8}
              style={{ color: "var(--accent)", marginBottom: 10, display: "block" }}
            />
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Authorization flow */}
      <div className="card card-p" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14, color: "var(--text-1)" }}>
          Authorization Flow
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            flexWrap: "wrap",
            rowGap: 8,
          }}
        >
          {FLOW_STEPS.map((s, i, arr) => (
            <div key={s} style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-sm)",
                  padding: "5px 11px",
                  fontSize: 11.5,
                  fontFamily: "var(--mono)",
                  color: "var(--text-2)",
                  whiteSpace: "nowrap",
                }}
              >
                {s}
              </div>
              {i < arr.length - 1 && (
                <span style={{ color: "var(--border)", padding: "0 4px", fontSize: 14 }}>
                  →
                </span>
              )}
            </div>
          ))}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: "var(--text-3)",
            marginTop: 12,
            padding: "10px 12px",
            background: "var(--bg-raised)",
            borderRadius: "var(--r-sm)",
            border: "1px solid var(--border)",
          }}
        >
          The AI only proposes. The policy engine decides. The audit log records.
        </div>
      </div>

      {/* Demo identities */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div>
            <div className="card-header-title">Demo Identities — Synthetic Data Only</div>
            <div className="card-header-sub">
              Five seeded users cover all role tiers for demonstration purposes
            </div>
          </div>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Role</th>
                <th>Department</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_IDENTITIES.map((u) => (
                <tr key={u.id}>
                  <td className="mono" style={{ color: "var(--accent)", fontWeight: 600 }}>
                    {u.id}
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--text-1)" }}>{u.name}</td>
                  <td>
                    <span className={`badge ${ROLE_BADGE_CLS[u.role]}`}>{u.role}</span>
                  </td>
                  <td style={{ color: "var(--text-3)" }}>{u.dept}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          style={{
            padding: "10px 16px",
            fontSize: 11.5,
            color: "var(--text-3)",
            borderTop: "1px solid var(--border-soft)",
          }}
        >
          ⚠ These are synthetic records for demonstration only. All salary and personal data is fictional.
        </div>
      </div>

      {/* Technology stack */}
      <div className="card card-p" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-1)", marginBottom: 14 }}>
          Technology Stack
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))",
            gap: 10,
          }}
        >
          {STACK.map((s) => (
            <div
              key={s.label}
              style={{
                background: "var(--bg-raised)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-sm)",
                padding: "11px 13px",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-3)",
                  marginBottom: 4,
                  fontWeight: 700,
                }}
              >
                {s.label}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-1)" }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Backend link */}
      <div className="card card-p">
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-1)", marginBottom: 10 }}>
          Deployed Backend
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, color: "var(--text-3)" }}>API Base:</span>
          <code
            style={{
              fontFamily: "var(--mono)",
              fontSize: 12,
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-sm)",
              padding: "3px 9px",
              color: "var(--accent)",
            }}
          >
            https://scopelock-ai.onrender.com/api
          </code>
          <a
            href="https://scopelock-ai.onrender.com/api/health"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            Health Check
            <ExternalLink size={11} strokeWidth={2} />
          </a>
        </div>
        <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--text-3)" }}>
          The frontend uses <code style={{ fontFamily: "var(--mono)", fontSize: 11 }}>VITE_API_URL</code> to
          configure the API base. No private credentials are exposed to the browser.
        </div>
      </div>
    </div>
  );
}
