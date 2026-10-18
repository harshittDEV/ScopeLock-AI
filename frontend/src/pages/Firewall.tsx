import { useState } from "react";
import { api } from "../api";
import { useUser } from "../context/UserContext";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Lock,
  User,
  Cpu,
  Database,
} from "lucide-react";

/* ── Policy definitions ─────────────────────────────────── */
const POLICIES = [
  {
    action: "read_own_profile",
    rt: "employee",
    label: "Read own profile",
    desc: "Employees may read their own record",
    allowed: ["EMPLOYEE", "MANAGER", "ADMIN"],
  },
  {
    action: "read_salary",
    rt: "employee",
    label: "Read salary",
    desc: "Employees can only read their own salary; managers have department scope",
    allowed: ["EMPLOYEE (own)", "MANAGER", "ADMIN"],
  },
  {
    action: "list_department_employees",
    rt: "employee",
    label: "List dept employees",
    desc: "Managers may list their department",
    allowed: ["MANAGER", "ADMIN"],
  },
  {
    action: "update_department",
    rt: "employee",
    label: "Update department",
    desc: "Admin-only operation",
    allowed: ["ADMIN"],
  },
  {
    action: "delete_record",
    rt: "employee",
    label: "Delete record",
    desc: "Admin-only operation",
    allowed: ["ADMIN"],
  },
];

type Decision = {
  decision: "ALLOW" | "DENY";
  reasonCode: string;
  decisionId: string;
  principalId?: string;
} | null;

/* ── Role reference ──────────────────────────────────────── */
const ROLE_REF = [
  {
    role: "EMPLOYEE",
    color: "var(--accent)",
    bg: "var(--accent-dim)",
    border: "var(--accent-line)",
    perms: ["Read own profile", "Read own salary"],
  },
  {
    role: "MANAGER",
    color: "var(--amber)",
    bg: "var(--amber-bg)",
    border: "var(--amber-line)",
    perms: ["All employee permissions", "List department employees", "Read any salary (dept scope)"],
  },
  {
    role: "ADMIN",
    color: "var(--red)",
    bg: "var(--red-bg)",
    border: "var(--red-line)",
    perms: ["All manager permissions", "Update department", "Delete record"],
  },
];

export default function Firewall() {
  const { user }                    = useUser();
  const [action, setAction]         = useState(POLICIES[0].action);
  const [resourceId, setRid]        = useState("employee_101");
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<Decision>(null);
  const [history, setHistory]       = useState<
    Array<{ action: string; rid: string; res: Decision; actor: string }>
  >([]);

  const pol = POLICIES.find((p) => p.action === action);

  async function evaluate() {
    if (!pol) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await api.authorizeAction(action, pol.rt, resourceId, user.id);
      const dec = r.decision as Decision;
      setResult(dec);
      setHistory((h) => [
        { action, rid: resourceId, res: dec, actor: user.id },
        ...h.slice(0, 9),
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      alert(`Request failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="ph">
        <div>
          <h2>Authorization Firewall</h2>
          <div className="ph-sub">
            Evaluate backend policy decisions · Acting as&nbsp;
            <strong style={{ color: "var(--accent)" }}>{user.label}</strong>
          </div>
        </div>
      </div>

      <div className="firewall-grid" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
        {/* Left column: form + result */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Evaluation form */}
          <div className="card card-p">
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-1)", marginBottom: 16 }}>
              Evaluate Policy
            </div>

            {/* Principal (read-only) */}
            <div className="form-row">
              <label className="form-label" htmlFor="fw-principal">
                <User size={11} strokeWidth={2.5} style={{ display: "inline", marginRight: 4 }} />
                Principal (Identity)
              </label>
              <input
                id="fw-principal"
                value={`${user.id} · ${user.role} · ${user.department}`}
                readOnly
              />
            </div>

            {/* Action selector */}
            <div className="form-row">
              <label className="form-label" htmlFor="fw-action">
                <Cpu size={11} strokeWidth={2.5} style={{ display: "inline", marginRight: 4 }} />
                Action
              </label>
              <select
                id="fw-action"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                {POLICIES.map((p) => (
                  <option key={p.action} value={p.action}>
                    {p.label}
                  </option>
                ))}
              </select>
              {pol && (
                <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 5, lineHeight: 1.45 }}>
                  {pol.desc}
                </div>
              )}
            </div>

            {/* Resource selector */}
            <div className="form-row">
              <label className="form-label" htmlFor="fw-resource">
                <Database size={11} strokeWidth={2.5} style={{ display: "inline", marginRight: 4 }} />
                Target Resource
              </label>
              <select
                id="fw-resource"
                value={resourceId}
                onChange={(e) => setRid(e.target.value)}
              >
                <option value="employee_101">employee_101 (Alice)</option>
                <option value="employee_102">employee_102 (Bob)</option>
                <option value="employee_103">employee_103 (Carol)</option>
                <option value="employee_104">employee_104 (David)</option>
                <option value="employee_105">employee_105 (Admin)</option>
              </select>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={evaluate}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spin" />
                  Evaluating…
                </>
              ) : (
                <>
                  <ShieldCheck size={14} strokeWidth={2} />
                  Evaluate Authorization
                </>
              )}
            </button>

            <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-3)", lineHeight: 1.6 }}>
              Decision is enforced server-side by the policy engine. This form never determines
              authorization — it only submits the request to the backend.
            </div>
          </div>

          {/* Decision result */}
          {result && (
            <div className={`decision ${result.decision.toLowerCase()}`}>
              <div className="decision-emoji">
                {result.decision === "ALLOW" ? (
                  <CheckCircle2 size={36} strokeWidth={1.5} color="var(--green)" />
                ) : (
                  <XCircle size={36} strokeWidth={1.5} color="var(--red)" />
                )}
              </div>
              <div className={`decision-v ${result.decision.toLowerCase()}`}>
                {result.decision === "ALLOW" ? "Access Permitted" : "Access Denied"}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 10, textAlign: "left" }}>
                {[
                  ["Principal",   user.id],
                  ["Role",        user.role],
                  ["Action",      action],
                  ["Resource",    resourceId],
                  ["Decision",    result.decision],
                  ["Reason",      result.reasonCode],
                  ["Decision ID", result.decisionId?.slice(0, 16) + "…"],
                ].map(([k, v]) => (
                  <div key={k} className="decision-row">
                    <span className="decision-k">{k}</span>
                    <span className="decision-v2">{v}</span>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 12 }}>
                Decision is server-enforced · logged to audit trail
              </div>
            </div>
          )}
        </div>

        {/* Right column: history + policy reference */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Decision history */}
          <div className="card card-p">
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
              <History size={13} strokeWidth={2} style={{ color: "var(--text-3)" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>
                Decision History
              </span>
            </div>

            {history.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "var(--text-3)", padding: "8px 0" }}>
                No decisions yet — evaluate a policy above.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {history.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom:
                        i < history.length - 1 ? "1px solid var(--border-soft)" : "none",
                      gap: 8,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, fontFamily: "var(--mono)", color: "var(--text-2)", marginBottom: 1 }}>
                        {h.action}
                      </div>
                      <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>
                        {h.actor} → {h.rid}
                      </div>
                    </div>
                    {h.res && (
                      <span
                        className={`badge ${h.res.decision === "ALLOW" ? "badge-allow" : "badge-deny"}`}
                        style={{ flexShrink: 0 }}
                      >
                        {h.res.decision === "ALLOW" ? (
                          <CheckCircle2 size={10} strokeWidth={2.5} />
                        ) : (
                          <XCircle size={10} strokeWidth={2.5} />
                        )}
                        {h.res.decision}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Policy reference */}
          <div className="card card-p">
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
              <Lock size={13} strokeWidth={2} style={{ color: "var(--text-3)" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>
                Policy Reference
              </span>
            </div>

            {ROLE_REF.map((r) => (
              <div key={r.role} style={{ marginBottom: 14 }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: r.bg,
                    color: r.color,
                    border: `1px solid ${r.border}`,
                    marginBottom: 6,
                    letterSpacing: "0.04em",
                  }}
                >
                  {r.role}
                </div>
                {r.perms.map((p) => (
                  <div
                    key={p}
                    style={{ fontSize: 12, color: "var(--text-3)", paddingLeft: 10, marginBottom: 3 }}
                  >
                    · {p}
                  </div>
                ))}
              </div>
            ))}

            <div
              style={{
                marginTop: 8,
                padding: "10px 12px",
                background: "var(--bg-raised)",
                borderRadius: "var(--r-sm)",
                border: "1px solid var(--border)",
                fontSize: 11,
                color: "var(--text-3)",
                lineHeight: 1.6,
              }}
            >
              <AlertTriangle size={10} strokeWidth={2.5} style={{ display: "inline", marginRight: 4, color: "var(--amber)" }} />
              All decisions are enforced server-side. Identity is never trusted from the client.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
