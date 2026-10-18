import { useState } from "react";
import { DEMO_AGENTS, type DemoAgent } from "../fixtures/agents";
import { AgentStatusBadge } from "../components/StatusBadge";
import { EmptyState } from "../components/EmptyState";
import { Bot, Search, X, ExternalLink, Activity } from "lucide-react";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AgentsPage() {
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState<DemoAgent | null>(null);

  const filtered = DEMO_AGENTS.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Agents</div>
          <div className="page-subtitle">
            Inventory of AI agents operating within ScopeLock's authorization boundary.
          </div>
        </div>
        <div className="page-actions">
          <span style={{ fontSize:"10.5px", color:"var(--text-tertiary)", background:"var(--warning-bg)", border:"1px solid var(--warning-line)", padding:"3px 8px", borderRadius:"var(--r-xs)", fontWeight:600 }}>
            DEMO DATA
          </span>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns: selected ? "1fr 340px" : "1fr", gap:"var(--sp-4)", alignItems:"start" }}>
        {/* Main table */}
        <div className="card">
          {/* Filter bar */}
          <div className="filter-bar">
            <div className="search-field" style={{ flex:1, maxWidth:280 }}>
              <span className="search-field-icon"><Search size={13} strokeWidth={2} /></span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search agents…"
                style={{ fontSize:"12px" }}
                aria-label="Search agents"
              />
            </div>
            {search && (
              <button className="btn btn-ghost btn-xs" onClick={() => setSearch("")} aria-label="Clear search">
                <X size={11} />
              </button>
            )}
            <span style={{ fontSize:"11px", color:"var(--text-tertiary)", marginLeft:"auto" }}>
              {filtered.length} agent{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <EmptyState Icon={Bot} title="No agents found" message="Try adjusting the search query." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Status</th>
                    <th>Policy</th>
                    <th>Decisions</th>
                    <th>Last Active</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((agent) => {
                    const denyRate = agent.requestsTotal > 0
                      ? `${((agent.requestsDenied / agent.requestsTotal) * 100).toFixed(0)}% denied`
                      : "No activity";
                    return (
                      <tr
                        key={agent.id}
                        onClick={() => setSelected(selected?.id === agent.id ? null : agent)}
                        style={{ background: selected?.id === agent.id ? "var(--accent-dim)" : undefined }}
                        aria-selected={selected?.id === agent.id}
                      >
                        <td>
                          <div style={{ fontWeight:600, color:"var(--text-primary)", fontSize:"13px", marginBottom:2 }}>
                            {agent.name}
                          </div>
                          <div className="mono" style={{ fontSize:"10.5px", color:"var(--text-tertiary)" }}>
                            {agent.id}
                          </div>
                        </td>
                        <td><AgentStatusBadge status={agent.status} /></td>
                        <td style={{ fontSize:"12px" }}>
                          <div style={{ fontWeight:500, color:"var(--text-secondary)" }}>{agent.policyName}</div>
                          <div className="mono" style={{ fontSize:"10px", color:"var(--text-tertiary)" }}>{agent.policyId}</div>
                        </td>
                        <td>
                          <div style={{ fontSize:"12px", fontWeight:600, color:"var(--text-primary)" }}>
                            {agent.requestsTotal.toLocaleString()}
                          </div>
                          <div style={{ fontSize:"10.5px", color: agent.requestsDenied > 0 ? "var(--danger)" : "var(--text-tertiary)" }}>
                            {denyRate}
                          </div>
                        </td>
                        <td style={{ fontSize:"11.5px", color:"var(--text-tertiary)", whiteSpace:"nowrap" }}>
                          {timeAgo(agent.lastActivity)}
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-xs" onClick={(e) => {
                            e.stopPropagation();
                            setSelected(selected?.id === agent.id ? null : agent);
                          }} aria-label="View details">
                            <ExternalLink size={11} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="detail-panel">
            <div style={{ padding:"var(--sp-4) var(--sp-5)", borderBottom:"1px solid var(--border-soft)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontWeight:700, fontSize:"13px", color:"var(--text-primary)" }}>Agent Detail</div>
              <button className="btn btn-ghost btn-xs" onClick={() => setSelected(null)} aria-label="Close detail">
                <X size={13} />
              </button>
            </div>

            <div style={{ padding:"var(--sp-5)" }}>
              {/* Header */}
              <div style={{ display:"flex", alignItems:"center", gap:"var(--sp-3)", marginBottom:"var(--sp-5)" }}>
                <div style={{
                  width:40, height:40, borderRadius:"var(--r)", background:"var(--info-bg)",
                  border:"1px solid var(--info-line)", display:"flex", alignItems:"center", justifyContent:"center",
                  color:"var(--info)", flexShrink:0,
                }}>
                  <Bot size={18} strokeWidth={1.8} />
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:"14px", color:"var(--text-primary)" }}>{selected.name}</div>
                  <div className="mono" style={{ fontSize:"10.5px", color:"var(--text-tertiary)" }}>{selected.id}</div>
                </div>
              </div>

              <AgentStatusBadge status={selected.status} />
              <div style={{ fontSize:"12px", color:"var(--text-secondary)", marginTop:"var(--sp-3)", lineHeight:1.6, marginBottom:"var(--sp-4)" }}>
                {selected.description}
              </div>

              {/* Stats */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"var(--sp-2)", marginBottom:"var(--sp-4)" }}>
                {[
                  { label:"Total",   value:selected.requestsTotal,   color:"var(--text-primary)" },
                  { label:"Allowed", value:selected.requestsAllowed, color:"var(--success)" },
                  { label:"Denied",  value:selected.requestsDenied,  color:"var(--danger)" },
                ].map((s) => (
                  <div key={s.label} style={{ background:"var(--surface-raised)", borderRadius:"var(--r-sm)", padding:"10px 12px", textAlign:"center" }}>
                    <div style={{ fontSize:"18px", fontWeight:800, color:s.color, fontVariantNumeric:"tabular-nums" }}>{s.value}</div>
                    <div style={{ fontSize:"10px", color:"var(--text-tertiary)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em" }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Fields */}
              <div className="info-list">
                {[
                  ["Policy",       selected.policyName],
                  ["Last Active",  timeAgo(selected.lastActivity)],
                ].map(([k, v]) => (
                  <div key={k} className="info-item">
                    <span className="info-key">{k}</span>
                    <span className="info-val">{v}</span>
                  </div>
                ))}
              </div>

              {/* Tools */}
              <div style={{ marginTop:"var(--sp-4)" }}>
                <div style={{ fontSize:"10.5px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--text-tertiary)", marginBottom:"var(--sp-2)" }}>
                  Permitted Tools
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"var(--sp-1)" }}>
                  {selected.tools.map((t) => (
                    <code key={t} className="code-token">{t}</code>
                  ))}
                </div>
              </div>

              <div style={{ marginTop:"var(--sp-5)", padding:"10px 12px", background:"var(--info-bg)", border:"1px solid var(--info-line)", borderRadius:"var(--r)", fontSize:"11px", color:"var(--info)", lineHeight:1.55 }}>
                <Activity size={11} style={{ display:"inline", marginRight:5 }} />
                Activity counts are illustrative demo data. Real counts are recorded in the backend audit trail.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
