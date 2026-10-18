import { useEffect, useState, useCallback } from "react";
import { api } from "../api";
import type { AuditEvent } from "../api";
import { useUser } from "../context/UserContext";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ScrollText,
  Filter,
} from "lucide-react";

const DECISIONS = ["", "ALLOW", "DENY"];
const PAGE_SIZE = 15;

function DecisionBadge({ decision }: { decision: "ALLOW" | "DENY" }) {
  return (
    <span className={`badge ${decision === "ALLOW" ? "badge-allow" : "badge-deny"}`}>
      {decision === "ALLOW" ? (
        <CheckCircle2 size={10} strokeWidth={2.5} />
      ) : (
        <XCircle size={10} strokeWidth={2.5} />
      )}
      {decision}
    </span>
  );
}

/* ── Skeleton rows ──────────────────────────────────────── */
function SkeletonRows() {
  return (
    <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="skel"
          style={{ height: 16, opacity: 1 - i * 0.12 }}
        />
      ))}
    </div>
  );
}

export default function AuditLog() {
  const { user }                    = useUser();
  const [items, setItems]           = useState<AuditEvent[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [decision, setDec]          = useState("");
  const [lastAt, setLastAt]         = useState("");
  const [selected, setSelected]     = useState<AuditEvent | null>(null);

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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Cannot load audit log");
    } finally {
      setLoading(false);
    }
  }, [page, decision, user.id]);

  useEffect(() => { void load(); }, [load]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      {/* Page header */}
      <div className="ph">
        <div>
          <h2>Audit Logs</h2>
          <div className="ph-sub">
            {total > 0
              ? `${total.toLocaleString()} persisted events — all authorization attempts logged`
              : "All authorization attempts are logged immutably"}
            {lastAt && (
              <span style={{ marginLeft: 8, color: "var(--text-3)" }}>
                · {lastAt}
              </span>
            )}
          </div>
        </div>

        <div className="ph-actions">
          {/* Decision filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Filter size={12} strokeWidth={2} style={{ color: "var(--text-3)", flexShrink: 0 }} />
            <select
              value={decision}
              onChange={(e) => { setDec(e.target.value); setPage(1); }}
              style={{ width: "auto", fontSize: 12, padding: "5px 10px" }}
              aria-label="Filter by decision"
            >
              {DECISIONS.map((d) => (
                <option key={d} value={d}>
                  {d || "All decisions"}
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Refresh audit log"
          >
            {loading ? <span className="spin" /> : <RefreshCw size={12} strokeWidth={2.5} />}
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-err">
          <AlertTriangle size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>{error}</div>
          <button className="btn btn-ghost btn-sm" onClick={() => void load()}>
            Retry
          </button>
        </div>
      )}

      {/* Main layout: table + detail panel */}
      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 320px" : "1fr", gap: 14, alignItems: "start" }}>
        {/* Audit table */}
        <div className="card">
          {loading ? (
            <SkeletonRows />
          ) : items.length === 0 ? (
            <div className="empty-state" style={{ padding: "56px 24px" }}>
              <ScrollText size={26} strokeWidth={1.4} style={{ opacity: 0.3, marginBottom: 6 }} />
              <span className="empty-title">No events found</span>
              <span className="empty-sub">
                {decision
                  ? `No ${decision} decisions recorded yet`
                  : "Run authorization tests on the Overview page to generate audit events"}
              </span>
            </div>
          ) : (
            <div className="tbl-wrap">
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
                  {items.map((e) => (
                    <tr
                      key={e.event_id}
                      onClick={() => setSelected(selected?.event_id === e.event_id ? null : e)}
                      style={{
                        cursor: "pointer",
                        background: selected?.event_id === e.event_id
                          ? "var(--bg-active)"
                          : undefined,
                      }}
                      title="Click to view details"
                    >
                      <td className="mono text3" style={{ whiteSpace: "nowrap" }}>
                        {new Date(e.timestamp).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 600, color: "var(--text-1)" }}>
                        {e.principal_id ?? "—"}
                      </td>
                      <td className="mono" style={{ color: "var(--text-2)" }}>
                        {e.action}
                      </td>
                      <td className="mono text3">
                        {e.resource_type}
                        {e.resource_id ? `/${e.resource_id}` : ""}
                      </td>
                      <td>
                        <DecisionBadge decision={e.decision} />
                      </td>
                      <td className="mono text3" style={{ fontSize: 10.5 }}>
                        {e.reason_code}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "11px 16px",
                borderTop: "1px solid var(--border-soft)",
              }}
            >
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                Page {page} of {pages} · {total.toLocaleString()} total events
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={13} strokeWidth={2.5} />
                  Prev
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight size={13} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="card card-p" style={{ position: "sticky", top: 0 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-1)" }}>
                Event Detail
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSelected(null)}
                aria-label="Close detail panel"
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <DecisionBadge decision={selected.decision} />
            </div>

            {[
              ["Event ID",     selected.event_id.slice(0, 20) + "…"],
              ["Timestamp",    new Date(selected.timestamp).toLocaleString()],
              ["Actor",        selected.principal_id ?? "—"],
              ["Action",       selected.action],
              ["Resource",     `${selected.resource_type}/${selected.resource_id ?? "—"}`],
              ["Decision",     selected.decision],
              ["Reason",       selected.reason_code],
              ["Policy",       selected.policy_version],
              ["Correlation",  selected.correlation_id?.slice(0, 18) + "…" ?? "—"],
              ["Outcome",      selected.outcome ?? "—"],
            ].map(([k, v]) => (
              <div key={k} className="info-row">
                <span className="info-k">{k}</span>
                <span className="info-v" style={{ maxWidth: 160, textAlign: "right", wordBreak: "break-all" }}>
                  {v}
                </span>
              </div>
            ))}

            {selected.metadata && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)", marginBottom: 4 }}>
                  Metadata
                </div>
                <pre
                  style={{
                    background: "var(--bg-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-sm)",
                    padding: "8px 10px",
                    fontSize: 10.5,
                    fontFamily: "var(--mono)",
                    color: "var(--text-2)",
                    overflowX: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  {selected.metadata}
                </pre>
              </div>
            )}

            <div style={{ marginTop: 14, fontSize: 11, color: "var(--text-3)", lineHeight: 1.5 }}>
              This record is immutable — stored server-side and cannot be altered by the frontend.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
