import { useEffect, useState, useCallback } from "react";
import { api } from "../api";
import type { AuditEvent } from "../api";
import { useUser } from "../context/UserContext";
import {
  Activity, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, ArrowRight, Shield, ShieldCheck, ShieldX,
  Zap, Clock, ChevronRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, type PieLabelRenderProps,
} from "recharts";
import { DecisionBadge } from "../components/StatusBadge";

/* ── Quick tests ─────────────────────────────────────────── */
const QUICK_TESTS = [
  { label: "Read own profile",   action: "read_own_profile", rid: (id: string) => `employee_${({ alice:"101",bob:"102",carol:"103",david:"104",admin:"105" } as Record<string,string>)[id]??"101"}` },
  { label: "Read salary (own)",  action: "read_salary",      rid: (id: string) => `employee_${({ alice:"101",bob:"102",carol:"103",david:"104",admin:"105" } as Record<string,string>)[id]??"101"}` },
  { label: "Read other's salary",action: "read_salary",      rid: (id: string) => id === "alice" ? "employee_102" : "employee_101" },
  { label: "List dept employees",action: "list_department_employees", rid: () => "employee_101" },
  { label: "Delete record",      action: "delete_record",    rid: () => "employee_103" },
];

type TestResult = { decision: "ALLOW" | "DENY"; reasonCode: string } | null;

const TOOLTIP_STYLE = {
  background: "#fff",
  border: "1px solid #E4E7EC",
  borderRadius: 8,
  fontSize: 12,
  color: "#171B26",
  boxShadow: "0 4px 12px rgba(17,24,39,0.08)",
};

export default function CommandCenter() {
  const { user } = useUser();

  const [metrics, setMetrics] = useState<{
    requests: number; allowed: number; denied: number; executionFailures: number;
  } | null>(null);
  const [recent, setRecent]   = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [lastAt, setLastAt]   = useState<string | null>(null);
  const [tRes, setTRes]       = useState<Record<number, TestResult>>({});
  const [tLoad, setTLoad]     = useState<Record<number, boolean>>({});
  const [runningAll, setRunAll] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [m, a] = await Promise.all([
        api.metrics(user.id),
        api.audit({ pageSize: 8 }, user.id),
      ]);
      setMetrics((m as { totals: typeof metrics }).totals);
      setRecent(a.items);
      setLastAt(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to reach backend");
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    setLoading(true);
    void load();
    const t = setInterval(() => void load(), 20000);
    return () => clearInterval(t);
  }, [load]);

  async function runTest(i: number) {
    const test = QUICK_TESTS[i];
    if (!test) return;
    setTLoad((p) => ({ ...p, [i]: true }));
    try {
      const r = await api.authorizeAction(test.action, "employee", test.rid(user.id), user.id);
      setTRes((p) => ({ ...p, [i]: r.decision }));
      setTimeout(() => void load(), 700);
    } catch { setTRes((p) => ({ ...p, [i]: null })); }
    finally   { setTLoad((p) => ({ ...p, [i]: false })); }
  }

  async function runAllTests() {
    setRunAll(true);
    for (let i = 0; i < QUICK_TESTS.length; i++) {
      await runTest(i);
      await new Promise<void>((r) => setTimeout(r, 200));
    }
    setRunAll(false);
    void load();
  }

  const tot = metrics ?? { requests:0, allowed:0, denied:0, executionFailures:0 };
  const allowRate = tot.requests > 0 ? `${((tot.allowed / tot.requests)*100).toFixed(1)}%` : "—";
  const denyRate  = tot.requests > 0 ? `${((tot.denied  / tot.requests)*100).toFixed(1)}%` : "—";

  const pieData = tot.requests > 0
    ? [{ name:"Allowed", value:tot.allowed }, { name:"Denied", value:tot.denied }]
    : [];

  const barData = tot.requests > 0
    ? [
        { n:"Allowed",  v:tot.allowed,            fill:"#23845B" },
        { n:"Denied",   v:tot.denied,             fill:"#C34444" },
        { n:"Failures", v:tot.executionFailures,  fill:"#B7791F" },
      ]
    : [];

  return (
    <div>
      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <div className="page-title">Command Center</div>
          <div className="page-subtitle">
            Monitor agent activity, enforce authorization, and maintain a verifiable record of every decision.
          </div>
        </div>
        <div className="page-actions">
          {lastAt && (
            <span style={{ fontSize:"11px", color:"var(--text-tertiary)" }}>
              Updated {lastAt}
            </span>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => void load()} disabled={loading}>
            {loading ? <span className="spin" /> : <RefreshCw size={12} strokeWidth={2.5} />}
            Refresh
          </button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={15} strokeWidth={2} style={{ flexShrink:0, marginTop:1 }} />
          <div>
            <strong>Backend unreachable</strong>
            <div style={{ marginTop:2, opacity:0.85, fontSize:"11.5px" }}>{error}</div>
          </div>
        </div>
      )}

      {/* ── HERO — Authorization engine status ── */}
      <div className="card card-navy" style={{ marginBottom:"var(--sp-5)", padding:"var(--sp-6)" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"var(--sp-6)", flexWrap:"wrap" }}>
          {/* Engine description */}
          <div style={{ maxWidth:420 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:"var(--sp-3)" }}>
              <div style={{
                width:32, height:32, borderRadius:"var(--r-sm)",
                background:"rgba(82,101,199,0.2)", border:"1px solid rgba(82,101,199,0.35)",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <Shield size={16} strokeWidth={1.8} style={{ color:"#7584D9" }} />
              </div>
              <div>
                <div style={{ fontSize:"11px", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--navy-muted)", marginBottom:1 }}>
                  Authorization Engine
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:"#23845B" }} />
                  <span style={{ fontSize:"12px", fontWeight:600, color:"rgba(255,255,255,0.9)" }}>
                    {error ? "Demo State" : "Responding"}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ fontSize:"13px", color:"var(--navy-muted)", lineHeight:1.65, maxWidth:360 }}>
              Every agent action is evaluated by a deterministic policy engine before execution.
              The AI proposes. ScopeLock decides.
            </div>
          </div>

          {/* Auth flow pipeline */}
          <div style={{ flex:1, minWidth:280 }}>
            <div style={{ fontSize:"9.5px", fontWeight:700, letterSpacing:"0.10em", textTransform:"uppercase", color:"var(--navy-muted)", marginBottom:"var(--sp-3)" }}>
              Authorization Pipeline
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:0, flexWrap:"wrap", rowGap:8 }}>
              {[
                { icon:<Zap size={12} />,        label:"Agent Request",      bg:"rgba(82,101,199,0.20)",  border:"rgba(82,101,199,0.35)" },
                { arrow: true },
                { icon:<Shield size={12} />,     label:"Policy Evaluation",  bg:"rgba(255,255,255,0.08)", border:"rgba(255,255,255,0.15)" },
                { arrow: true },
                { icon:<ShieldCheck size={12} />, label:"Authorized",        bg:"rgba(35,132,91,0.22)",   border:"rgba(35,132,91,0.35)" },
                { slash: true },
                { icon:<ShieldX size={12} />,    label:"Denied",             bg:"rgba(195,68,68,0.22)",   border:"rgba(195,68,68,0.35)" },
                { arrow: true },
                { icon:<Activity size={12} />,   label:"Audit Record",       bg:"rgba(66,99,168,0.22)",   border:"rgba(66,99,168,0.35)" },
              ].map((step, i) => {
                if ("arrow" in step && step.arrow) return (
                  <ArrowRight key={i} size={12} style={{ color:"rgba(255,255,255,0.25)", margin:"0 4px" }} />
                );
                if ("slash" in step && step.slash) return (
                  <span key={i} style={{ color:"rgba(255,255,255,0.2)", margin:"0 3px", fontSize:11 }}>/</span>
                );
                return (
                  <div key={i} style={{
                    display:"flex", alignItems:"center", gap:5,
                    padding:"5px 10px",
                    background: (step as { bg: string }).bg,
                    border:`1px solid ${(step as { border: string }).border}`,
                    borderRadius:"var(--r-sm)",
                    fontSize:"10.5px", fontWeight:600,
                    color:"rgba(255,255,255,0.88)",
                    whiteSpace:"nowrap",
                  }}>
                    <span style={{ opacity:0.8 }}>{step.icon}</span>
                    {(step as { label: string }).label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Summary stats row */}
        {!loading && metrics && (
          <div style={{
            display:"flex", gap:"var(--sp-6)",
            marginTop:"var(--sp-5)", paddingTop:"var(--sp-4)",
            borderTop:"1px solid var(--navy-border)",
            flexWrap:"wrap",
          }}>
            {[
              { label:"Total Decisions", value:tot.requests.toLocaleString() },
              { label:"Allow Rate",      value:allowRate },
              { label:"Deny Rate",       value:denyRate },
              { label:"Environment",     value:"Demo" },
            ].map((s) => (
              <div key={s.label}>
                <div style={{ fontSize:"9.5px", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--navy-muted)", marginBottom:3 }}>
                  {s.label}
                </div>
                <div style={{ fontSize:"16px", fontWeight:700, color:"rgba(255,255,255,0.9)", fontVariantNumeric:"tabular-nums" }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Metric cards ── */}
      <div className="metrics-grid">
        {[
          { key:"total",    label:"Authorization Decisions", value:tot.requests,           context:"All policy evaluations",     variant:"total",    Icon:Activity },
          { key:"allowed",  label:"Allowed",                 value:tot.allowed,            context:`${allowRate} allow rate`,    variant:"allowed",  Icon:CheckCircle2 },
          { key:"denied",   label:"Denied",                  value:tot.denied,             context:`${denyRate} denial rate`,    variant:"denied",   Icon:XCircle },
          { key:"failures", label:"Exec Failures",           value:tot.executionFailures,  context:"Execution errors",           variant:"failures", Icon:AlertTriangle },
        ].map(({ key, label, value, context, variant, Icon }) => (
          <div className={`metric-card ${variant}`} key={key}>
            <div className="metric-label">
              {label}
              <div className="metric-icon"><Icon size={14} strokeWidth={2} /></div>
            </div>
            {loading ? (
              <div className="skel" style={{ height:36, width:72, marginBottom:8 }} />
            ) : (
              <div className="metric-value">{value.toLocaleString()}</div>
            )}
            {loading ? (
              <div className="skel" style={{ height:12, width:100 }} />
            ) : (
              <div className="metric-context">{context}</div>
            )}
          </div>
        ))}
      </div>

      {/* ── Charts row ── */}
      <div className="chart-grid" style={{ marginBottom:"var(--sp-5)" }}>
        {/* Pie */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Decision Distribution</div>
              <div className="card-sub">Allowed vs. denied outcomes</div>
            </div>
          </div>
          {loading ? (
            <div style={{ padding:"var(--sp-5)" }}>
              <div className="skel" style={{ height:160 }} />
            </div>
          ) : pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={176}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" strokeWidth={0} paddingAngle={3}
                  label={(p: PieLabelRenderProps) => `${String(p.name??"")} ${((Number(p.percent??0))*100).toFixed(0)}%`}
                  labelLine={false}
                >
                  <Cell fill="#23845B" />
                  <Cell fill="#C34444" />
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding:"var(--sp-8) var(--sp-5)" }}>
              <div className="empty-icon"><Activity size={20} strokeWidth={1.5} /></div>
              <span className="empty-title" style={{ fontSize:"13px" }}>No events yet</span>
              <span className="empty-sub">Run authorization tests to generate data</span>
            </div>
          )}
        </div>

        {/* Bar */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Request Volume</div>
              <div className="card-sub">Cumulative outcomes by category</div>
            </div>
          </div>
          {loading ? (
            <div style={{ padding:"var(--sp-5)" }}>
              <div className="skel" style={{ height:160 }} />
            </div>
          ) : barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={176}>
              <BarChart data={barData} barSize={36} margin={{ left:-10, bottom:0 }}>
                <XAxis dataKey="n" tick={{ fill:"#687080", fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:"#687080", fontSize:10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill:"rgba(82,101,199,0.05)" }} />
                <Bar dataKey="v" radius={[4,4,0,0]}>
                  {barData.map((d,i) => <Cell key={i} fill={d.fill} fillOpacity={0.9} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding:"var(--sp-8) var(--sp-5)" }}>
              <div className="empty-icon"><Activity size={20} strokeWidth={1.5} /></div>
              <span className="empty-title" style={{ fontSize:"13px" }}>No events yet</span>
              <span className="empty-sub">Decisions will appear here automatically</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent activity ── */}
      {!loading && recent.length > 0 && (
        <div className="card" style={{ marginBottom:"var(--sp-5)" }}>
          <div className="card-header">
            <div>
              <div className="card-title">Recent Authorization Activity</div>
              <div className="card-sub">Latest decisions — all from backend audit trail</div>
            </div>
            <Clock size={14} strokeWidth={2} style={{ color:"var(--text-tertiary)" }} />
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Decision</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((e) => (
                  <tr key={e.event_id}>
                    <td className="mono" style={{ color:"var(--text-tertiary)", whiteSpace:"nowrap" }}>
                      {new Date(e.timestamp).toLocaleTimeString()}
                    </td>
                    <td style={{ fontWeight:600, color:"var(--text-primary)" }}>{e.principal_id ?? "—"}</td>
                    <td><code className="code-token">{e.action}</code></td>
                    <td className="mono" style={{ color:"var(--text-tertiary)", fontSize:"11px" }}>
                      {e.resource_type}{e.resource_id ? `/${e.resource_id}` : ""}
                    </td>
                    <td><DecisionBadge decision={e.decision} /></td>
                    <td className="mono" style={{ color:"var(--text-tertiary)", fontSize:"10.5px" }}>{e.reason_code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Quick authorization tests ── */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Live Authorization Tests</div>
            <div className="card-sub">
              Evaluate policies as <strong style={{ color:"var(--text-primary)" }}>{user.label}</strong> — each request hits the backend policy engine
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => void runAllTests()} disabled={runningAll}>
            {runningAll ? <span className="spin" /> : <Zap size={12} strokeWidth={2.5} />}
            Run All
          </button>
        </div>
        <div style={{ padding:"var(--sp-4) var(--sp-5)" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:"var(--sp-2)" }}>
            {QUICK_TESTS.map((test, i) => {
              const res = tRes[i];
              const busy = tLoad[i];
              const isAllow = res?.decision === "ALLOW";
              return (
                <button
                  key={i}
                  onClick={() => void runTest(i)}
                  disabled={busy || runningAll}
                  style={{
                    background: res ? (isAllow ? "var(--success-bg)" : "var(--danger-bg)") : "var(--surface-raised)",
                    border: `1px solid ${res ? (isAllow ? "var(--success-line)" : "var(--danger-line)") : "var(--border)"}`,
                    borderLeft: `3px solid ${res ? (isAllow ? "var(--success)" : "var(--danger)") : "var(--border-strong)"}`,
                    borderRadius:"var(--r)",
                    padding:"12px 14px",
                    textAlign:"left",
                    cursor: busy || runningAll ? "not-allowed" : "pointer",
                    transition:"all 150ms",
                    opacity: busy ? 0.65 : 1,
                  }}
                >
                  <div style={{ fontSize:"12px", fontWeight:700, color:"var(--text-primary)", marginBottom:3 }}>
                    {test.label}
                  </div>
                  <div style={{ fontFamily:"var(--mono)", fontSize:"10px", color:"var(--text-tertiary)", marginBottom:10 }}>
                    {test.action}
                  </div>
                  {busy ? (
                    <span className="spin" />
                  ) : res ? (
                    <DecisionBadge decision={res.decision} size="sm" />
                  ) : (
                    <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:"10.5px", color:"var(--text-tertiary)" }}>
                      <ChevronRight size={11} strokeWidth={2} />
                      Click to evaluate
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {Object.keys(tRes).length > 0 && (
            <div style={{ marginTop:"var(--sp-3)", fontSize:"11px", color:"var(--text-tertiary)" }}>
              All decisions enforced server-side · logged to audit trail
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
