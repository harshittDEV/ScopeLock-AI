import { useEffect, useState, useCallback } from "react";
import { api } from "../api";
import { useUser } from "../context/UserContext";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { RefreshCw, AlertTriangle, TrendingDown, TrendingUp, Minus } from "lucide-react";

const TOOLTIP_STYLE = {
  background:"#fff", border:"1px solid #E4E7EC",
  borderRadius:8, fontSize:12, color:"#171B26",
  boxShadow:"0 4px 12px rgba(17,24,39,0.08)",
};

export default function MetricsDashboard() {
  const { user } = useUser();
  const [metrics, setMetrics] = useState<{
    requests:number; allowed:number; denied:number; executionFailures:number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [lastAt, setLastAt]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const m = await api.metrics(user.id);
      setMetrics((m as { totals: typeof metrics }).totals);
      setLastAt(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot load metrics");
    } finally { setLoading(false); }
  }, [user.id]);

  useEffect(() => { void load(); }, [load]);

  const tot = metrics ?? { requests:0, allowed:0, denied:0, executionFailures:0 };

  const pieData = tot.requests > 0
    ? [{ name:"Allowed", value:tot.allowed }, { name:"Denied", value:tot.denied }, { name:"Failures", value:tot.executionFailures }]
    : [];

  const barData = tot.requests > 0
    ? [
        { n:"Allowed",  v:tot.allowed,            fill:"#23845B" },
        { n:"Denied",   v:tot.denied,             fill:"#C34444" },
        { n:"Failures", v:tot.executionFailures,  fill:"#B7791F" },
      ]
    : [];

  const allowRate = tot.requests > 0 ? ((tot.allowed/tot.requests)*100).toFixed(1) : null;
  const denyRate  = tot.requests > 0 ? ((tot.denied /tot.requests)*100).toFixed(1) : null;
  const failRate  = tot.requests > 0 ? ((tot.executionFailures/tot.requests)*100).toFixed(1) : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Metrics</div>
          <div className="page-subtitle">
            Aggregated authorization statistics from the backend database.
            {lastAt && <span style={{ color:"var(--text-tertiary)", marginLeft:8 }}>Updated {lastAt}</span>}
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => void load()} disabled={loading} aria-label="Refresh metrics">
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

      {/* Summary stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"var(--sp-4)", marginBottom:"var(--sp-5)" }}>
        {[
          { label:"Allow Rate", value: allowRate ? `${allowRate}%` : "—", trend:"neutral", Icon:TrendingUp, color:"var(--success)" },
          { label:"Deny Rate",  value: denyRate  ? `${denyRate}%`  : "—", trend:"neutral", Icon:TrendingDown, color:"var(--danger)" },
          { label:"Failure Rate", value: failRate ? `${failRate}%` : "—", trend:"neutral", Icon:Minus, color:"var(--warning)" },
        ].map((s) => (
          <div key={s.label} className="card card-p">
            {loading ? (
              <div className="skel" style={{ height:60 }} />
            ) : (
              <>
                <div style={{ fontSize:"10.5px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--text-tertiary)", marginBottom:"var(--sp-3)" }}>
                  {s.label}
                </div>
                <div style={{ fontSize:"32px", fontWeight:800, letterSpacing:"-0.04em", color:s.color, fontVariantNumeric:"tabular-nums" }}>
                  {s.value}
                </div>
                <div style={{ fontSize:"11px", color:"var(--text-tertiary)", marginTop:"var(--sp-1)" }}>
                  of {tot.requests.toLocaleString()} total decisions
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="chart-grid">
        {/* Distribution pie */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Decision Distribution</div>
              <div className="card-sub">Breakdown of authorization outcomes</div>
            </div>
          </div>
          {loading ? (
            <div style={{ padding:"var(--sp-5)" }}><div className="skel" style={{ height:200 }} /></div>
          ) : pieData.length > 0 ? (
            <div style={{ padding:"0 var(--sp-5) var(--sp-5)" }}>
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" strokeWidth={2} stroke="#fff"
                    label={({ name, percent }) => `${name} ${((percent ?? 0)*100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    <Cell fill="#23845B" />
                    <Cell fill="#C34444" />
                    <Cell fill="#B7791F" />
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div style={{ display:"flex", justifyContent:"center", gap:"var(--sp-4)", flexWrap:"wrap" }}>
                {[
                  { label:"Allowed",  color:"#23845B", value:tot.allowed },
                  { label:"Denied",   color:"#C34444", value:tot.denied },
                  { label:"Failures", color:"#B7791F", value:tot.executionFailures },
                ].map((l) => (
                  <div key={l.label} style={{ display:"flex", alignItems:"center", gap:6, fontSize:"11.5px", color:"var(--text-secondary)" }}>
                    <div style={{ width:10, height:10, borderRadius:2, background:l.color, flexShrink:0 }} />
                    {l.label} <strong style={{ color:"var(--text-primary)" }}>{l.value.toLocaleString()}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="chart-placeholder">
              <span style={{ fontSize:"13px", fontWeight:600 }}>No data available</span>
              <span style={{ fontSize:"11.5px" }}>Run authorization tests to generate metrics</span>
            </div>
          )}
        </div>

        {/* Volume bar chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Outcome Volume</div>
              <div className="card-sub">Cumulative authorization outcomes</div>
            </div>
          </div>
          {loading ? (
            <div style={{ padding:"var(--sp-5)" }}><div className="skel" style={{ height:200 }} /></div>
          ) : barData.length > 0 ? (
            <div style={{ padding:"0 var(--sp-5) var(--sp-5)" }}>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={barData} barSize={40} margin={{ left:-10, bottom:0 }}>
                  <XAxis dataKey="n" tick={{ fill:"#687080", fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:"#687080", fontSize:10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill:"rgba(82,101,199,0.05)" }} />
                  <Bar dataKey="v" radius={[5,5,0,0]}>
                    {barData.map((d,i) => <Cell key={i} fill={d.fill} fillOpacity={0.9} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="chart-placeholder">
              <span style={{ fontSize:"13px", fontWeight:600 }}>No data available</span>
              <span style={{ fontSize:"11.5px" }}>Outcomes will appear here as events are created</span>
            </div>
          )}
        </div>
      </div>

      {/* Raw summary */}
      {!loading && (
        <div className="card card-p">
          <div style={{ fontSize:"13.5px", fontWeight:700, color:"var(--text-primary)", marginBottom:"var(--sp-4)" }}>
            Cumulative Totals
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"var(--sp-3)" }}>
            {[
              { label:"Total Decisions",    value:tot.requests,           bg:"var(--info-bg)",     color:"var(--info)" },
              { label:"Allowed",            value:tot.allowed,            bg:"var(--success-bg)",  color:"var(--success)" },
              { label:"Denied",             value:tot.denied,             bg:"var(--danger-bg)",   color:"var(--danger)" },
              { label:"Execution Failures", value:tot.executionFailures,  bg:"var(--warning-bg)",  color:"var(--warning)" },
            ].map((s) => (
              <div key={s.label} style={{
                background:s.bg, borderRadius:"var(--r)", padding:"var(--sp-4)",
                textAlign:"center", border:`1px solid ${s.bg === "var(--info-bg)" ? "var(--info-line)" : s.bg === "var(--success-bg)" ? "var(--success-line)" : s.bg === "var(--danger-bg)" ? "var(--danger-line)" : "var(--warning-line)"}`,
              }}>
                <div style={{ fontSize:"26px", fontWeight:800, color:s.color, fontVariantNumeric:"tabular-nums", marginBottom:4 }}>
                  {s.value.toLocaleString()}
                </div>
                <div style={{ fontSize:"11px", fontWeight:600, color:s.color, opacity:0.8 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:"var(--sp-4)", fontSize:"11px", color:"var(--text-tertiary)" }}>
            All figures derived from the backend audit database via <code style={{ fontFamily:"var(--mono)", fontSize:"10.5px" }}>/api/metrics</code>. No trends are shown as the API does not expose historical period data.
          </div>
        </div>
      )}
    </div>
  );
}
