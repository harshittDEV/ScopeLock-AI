import { useEffect, useState, useCallback } from "react";
import { api } from "../api";
import { useUser } from "../context/UserContext";
import type { AuditEvent } from "../api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  type PieLabelRenderProps,
} from "recharts";
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  Clock,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────── */
interface Metrics {
  totals: {
    requests: number;
    allowed: number;
    denied: number;
    executionFailures: number;
  };
}

/* ── Quick authorization test definitions ───────────────── */
const TESTS = [
  {
    title: "Read own profile",
    action: "read_own_profile",
    rid: (id: string) =>
      `employee_${(
        { alice: "101", bob: "102", carol: "103", david: "104", admin: "105" } as Record<string, string>
      )[id] ?? "101"}`,
  },
  {
    title: "Read other's salary",
    action: "read_salary",
    rid: (id: string) => (id === "alice" ? "employee_102" : "employee_101"),
  },
  {
    title: "List dept employees",
    action: "list_department_employees",
    rid: () => "employee_101",
  },
  {
    title: "Delete record",
    action: "delete_record",
    rid: () => "employee_103",
  },
];

type TR = { decision: "ALLOW" | "DENY"; reasonCode: string } | null;

/* ── Tooltip style for recharts ─────────────────────────── */
const TOOLTIP_STYLE = {
  background: "#FFFFFF",
  border: "1px solid #E2E7EF",
  borderRadius: 8,
  fontSize: 12,
  color: "#172033",
  boxShadow: "0 4px 16px rgba(23,32,51,0.09)",
};

/* ── Metric card ────────────────────────────────────────── */
interface MetricCardProps {
  label: string;
  value: number;
  type: "t" | "a" | "d" | "f";
  caption: string;
  loading: boolean;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

function MetricCard({ label, value, type, caption, loading, Icon }: MetricCardProps) {
  return (
    <div className="card metric">
      <div className="metric-hd">
        <span className="metric-lbl">{label}</span>
        <div className={`metric-ic ${type}`}>
          <Icon size={15} strokeWidth={2} />
        </div>
      </div>

      {loading ? (
        <div className="skel" style={{ height: 36, width: 70, marginBottom: 8 }} />
      ) : (
        <div className={`metric-val ${type}`}>{value.toLocaleString()}</div>
      )}

      {loading ? (
        <div className="skel" style={{ height: 12, width: 100 }} />
      ) : (
        <div className="metric-cap">{caption}</div>
      )}
    </div>
  );
}

/* ── Status badge ────────────────────────────────────────── */
function DecisionBadge({ decision }: { decision: "ALLOW" | "DENY" }) {
  return (
    <span className={`badge ${decision === "ALLOW" ? "badge-allow" : "badge-deny"}`}>
      {decision === "ALLOW" ? <CheckCircle2 size={10} strokeWidth={2.5} /> : <XCircle size={10} strokeWidth={2.5} />}
      {decision}
    </span>
  );
}

/* ── Empty state ─────────────────────────────────────────── */
function EmptyChart({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <Activity size={22} strokeWidth={1.5} style={{ opacity: 0.3, marginBottom: 4 }} />
      <span className="empty-title">No data yet</span>
      <span className="empty-sub">{message}</span>
    </div>
  );
}

/* ── Dashboard page ─────────────────────────────────────── */
export default function Dashboard() {
  const { user } = useUser();

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recent, setRecent]   = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [lastAt, setLastAt]   = useState("");
  const [tRes, setTRes]       = useState<Record<number, TR>>({});
  const [tLoad, setTLoad]     = useState<Record<number, boolean>>({});
  const [runAll, setRunAll]   = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [m, a] = await Promise.all([
        api.metrics(user.id),
        api.audit({ pageSize: 5 }, user.id),
      ]);
      setMetrics(m as Metrics);
      setRecent(a.items);
      setLastAt(new Date().toLocaleTimeString());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Cannot reach backend");
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    setLoading(true);
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => clearInterval(timer);
  }, [load]);

  async function runTest(i: number) {
    const test = TESTS[i];
    if (!test) return;
    setTLoad((prev) => ({ ...prev, [i]: true }));
    try {
      const result = await api.authorizeAction(
        test.action, "employee", test.rid(user.id), user.id
      );
      setTRes((prev) => ({ ...prev, [i]: result.decision }));
      setTimeout(() => void load(), 600);
    } catch {
      setTRes((prev) => ({ ...prev, [i]: null }));
    } finally {
      setTLoad((prev) => ({ ...prev, [i]: false }));
    }
  }

  async function runAllTests() {
    setRunAll(true);
    try {
      for (let i = 0; i < TESTS.length; i++) {
        await runTest(i);
        await new Promise<void>((resolve) => setTimeout(resolve, 180));
      }
    } finally {
      setRunAll(false);
      void load();
    }
  }

  const totals = metrics?.totals ?? {
    requests: 0, allowed: 0, denied: 0, executionFailures: 0,
  };

  const pieData =
    totals.requests > 0
      ? [
          { name: "Allowed", value: totals.allowed },
          { name: "Denied",  value: totals.denied },
        ]
      : [];

  const barData =
    totals.requests > 0
      ? [
          { name: "Allowed",  v: totals.allowed,           fill: "#24865B" },
          { name: "Denied",   v: totals.denied,            fill: "#D65353" },
          { name: "Failures", v: totals.executionFailures, fill: "#C58A2B" },
        ]
      : [];

  const allowRate =
    totals.requests > 0
      ? `${((totals.allowed / totals.requests) * 100).toFixed(1)}% allow rate`
      : "—";

  return (
    <div>
      {/* ── Page header ── */}
      <div className="ph">
        <div>
          <h2>Security Overview</h2>
          <div className="ph-sub">
            Acting as&nbsp;
            <strong style={{ color: "var(--accent)", fontWeight: 700 }}>{user.label}</strong>
            {lastAt && (
              <span style={{ marginLeft: 8, color: "var(--text-3)" }}>
                · updated {lastAt}
              </span>
            )}
          </div>
        </div>
        <div className="ph-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Refresh dashboard"
          >
            {loading ? (
              <span className="spin" />
            ) : (
              <RefreshCw size={12} strokeWidth={2.5} />
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="alert alert-err" style={{ marginBottom: 16 }}>
          <AlertTriangle size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong>Backend unreachable</strong>
            <div style={{ fontSize: 11.5, marginTop: 2, opacity: 0.8 }}>{error}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => void load()}>
            Retry
          </button>
        </div>
      )}

      {/* ── Metric cards ── */}
      <div className="metrics">
        <MetricCard
          label="Total Requests"
          value={totals.requests}
          type="t"
          caption="All evaluations"
          loading={loading}
          Icon={Activity}
        />
        <MetricCard
          label="Allowed"
          value={totals.allowed}
          type="a"
          caption={allowRate}
          loading={loading}
          Icon={CheckCircle2}
        />
        <MetricCard
          label="Denied"
          value={totals.denied}
          type="d"
          caption="Policy violations"
          loading={loading}
          Icon={XCircle}
        />
        <MetricCard
          label="Exec Failures"
          value={totals.executionFailures}
          type="f"
          caption="Execution errors"
          loading={loading}
          Icon={AlertTriangle}
        />
      </div>

      {/* ── Charts ── */}
      <div className="charts">
        {/* Decision breakdown */}
        <div className="card">
          <div className="chart-hd">
            <div className="chart-title">Decision Breakdown</div>
            <div className="chart-sub">Allowed vs. denied requests</div>
          </div>

          {loading ? (
            <div style={{ padding: "0 18px 18px" }}>
              <div className="skel" style={{ height: 150 }} />
            </div>
          ) : pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={165}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={68}
                  dataKey="value"
                  strokeWidth={0}
                  paddingAngle={2}
                  label={(props: PieLabelRenderProps) => {
                    const name = String(props.name ?? "");
                    const percent = Number(props.percent ?? 0);
                    return `${name} ${(percent * 100).toFixed(0)}%`;
                  }}
                  labelLine={false}
                >
                  <Cell fill="#24865B" />
                  <Cell fill="#D65353" />
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Run authorization tests below to generate events" />
          )}
        </div>

        {/* Request volume bar chart */}
        <div className="card">
          <div className="chart-hd">
            <div className="chart-title">Request Volume</div>
            <div className="chart-sub">Outcomes by category</div>
          </div>

          {loading ? (
            <div style={{ padding: "0 18px 18px" }}>
              <div className="skel" style={{ height: 150 }} />
            </div>
          ) : barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={165}>
              <BarChart data={barData} barSize={32} margin={{ left: -10, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#687386", fontSize: 11, fontFamily: "'Inter', sans-serif" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#687386", fontSize: 10, fontFamily: "'Inter', sans-serif" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: "rgba(88,101,216,0.05)" }}
                />
                <Bar dataKey="v" radius={[5, 5, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} fillOpacity={0.88} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Authorization events will appear here automatically" />
          )}
        </div>
      </div>

      {/* ── Recent Activity ── */}
      {recent.length > 0 && (
        <div className="card activity-card">
          <div className="card-header">
            <div>
              <div className="card-header-title">Recent Activity</div>
              <div className="card-header-sub">Latest 5 authorization events</div>
            </div>
            <Clock size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </div>

          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((event) => (
                  <tr key={event.event_id}>
                    <td className="mono text3" style={{ whiteSpace: "nowrap" }}>
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--text-1)" }}>
                      {event.principal_id ?? "—"}
                    </td>
                    <td className="mono" style={{ color: "var(--text-2)" }}>
                      {event.action}
                    </td>
                    <td className="mono text3">
                      {event.resource_type}
                      {event.resource_id ? `/${event.resource_id}` : ""}
                    </td>
                    <td>
                      <DecisionBadge decision={event.decision} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Quick Authorization Tests ── */}
      <div className="card card-p">
        <div className="ph" style={{ marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-1)", marginBottom: 2 }}>
              Quick Authorization Tests
            </div>
            <div style={{ fontSize: 12, color: "var(--text-3)" }}>
              Live policy evaluation as&nbsp;
              <strong style={{ color: "var(--text-2)" }}>{user.label}</strong>
              &nbsp;— every decision recorded to audit trail
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => void runAllTests()}
            disabled={runAll}
          >
            {runAll ? <span className="spin" /> : <Zap size={12} strokeWidth={2.5} />}
            Run All
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
            gap: 10,
          }}
        >
          {TESTS.map((test, i) => {
            const result    = tRes[i];
            const isLoading = tLoad[i];
            const isAllow   = result?.decision === "ALLOW";
            const isDeny    = result?.decision === "DENY";

            return (
              <button
                key={i}
                onClick={() => void runTest(i)}
                disabled={isLoading || runAll}
                style={{
                  background: result
                    ? isAllow
                      ? "var(--green-bg)"
                      : "var(--red-bg)"
                    : "var(--bg-raised)",
                  border: `1px solid ${
                    result
                      ? isAllow
                        ? "var(--green-line)"
                        : "var(--red-line)"
                      : "var(--border)"
                  }`,
                  borderRadius: "var(--r)",
                  padding: "13px 14px",
                  cursor: isLoading || runAll ? "not-allowed" : "pointer",
                  textAlign: "left",
                  transition: "all 160ms",
                  borderLeft: result
                    ? `3px solid ${isAllow ? "var(--green)" : "var(--red)"}`
                    : "3px solid var(--border)",
                  opacity: isLoading ? 0.7 : 1,
                  boxShadow: "0 1px 3px rgba(23,32,51,0.04)",
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-1)", marginBottom: 3 }}>
                  {test.title}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--text-3)", fontFamily: "var(--mono)", marginBottom: 10 }}>
                  {test.action}
                </div>

                {isLoading ? (
                  <span className="spin" />
                ) : result ? (
                  <span className={`badge ${isDeny ? "badge-deny" : "badge-allow"}`}>
                    {isAllow ? (
                      <CheckCircle2 size={10} strokeWidth={2.5} />
                    ) : (
                      <XCircle size={10} strokeWidth={2.5} />
                    )}
                    {result.decision}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {Object.keys(tRes).length > 0 && (
          <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--text-3)" }}>
            All decisions from backend · logged to audit trail
          </div>
        )}
      </div>
    </div>
  );
}