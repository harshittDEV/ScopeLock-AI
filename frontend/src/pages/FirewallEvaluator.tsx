import { useState } from "react";
import { api } from "../api";
import { useUser } from "../context/UserContext";
import {
  ShieldCheck, History, Lock, AlertTriangle,
  CheckCircle2, XCircle, User, Cpu, Database,
} from "lucide-react";
import { DecisionBadge, RoleBadge } from "../components/StatusBadge";

const ACTIONS = [
  { action:"read_own_profile",           label:"Read own profile",         rt:"employee" },
  { action:"read_salary",                label:"Read salary",              rt:"employee" },
  { action:"list_department_employees",  label:"List dept employees",      rt:"employee" },
  { action:"update_department",          label:"Update department",        rt:"employee" },
  { action:"delete_record",             label:"Delete record",            rt:"employee" },
];

const RESOURCES = [
  { value:"employee_101", label:"employee_101 (Alice)" },
  { value:"employee_102", label:"employee_102 (Bob)" },
  { value:"employee_103", label:"employee_103 (Carol)" },
  { value:"employee_104", label:"employee_104 (David)" },
  { value:"employee_105", label:"employee_105 (Admin)" },
];

type Decision = { decision:"ALLOW"|"DENY"; reasonCode:string; decisionId:string } | null;
type HistoryItem = { action:string; rid:string; actor:string; res:Decision };

const ROLE_POLICY_MAP: Record<string,string> = {
  EMPLOYEE: "Employee Default Policy (read own only)",
  MANAGER:  "Manager Operations Policy (dept scope)",
  ADMIN:    "Admin Full Access Policy (unrestricted)",
};

export default function FirewallEvaluator() {
  const { user }                    = useUser();
  const [action, setAction]         = useState(ACTIONS[0].action);
  const [rid, setRid]               = useState("employee_101");
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<Decision>(null);
  const [history, setHistory]       = useState<HistoryItem[]>([]);

  const selAction = ACTIONS.find((a) => a.action === action)!;

  async function evaluate() {
    setLoading(true);
    setResult(null);
    try {
      const r = await api.authorizeAction(action, selAction.rt, rid, user.id);
      const d = r.decision as Decision;
      setResult(d);
      setHistory((h) => [{ action, rid, actor: user.id, res: d }, ...h.slice(0, 9)]);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Live Evaluator</div>
          <div className="page-subtitle">
            Submit authorization requests directly to the backend policy engine and inspect decisions.
          </div>
        </div>
      </div>

      <div className="firewall-grid" style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:"var(--sp-4)" }}>
        {/* Left: form + result */}
        <div style={{ display:"flex", flexDirection:"column", gap:"var(--sp-4)" }}>
          {/* Form */}
          <div className="card card-p">
            <div style={{ fontSize:"13.5px", fontWeight:700, color:"var(--text-primary)", marginBottom:"var(--sp-5)" }}>
              Evaluate Authorization Request
            </div>

            <div className="form-row">
              <label className="form-label" htmlFor="fw-principal">
                <User size={11} style={{ display:"inline", marginRight:4 }} />
                Principal (Demo Identity)
              </label>
              <input id="fw-principal" value={`${user.id} · ${user.role} · ${user.department}`} readOnly />
              <div style={{ fontSize:"11px", color:"var(--text-tertiary)", marginTop:5 }}>
                Active policy: {ROLE_POLICY_MAP[user.role] ?? "—"}
              </div>
            </div>

            <div className="form-row">
              <label className="form-label" htmlFor="fw-action">
                <Cpu size={11} style={{ display:"inline", marginRight:4 }} />
                Action
              </label>
              <select id="fw-action" value={action} onChange={(e) => setAction(e.target.value)}>
                {ACTIONS.map((a) => <option key={a.action} value={a.action}>{a.label}</option>)}
              </select>
            </div>

            <div className="form-row">
              <label className="form-label" htmlFor="fw-resource">
                <Database size={11} style={{ display:"inline", marginRight:4 }} />
                Target Resource
              </label>
              <select id="fw-resource" value={rid} onChange={(e) => setRid(e.target.value)}>
                {RESOURCES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <button
              className="btn btn-primary"
              style={{ width:"100%" }}
              onClick={() => void evaluate()}
              disabled={loading}
            >
              {loading ? <><span className="spin" />Evaluating…</> : <><ShieldCheck size={14} strokeWidth={2} />Evaluate Authorization</>}
            </button>

            <div style={{ marginTop:"var(--sp-3)", fontSize:"11px", color:"var(--text-tertiary)", lineHeight:1.6 }}>
              This form submits the request to <code style={{ fontFamily:"var(--mono)", fontSize:"10.5px" }}>/api/tools</code>.
              Authorization is determined server-side — this UI cannot influence the outcome.
            </div>
          </div>

          {/* Result */}
          {result && (
            <div style={{
              borderRadius:"var(--r-lg)", padding:"var(--sp-5)",
              border:`1px solid ${result.decision === "ALLOW" ? "var(--success-line)" : "var(--danger-line)"}`,
              background: result.decision === "ALLOW" ? "var(--success-bg)" : "var(--danger-bg)",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:"var(--sp-3)", marginBottom:"var(--sp-4)" }}>
                {result.decision === "ALLOW"
                  ? <CheckCircle2 size={32} strokeWidth={1.5} style={{ color:"var(--success)", flexShrink:0 }} />
                  : <XCircle     size={32} strokeWidth={1.5} style={{ color:"var(--danger)",  flexShrink:0 }} />}
                <div>
                  <div style={{ fontSize:"18px", fontWeight:800, letterSpacing:"-0.02em", color: result.decision === "ALLOW" ? "var(--success)" : "var(--danger)" }}>
                    {result.decision === "ALLOW" ? "Access Permitted" : "Access Denied"}
                  </div>
                  <div style={{ fontSize:"11px", color:"var(--text-tertiary)", marginTop:2 }}>
                    Decision enforced server-side · logged to audit trail
                  </div>
                </div>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                {[
                  ["Principal",    user.id],
                  ["Role",         user.role],
                  ["Action",       action],
                  ["Resource",     rid],
                  ["Decision",     result.decision],
                  ["Reason",       result.reasonCode],
                  ["Decision ID",  result.decisionId?.slice(0,18) + "…"],
                ].map(([k,v]) => (
                  <div key={k} style={{
                    display:"flex", justifyContent:"space-between",
                    padding:"7px 0",
                    borderBottom:`1px solid ${result.decision === "ALLOW" ? "rgba(35,132,91,0.12)" : "rgba(195,68,68,0.12)"}`,
                    fontSize:"12px",
                  }}>
                    <span style={{ color: result.decision === "ALLOW" ? "rgba(35,132,91,0.8)" : "rgba(195,68,68,0.8)" }}>{k}</span>
                    <span style={{ fontFamily:"var(--mono)", fontSize:"11px", color: result.decision === "ALLOW" ? "var(--success)" : "var(--danger)", fontWeight:600 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: history + reference */}
        <div style={{ display:"flex", flexDirection:"column", gap:"var(--sp-4)" }}>
          {/* History */}
          <div className="card card-p">
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:"var(--sp-4)" }}>
              <History size={13} strokeWidth={2} style={{ color:"var(--text-tertiary)" }} />
              <span style={{ fontSize:"13px", fontWeight:700, color:"var(--text-primary)" }}>Session History</span>
            </div>
            {history.length === 0 ? (
              <div style={{ fontSize:"12px", color:"var(--text-tertiary)" }}>No decisions evaluated yet.</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column" }}>
                {history.map((h, i) => (
                  <div key={i} style={{
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"8px 0", gap:"var(--sp-2)",
                    borderBottom: i < history.length - 1 ? "1px solid var(--border-soft)" : "none",
                  }}>
                    <div style={{ minWidth:0 }}>
                      <code style={{ fontFamily:"var(--mono)", fontSize:"11px", color:"var(--text-secondary)", display:"block", marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {h.action}
                      </code>
                      <span style={{ fontSize:"10.5px", color:"var(--text-tertiary)" }}>{h.actor} → {h.rid}</span>
                    </div>
                    {h.res && <DecisionBadge decision={h.res.decision} size="sm" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Policy reference */}
          <div className="card card-p">
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:"var(--sp-4)" }}>
              <Lock size={13} strokeWidth={2} style={{ color:"var(--text-tertiary)" }} />
              <span style={{ fontSize:"13px", fontWeight:700, color:"var(--text-primary)" }}>Policy Reference</span>
            </div>
            {[
              { role:"EMPLOYEE" as const, perms:["Read own profile","Read own salary"] },
              { role:"MANAGER"  as const, perms:["All employee permissions","List dept employees","Read any salary (dept)"] },
              { role:"ADMIN"    as const, perms:["All manager permissions","Update department","Delete record"] },
            ].map((r) => (
              <div key={r.role} style={{ marginBottom:"var(--sp-3)" }}>
                <div style={{ marginBottom:5 }}><RoleBadge role={r.role} /></div>
                {r.perms.map((p) => (
                  <div key={p} style={{ fontSize:"11.5px", color:"var(--text-tertiary)", paddingLeft:10, marginBottom:2 }}>
                    · {p}
                  </div>
                ))}
              </div>
            ))}
            <div style={{ marginTop:"var(--sp-3)", padding:"9px 11px", background:"var(--warning-bg)", border:"1px solid var(--warning-line)", borderRadius:"var(--r-sm)", fontSize:"11px", color:"var(--warning)", lineHeight:1.6 }}>
              <AlertTriangle size={10} style={{ display:"inline", marginRight:4 }} />
              Authorization is server-enforced. Identity is never trusted from the client.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
