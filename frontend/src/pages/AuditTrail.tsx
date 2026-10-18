import { useEffect, useState, useCallback } from "react";
import { api } from "../api";
import type { AuditEvent } from "../api";
import { useUser } from "../context/UserContext";
import {
  ScrollText, RefreshCw, AlertTriangle, Search, Filter,
  ChevronLeft, ChevronRight, X, Clock,
} from "lucide-react";
import { DecisionBadge } from "../components/StatusBadge";
import { EmptyState } from "../components/EmptyState";

const PAGE_SIZE = 20;
const DECISIONS = ["", "ALLOW", "DENY"] as const;

function SkeletonTable({ rows = 8 }: { rows?: number }) {
  return (
    <div style={{ padding:"var(--sp-4) var(--sp-5)", display:"flex", flexDirection:"column", gap:10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skel" style={{ height:15, opacity:1-i*0.1 }} />
      ))}
    </div>
  );
}

export default function AuditTrail() {
  const { user } = useUser();
  const [items, setItems]       = useState<AuditEvent[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [decision, setDec]      = useState<"" | "ALLOW" | "DENY">("");
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const [lastAt, setLastAt]     = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.audit(
        { page, pageSize: PAGE_SIZE, decision: decision || undefined },
        user.id
      );
      setItems(r.items);
      setTotal(r.pagination.total);
      setLastAt(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot load audit log");
    } finally {
      setLoading(false);
    }
  }, [page, decision, user.id]);

  useEffect(() => { void load(); }, [load]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const displayed = search
    ? items.filter((e) =>
        e.action.includes(search) ||
        (e.principal_id ?? "").includes(search) ||
        e.resource_type.includes(search) ||
        e.reason_code?.includes(search)
      )
    : items;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Audit Trail</div>
          <div className="page-subtitle">
            {total > 0
              ? `${total.toLocaleString()} persisted authorization events from the backend database.`
              : "All authorization decisions are logged to the backend database."}
            {lastAt && <span style={{ color:"var(--text-tertiary)", marginLeft:8 }}>Last updated {lastAt}</span>}
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => void load()} disabled={loading} aria-label="Refresh audit log">
            {loading ? <span className="spin" /> : <RefreshCw size={12} strokeWidth={2.5} />}
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={14} strokeWidth={2} style={{ flexShrink:0 }} />
          <div style={{ flex:1 }}>{error}</div>
          <button className="btn btn-ghost btn-sm" onClick={() => void load()}>Retry</button>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns: selected ? "1fr 360px" : "1fr", gap:"var(--sp-4)", alignItems:"start" }}>
        <div className="card">
          {/* Filter bar */}
          <div className="filter-bar">
            <div className="search-field" style={{ flex:1, maxWidth:280 }}>
              <span className="search-field-icon"><Search size={13} strokeWidth={2} /></span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by action, actor, resource…"
                style={{ fontSize:"12px" }}
                aria-label="Search audit events"
              />
            </div>
            {search && (
              <button className="btn btn-ghost btn-xs" onClick={() => setSearch("")} aria-label="Clear search">
                <X size={11} />
              </button>
            )}
            <Filter size={13} strokeWidth={2} style={{ color:"var(--text-tertiary)", flexShrink:0 }} />
            <select
              value={decision}
              onChange={(e) => { setDec(e.target.value as typeof decision); setPage(1); }}
              style={{ width:"auto", fontSize:"12px", padding:"5px 10px" }}
              aria-label="Filter by decision"
            >
              {DECISIONS.map((d) => (
                <option key={d} value={d}>{d || "All Decisions"}</option>
              ))}
            </select>
            <span style={{ fontSize:"11px", color:"var(--text-tertiary)", marginLeft:"auto", whiteSpace:"nowrap" }}>
              {displayed.length}{search ? " matches" : ` / ${total}`}
            </span>
          </div>

          {/* Table */}
          {loading ? (
            <SkeletonTable rows={10} />
          ) : displayed.length === 0 ? (
            <EmptyState
              Icon={ScrollText}
              title="No events found"
              message={
                decision
                  ? `No ${decision} events recorded.`
                  : "Run authorization tests to generate audit events."
              }
            />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Decision</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((event) => (
                    <tr
                      key={event.event_id}
                      onClick={() => setSelected(selected?.event_id === event.event_id ? null : event)}
                      style={{ background: selected?.event_id === event.event_id ? "var(--accent-dim)" : undefined }}
                      aria-selected={selected?.event_id === event.event_id}
                    >
                      <td className="mono" style={{ color:"var(--text-tertiary)", whiteSpace:"nowrap", fontSize:"11px" }}>
                        {new Date(event.timestamp).toLocaleString()}
                      </td>
                      <td style={{ fontWeight:600, color:"var(--text-primary)" }}>
                        {event.principal_id ?? "—"}
                      </td>
                      <td><code className="code-token">{event.action}</code></td>
                      <td className="mono" style={{ fontSize:"10.5px", color:"var(--text-tertiary)" }}>
                        {event.resource_type}{event.resource_id ? `/${event.resource_id}` : ""}
                      </td>
                      <td><DecisionBadge decision={event.decision} /></td>
                      <td className="mono" style={{ fontSize:"10px", color:"var(--text-tertiary)" }}>
                        {event.reason_code}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="pagination">
              <span>Page {page} of {pages} · {total.toLocaleString()} total events</span>
              <div className="pagination-btns">
                <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
                  <ChevronLeft size={13} />
                  Prev
                </button>
                <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
                  Next
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Event detail panel */}
        {selected && (
          <div className="detail-panel">
            <div style={{ padding:"var(--sp-4) var(--sp-5)", borderBottom:"1px solid var(--border-soft)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontWeight:700, fontSize:"13px", display:"flex", alignItems:"center", gap:6 }}>
                <Clock size={13} strokeWidth={2} style={{ color:"var(--text-tertiary)" }} />
                Event Detail
              </div>
              <button className="btn btn-ghost btn-xs" onClick={() => setSelected(null)} aria-label="Close">
                <X size={13} />
              </button>
            </div>
            <div style={{ padding:"var(--sp-5)" }}>
              <div style={{ marginBottom:"var(--sp-4)" }}>
                <DecisionBadge decision={selected.decision} />
              </div>

              <div className="info-list">
                {[
                  ["Event ID",      selected.event_id.slice(0, 22) + "…"],
                  ["Timestamp",     new Date(selected.timestamp).toLocaleString()],
                  ["Actor",         selected.principal_id ?? "—"],
                  ["Action",        selected.action],
                  ["Resource Type", selected.resource_type],
                  ["Resource ID",   selected.resource_id ?? "—"],
                  ["Decision",      selected.decision],
                  ["Reason Code",   selected.reason_code],
                  ["Policy Ver.",   selected.policy_version ?? "—"],
                  ["Correlation",   selected.correlation_id ? selected.correlation_id.slice(0,18) + "…" : "—"],
                  ["Outcome",       selected.outcome ?? "—"],
                ].map(([k, v]) => (
                  <div key={k} className="info-item">
                    <span className="info-key">{k}</span>
                    <span className="info-val">{v}</span>
                  </div>
                ))}
              </div>

              {selected.metadata && (
                <div style={{ marginTop:"var(--sp-4)" }}>
                  <div style={{ fontSize:"10.5px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--text-tertiary)", marginBottom:6 }}>
                    Metadata
                  </div>
                  <pre style={{
                    background:"var(--surface-raised)", border:"1px solid var(--border)",
                    borderRadius:"var(--r-sm)", padding:"8px 10px",
                    fontSize:"10.5px", fontFamily:"var(--mono)",
                    color:"var(--text-secondary)", overflowX:"auto",
                    whiteSpace:"pre-wrap", wordBreak:"break-all", lineHeight:1.5,
                  }}>
                    {selected.metadata}
                  </pre>
                </div>
              )}

              <div style={{ marginTop:"var(--sp-5)", padding:"10px 12px", background:"var(--surface-raised)", border:"1px solid var(--border)", borderRadius:"var(--r)", fontSize:"11px", color:"var(--text-tertiary)", lineHeight:1.6 }}>
                This event is stored in the backend SQLite database. This is a demo environment — records persist for the lifetime of the deployed server instance.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
