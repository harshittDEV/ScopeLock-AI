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

interface Metrics {
  totals: {
    requests: number;
    allowed: number;
    denied: number;
    executionFailures: number;
  };
}

const TESTS = [
  {
    title: "Read own profile",
    action: "read_own_profile",
    rid: (id: string) =>
      `employee_${({ alice: "101", bob: "102", carol: "103", david: "104", admin: "105" } as Record<string, string>)[id] ?? "101"}`,
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
    title: "Delete record (admin)",
    action: "delete_record",
    rid: () => "employee_103",
  },
];

type TR = { decision: "ALLOW" | "DENY"; reasonCode: string } | null;

const TOOLTIP_STYLE = {
  background: "#151A24",
  border: "1px solid #252B38",
  borderRadius: 6,
  fontSize: 12,
  color: "#F1F3F7",
};

export default function Dashboard() {
  const { user } = useUser();

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recent, setRecent] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastAt, setLastAt] = useState("");
  const [tRes, setTRes] = useState<Record<number, TR>>({});
  const [tLoad, setTLoad] = useState<Record<number, boolean>>({});
  const [runAll, setRunAll] = useState(false);

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

    const timer = setInterval(() => {
      void load();
    }, 15000);

    return () => clearInterval(timer);
  }, [load]);

  async function runTest(i: number) {
    const test = TESTS[i];

    if (!test) return;

    setTLoad((previous) => ({ ...previous, [i]: true }));

    try {
      const result = await api.authorizeAction(
        test.action,
        "employee",
        test.rid(user.id),
        user.id,
      );

      setTRes((previous) => ({
        ...previous,
        [i]: result.decision,
      }));

      setTimeout(() => {
        void load();
      }, 600);
    } catch {
      setTRes((previous) => ({ ...previous, [i]: null }));
    } finally {
      setTLoad((previous) => ({ ...previous, [i]: false }));
    }
  }

  async function runAllTests() {
    setRunAll(true);

    try {
      for (let i = 0; i < TESTS.length; i++) {
        await runTest(i);
        await new Promise((resolve) => setTimeout(resolve, 180));
      }
    } finally {
      setRunAll(false);
      void load();
    }
  }

  const totals = metrics?.totals ?? {
    requests: 0,
    allowed: 0,
    denied: 0,
    executionFailures: 0,
  };

  const pieData =
    totals.requests > 0
      ? [
          { name: "Allowed", value: totals.allowed },
          { name: "Denied", value: totals.denied },
        ]
      : [];

  const barData =
    totals.requests > 0
      ? [
          { name: "Allowed", v: totals.allowed, fill: "#34D399" },
          { name: "Denied", v: totals.denied, fill: "#F87171" },
          {
            name: "Failures",
            v: totals.executionFailures,
            fill: "#FBBF24",
          },
        ]
      : [];

  return (
    <div>
      {/* Page header */}
      <div className="ph">
        <div>
          <h2>Overview</h2>

          <div className="ph-sub">
            Acting as{" "}
            <strong style={{ color: "var(--accent)" }}>{user.label}</strong>

            {lastAt && (
              <span style={{ marginLeft: 8, color: "var(--text-3)" }}>
                · {lastAt}
              </span>
            )}
          </div>
        </div>

        <div className="ph-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? <span className="spin" /> : "↻"} Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-err" style={{ marginBottom: 14 }}>
          <span>⚠</span>

          <div style={{ flex: 1 }}>
            <strong>Backend unreachable</strong>

            <div style={{ fontSize: 11, marginTop: 2, opacity: 0.8 }}>
              {error}
            </div>
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      )}

      {/* Metrics */}
      <div className="metrics">
        {[
          {
            lbl: "Total Requests",
            val: totals.requests,
            t: "t",
            ic: "⚡",
            cap: "All evaluations",
          },
          {
            lbl: "Allowed",
            val: totals.allowed,
            t: "a",
            ic: "✓",
            cap:
              totals.requests > 0
                ? `${((totals.allowed / totals.requests) * 100).toFixed(1)}% allow rate`
                : "—",
          },
          {
            lbl: "Denied",
            val: totals.denied,
            t: "d",
            ic: "✕",
            cap: "Policy violations",
          },
          {
            lbl: "Failures",
            val: totals.executionFailures,
            t: "f",
            ic: "⚠",
            cap: "Execution errors",
          },
        ].map((metric) => (
          <div key={metric.t} className="card metric">
            <div className="metric-hd">
              <span className="metric-lbl">{metric.lbl}</span>
              <div className={`metric-ic ${metric.t}`}>{metric.ic}</div>
            </div>

            {loading ? (
              <div
                className="skel"
                style={{ height: 30, width: 55, marginBottom: 5 }}
              />
            ) : (
              <div className={`metric-val ${metric.t}`}>
                {metric.val.toLocaleString()}
              </div>
            )}

            <div className="metric-cap">{metric.cap}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts">
        {/* Decision Breakdown */}
        <div className="card">
          <div className="chart-hd">
            <div className="chart-title">Decision Breakdown</div>
            <div className="chart-sub">Allowed vs denied requests</div>
          </div>

          {loading ? (
            <div style={{ padding: "0 16px 16px" }}>
              <div className="skel" style={{ height: 140 }} />
            </div>
          ) : pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={155}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={65}
                  dataKey="value"
                  strokeWidth={0}
                  label={(props: PieLabelRenderProps) => {
                    const name = String(props.name ?? "");
                    const percent = Number(props.percent ?? 0);

                    return `${name} ${(percent * 100).toFixed(0)}%`;
                  }}
                  labelLine={false}
                >
                  <Cell fill="#34D399" />
                  <Cell fill="#F87171" />
                </Pie>

                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">◎</span>
              <span className="empty-title">No data yet</span>
              <span className="empty-sub">
                Run the Quick Tests below to generate authorization events
              </span>
            </div>
          )}
        </div>

        {/* Request Volume */}
        <div className="card">
          <div className="chart-hd">
            <div className="chart-title">Request Volume</div>
            <div className="chart-sub">Outcomes by category</div>
          </div>

          {loading ? (
            <div style={{ padding: "0 16px 16px" }}>
              <div className="skel" style={{ height: 140 }} />
            </div>
          ) : barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={155}>
              <BarChart data={barData} barSize={28} margin={{ left: -10 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#687386", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{ fill: "#687386", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />

                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: "rgba(129,140,248,0.06)" }}
                />

                <Bar dataKey="v" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.fill}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">▦</span>
              <span className="empty-title">No activity</span>
              <span className="empty-sub">
                Authorization events will appear here automatically
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      {recent.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div
            style={{
              padding: "12px 16px 0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span className="fw6 text1" style={{ fontSize: 13 }}>
              Recent Activity
            </span>
          </div>

          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Decision</th>
                </tr>
              </thead>

              <tbody>
                {recent.map((event) => (
                  <tr key={event.event_id}>
                    <td className="mono text3">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </td>

                    <td className="fw6 text1">{event.principal_id}</td>
                    <td className="mono">{event.action}</td>

                    <td>
                      <span
                        className={`badge ${
                          event.decision === "ALLOW"
                            ? "badge-allow"
                            : "badge-deny"
                        }`}
                      >
                        {event.decision === "ALLOW" ? "✓" : "✕"}{" "}
                        {event.decision}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick authorization tests */}
      <div className="card card-p">
        <div className="ph" style={{ marginBottom: 12 }}>
          <div>
            <div
              className="fw6 text1"
              style={{ fontSize: 13, marginBottom: 2 }}
            >
              Quick Authorization Tests
            </div>

            <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>
              Live policy evaluation as{" "}
              <strong style={{ color: "var(--text-2)" }}>{user.label}</strong>
            </div>
          </div>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => void runAllTests()}
            disabled={runAll}
          >
            {runAll ? <span className="spin" /> : "⚡"} Run All
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))",
            gap: 8,
          }}
        >
          {TESTS.map((test, i) => {
            const result = tRes[i];
            const isLoading = tLoad[i];

            return (
              <button
                key={i}
                onClick={() => void runTest(i)}
                disabled={isLoading || runAll}
                style={{
                  background: result
                    ? result.decision === "ALLOW"
                      ? "var(--green-bg)"
                      : "var(--red-bg)"
                    : "var(--bg-raised)",
                  border: `1px solid ${
                    result
                      ? result.decision === "ALLOW"
                        ? "var(--green-line)"
                        : "var(--red-line)"
                      : "var(--border)"
                  }`,
                  borderRadius: "var(--r)",
                  padding: "12px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 150ms",
                  borderLeft: result
                    ? `3px solid ${
                        result.decision === "ALLOW"
                          ? "var(--green)"
                          : "var(--red)"
                      }`
                    : "3px solid var(--border)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-1)",
                    marginBottom: 3,
                  }}
                >
                  {test.title}
                </div>

                <div
                  style={{
                    fontSize: 10.5,
                    color: "var(--text-3)",
                    fontFamily: "var(--mono)",
                    marginBottom: 8,
                  }}
                >
                  {test.action}
                </div>

                {isLoading ? (
                  <span className="spin" />
                ) : (
                  result && (
                    <span
                      className={`badge ${
                        result.decision === "ALLOW"
                          ? "badge-allow"
                          : "badge-deny"
                      }`}
                    >
                      {result.decision === "ALLOW" ? "✓" : "✕"}{" "}
                      {result.decision}
                    </span>
                  )
                )}
              </button>
            );
          })}
        </div>

        {Object.keys(tRes).length > 0 && (
          <div
            style={{
              marginTop: 10,
              fontSize: 11,
              color: "var(--text-3)",
            }}
          >
            All decisions from backend · logged to audit trail
          </div>
        )}
      </div>
    </div>
  );
}