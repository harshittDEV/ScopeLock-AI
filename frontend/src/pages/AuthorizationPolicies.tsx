import { useState } from "react";
import { DEMO_POLICIES, type DemoPolicy } from "../fixtures/policies";
import { PolicyStatusBadge, RoleBadge } from "../components/StatusBadge";
import { EmptyState } from "../components/EmptyState";
import { ShieldCheck, X, CheckCircle2, XCircle, Calendar, Info } from "lucide-react";

export default function AuthorizationPolicies() {
  const [selected, setSelected] = useState<DemoPolicy | null>(DEMO_POLICIES[0]);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Authorization Policies</div>
          <div className="page-subtitle">
            Read-only view of authorization rules governing every agent action. Policy enforcement is server-side.
          </div>
        </div>
        <div className="page-actions">
          <span style={{ fontSize:"10.5px", color:"var(--text-tertiary)", background:"var(--warning-bg)", border:"1px solid var(--warning-line)", padding:"3px 8px", borderRadius:"var(--r-xs)", fontWeight:600 }}>
            DEMO DATA — READ ONLY
          </span>
        </div>
      </div>

      <div className="alert alert-info" style={{ marginBottom:"var(--sp-5)" }}>
        <Info size={14} strokeWidth={2} style={{ flexShrink:0, marginTop:1 }} />
        <div>
          These policies reflect the authorization rules implemented in the backend policy engine.
          This view is read-only — policy changes require backend code changes.
          Policies cannot be edited through this interface.
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:"var(--sp-4)", alignItems:"start" }}>
        {/* Policy list */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Policy Registry</div>
              <div className="card-sub">{DEMO_POLICIES.length} active policies</div>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Policy Name</th>
                  <th>Scope</th>
                  <th>Status</th>
                  <th>Version</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_POLICIES.map((pol) => (
                  <tr
                    key={pol.id}
                    onClick={() => setSelected(selected?.id === pol.id ? null : pol)}
                    style={{ background: selected?.id === pol.id ? "var(--accent-dim)" : undefined }}
                  >
                    <td>
                      <div style={{ fontWeight:600, color:"var(--text-primary)", fontSize:"13px" }}>{pol.name}</div>
                      <div className="mono" style={{ fontSize:"10px", color:"var(--text-tertiary)" }}>{pol.id}</div>
                    </td>
                    <td><RoleBadge role={pol.scope} /></td>
                    <td><PolicyStatusBadge status={pol.status} /></td>
                    <td className="mono" style={{ fontSize:"11.5px", color:"var(--text-secondary)" }}>v{pol.version}</td>
                    <td style={{ fontSize:"11.5px", color:"var(--text-tertiary)", whiteSpace:"nowrap" }}>
                      {new Date(pol.lastUpdated).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className="detail-panel">
            <div style={{ padding:"var(--sp-4) var(--sp-5)", borderBottom:"1px solid var(--border-soft)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontWeight:700, fontSize:"13px" }}>Policy Inspector</div>
              <button className="btn btn-ghost btn-xs" onClick={() => setSelected(null)} aria-label="Close inspector">
                <X size={13} />
              </button>
            </div>
            <div style={{ padding:"var(--sp-5)" }}>
              {/* Header */}
              <div style={{ display:"flex", alignItems:"flex-start", gap:"var(--sp-3)", marginBottom:"var(--sp-4)" }}>
                <div style={{
                  width:36, height:36, borderRadius:"var(--r-sm)", flexShrink:0,
                  background:"var(--accent-dim)", border:"1px solid var(--accent-line)",
                  display:"flex", alignItems:"center", justifyContent:"center", color:"var(--accent)",
                }}>
                  <ShieldCheck size={17} strokeWidth={1.8} />
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:"13.5px", color:"var(--text-primary)", marginBottom:4 }}>{selected.name}</div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    <RoleBadge role={selected.scope} />
                    <PolicyStatusBadge status={selected.status} />
                  </div>
                </div>
              </div>

              <div style={{ fontSize:"12.5px", color:"var(--text-secondary)", lineHeight:1.65, marginBottom:"var(--sp-5)" }}>
                {selected.description}
              </div>

              {/* Meta */}
              <div className="info-list" style={{ marginBottom:"var(--sp-5)" }}>
                <div className="info-item">
                  <span className="info-key">ID</span>
                  <span className="info-val">{selected.id}</span>
                </div>
                <div className="info-item">
                  <span className="info-key">Version</span>
                  <span className="info-val">v{selected.version}</span>
                </div>
                <div className="info-item">
                  <span className="info-key">Scope</span>
                  <span className="info-val">{selected.scope}</span>
                </div>
                <div className="info-item">
                  <span className="info-key">Resources</span>
                  <span className="info-val">{selected.resources.join(", ")}</span>
                </div>
                <div className="info-item">
                  <span className="info-key">
                    <Calendar size={11} style={{ display:"inline", marginRight:3 }} />
                    Last Updated
                  </span>
                  <span className="info-val">{new Date(selected.lastUpdated).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Allowed actions */}
              <div style={{ marginBottom:"var(--sp-4)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:"var(--sp-2)", fontSize:"11px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--success)" }}>
                  <CheckCircle2 size={11} strokeWidth={2.5} />
                  Allowed Actions
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  {selected.allowedActions.length > 0 ? selected.allowedActions.map((a) => (
                    <div key={a} style={{
                      display:"flex", alignItems:"center", gap:8,
                      padding:"6px 10px",
                      background:"var(--success-bg)", border:"1px solid var(--success-line)",
                      borderRadius:"var(--r-sm)", fontSize:"12px", color:"var(--success)",
                    }}>
                      <CheckCircle2 size={11} strokeWidth={2.5} style={{ flexShrink:0 }} />
                      <code style={{ fontFamily:"var(--mono)", fontSize:"11px" }}>{a}</code>
                    </div>
                  )) : (
                    <div style={{ fontSize:"12px", color:"var(--text-tertiary)" }}>None</div>
                  )}
                </div>
              </div>

              {/* Denied actions */}
              {selected.deniedActions.length > 0 && (
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:"var(--sp-2)", fontSize:"11px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--danger)" }}>
                    <XCircle size={11} strokeWidth={2.5} />
                    Restricted Actions
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    {selected.deniedActions.map((a) => (
                      <div key={a} style={{
                        display:"flex", alignItems:"center", gap:8,
                        padding:"6px 10px",
                        background:"var(--danger-bg)", border:"1px solid var(--danger-line)",
                        borderRadius:"var(--r-sm)", fontSize:"12px", color:"var(--danger)",
                      }}>
                        <XCircle size={11} strokeWidth={2.5} style={{ flexShrink:0 }} />
                        <code style={{ fontFamily:"var(--mono)", fontSize:"11px" }}>{a}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop:"var(--sp-5)", padding:"10px 12px", background:"var(--surface-raised)", border:"1px solid var(--border)", borderRadius:"var(--r)", fontSize:"11px", color:"var(--text-tertiary)", lineHeight:1.6 }}>
                This policy is enforced deterministically by the backend. Frontend display has no effect on authorization outcomes.
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <EmptyState
              Icon={ShieldCheck}
              title="No policy selected"
              message="Click a policy in the table to inspect its rules and scope."
            />
          </div>
        )}
      </div>
    </div>
  );
}
