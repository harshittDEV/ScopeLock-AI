import { useEffect, useState, useCallback } from "react";
import { api } from "../api";
import { useUser } from "../context/UserContext";
import type { AuditEvent } from "../api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

interface Metrics {
  totals: { requests: number; allowed: number; denied: number; executionFailures: number };
}

const TESTS = [
  { title: "Read own profile",     action: "read_own_profile",          rid: (_id: string) => `employee_${{"alice":"101","bob":"102","carol":"103","david":"104","admin":"105"}[_id]??'101'}` },
  { title: "Read other's salary",  action: "read_salary",               rid: (id: string) => id === "alice" ? "employee_102" : "employee_101" },
  { title: "List dept employees",  action: "list_department_employees", rid: () => "employee_101" },
  { title: "Delete record (admin)",action: "delete_record",             rid: () => "employee_103" },
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
  const [recent, setRecent]   = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [lastAt, setLastAt]   = useState("");
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
    } catch (e: any) {
      setError(e.message ?? "Cannot reach backend");
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { setLoading(true); load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  async function runTest(i: number) {
    const t = TESTS[i];
    setTLoad(p => ({ ...p, [i]: true }));
    try {
      const r = await api.authorizeAction(t.action, "employee", t.rid(user.id), user.id);
      setTRes(p => ({ ...p, [i]: r.decision }));
      setTimeout(load, 600);
    } catch { setTRes(p => ({ ...p, [i]: null })); }
    finally { setTLoad(p => ({ ...p, [i]: false })); }
  }

  async function runAllTests() {
    setRunAll(true);
    for (let i = 0; i < TESTS.length; i++) { await runTest(i); await new Promise(r => setTimeout(r, 180)); }
    setRunAll(false); load();
  }

  const tot = metrics?.totals ?? { requests: 0, allowed: 0, denied: 0, executionFailures: 0 };
  const pieData = tot.requests > 0 ? [{ name: "Allowed", value: tot.allowed }, { name: "Denied", value: tot.denied }] : [];
  const barData = tot.requests > 0 ? [
    { name: "Allowed",  v: tot.allowed,           fill: "#34D399" },
    { name: "Denied",   v: tot.denied,            fill: "#F87171" },
    { name: "Failures", v: tot.executionFailures, fill: "#FBBF24" },
  ] : [];

  return (
    <div>
      {/* Page header */}
      <div className="ph">
        <div>
          <h2>Overview</h2>
          <div className="ph-sub">
            Acting as <strong style={{ color: "var(--accent)" }}>{user.label}</strong>
            {lastAt && <span style={{ marginLeft: 8, color: "var(--text-3)" }}>· {lastAt}</span>}
          </div>
        </div>
        <div className="ph-actions">
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
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
            <div style={{ fontSize: 11, marginTop: 2, opacity: 0.8 }}>{error}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={load}>Retry</button>
        </div>
      )}

      {/* Metrics */}
      <div className="metrics">
        {[
          { lbl: "Total Requests", val: tot.requests,          t: "t", ic: "⚡", cap: "All evaluations" },
          { lbl: "Allowed",        val: tot.allowed,           t: "a", ic: "✓",  cap: tot.requests > 0 ? `${((tot.allowed/tot.requests)*100).toFixed(1)}% allow rate` : "—" },
          { lbl: "Denied",         val: tot.denied,            t: "d", ic: "✕",  cap: "Policy violations" },
          { lbl: "Failures",       val: tot.executionFailures, t: "f", ic: "⚠",  cap: "Execution errors" },
        ].map(m => (
          <div key={m.t} className="card metric">
            <div className="metric-hd">
              <span className="metric-lbl">{m.lbl}</span>
              <div className={`metric-ic ${m.t}`}>{m.ic}</div>
            </div>
            {loading
              ? <div className="skel" style={{ height: 30, width: 55, marginBottom: 5 }} />
              : <div className={`metric-val ${m.t}`}>{m.val.toLocaleString()}</div>}
            <div className="metric-cap">{m.cap}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts">
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
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={65}
                  dataKey="value" strokeWidth={0}
                  label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  <Cell fill="#34D399" /><Cell fill="#F87171" />
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">◎</span>
              <span className="empty-title">No data yet</span>
              <span className="empty-sub">Run the Quick Tests below to generate authorization events</span>
            </div>
          )}
        </div>

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
                <XAxis dataKey="name" tick={{ fill: "#687386", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#687386", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(129,140,248,0.06)" }} />
                <Bar dataKey="v" radius={[4, 4, 0, 0]}>
                  {barData.map((e, i) => <Cell key={i} fill={e.fill} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">▦</span>
              <span className="empty-title">No activity</span>
              <span className="empty-sub">Authorization events will appear here automatically</span>
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      {recent.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ padding: "12px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="fw6 text1" style={{ fontSize: 13 }}>Recent Activity</span>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr><th>Time</th><th>Actor</th><th>Action</th><th>Decision</th></tr>
              </thead>
              <tbody>
                {recent.map(e => (
                  <tr key={e.event_id}>
                    <td className="mono text3">{new Date(e.timestamp).toLocaleTimeString()}</td>
                    <td className="fw6 text1">{e.principal_id}</td>
                    <td className="mono">{e.action}</td>
                    <td>
                      <span className={`badge ${e.decision === "ALLOW" ? "badge-allow" : "badge-deny"}`}>
                        {e.decision === "ALLOW" ? "✓" : "✕"} {e.decision}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick tests */}
      <div className="card card-p">
        <div className="ph" style={{ marginBottom: 12 }}>
          <div>
            <div className="fw6 text1" style={{ fontSize: 13, marginBottom: 2 }}>Quick Authorization Tests</div>
            <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>
              Live policy evaluation as <strong style={{ color: "var(--text-2)" }}>{user.label}</strong>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={runAllTests} disabled={runAll}>
            {runAll ? <span className="spin" /> : "⚡"} Run All
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", gap: 8 }}>
          {TESTS.map((test, i) => {
            const res = tRes[i]; const ld = tLoad[i];
            return (
              <button key={i} onClick={() => runTest(i)} disabled={ld}
                style={{
                  background: res ? (res.decision === "ALLOW" ? "var(--green-bg)" : "var(--red-bg)") : "var(--bg-raised)",
                  border: `1px solid ${res ? (res.decision === "ALLOW" ? "var(--green-line)" : "var(--red-line)") : "var(--border)"}`,
                  borderRadius: "var(--r)", padding: "12px", cursor: "pointer",
                  textAlign: "left", transition: "all 150ms",
                  borderLeft: res ? `3px solid ${res.decision === "ALLOW" ? "var(--green)" : "var(--red)"}` : "3px solid var(--border)",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-1)", marginBottom: 3 }}>{test.title}</div>
                <div style={{ fontSize: 10.5, color: "var(--text-3)", fontFamily: "var(--mono)", marginBottom: 8 }}>{test.action}</div>
                {ld ? <span className="spin" /> : res && (
                  <span className={`badge ${res.decision === "ALLOW" ? "badge-allow" : "badge-deny"}`}>
                    {res.decision === "ALLOW" ? "✓" : "✕"} {res.decision}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {Object.keys(tRes).length > 0 && (
          <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-3)" }}>
            All decisions from backend · logged to audit trail
          </div>
        )}
      </div>
    </div>
  );
}
