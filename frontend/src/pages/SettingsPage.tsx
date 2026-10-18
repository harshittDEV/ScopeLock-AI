import { Info, ExternalLink } from "lucide-react";
import { useUser } from "../context/UserContext";

const STACK = [
  { label:"Frontend",   value:"React 19 + Vite 8 + TypeScript" },
  { label:"Backend",    value:"Node.js + Express + SQLite" },
  { label:"Charts",     value:"Recharts" },
  { label:"Icons",      value:"Lucide React" },
  { label:"Auth Model", value:"Demo identity + backend policy engine" },
  { label:"Deployment", value:"Vercel (frontend) + Render (backend)" },
];

export default function SettingsPage() {
  const { user } = useUser();

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">
            Environment configuration and system information.
          </div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--sp-4)", alignItems:"start" }}>
        {/* Current session */}
        <div className="card card-p">
          <div style={{ fontSize:"13.5px", fontWeight:700, color:"var(--text-primary)", marginBottom:"var(--sp-4)" }}>
            Active Demo Session
          </div>
          <div className="info-list">
            {[
              ["Identity",    user.id],
              ["Role",        user.role],
              ["Department",  user.department],
              ["Environment", "DEMO"],
            ].map(([k, v]) => (
              <div key={k} className="info-item">
                <span className="info-key">{k}</span>
                <span className="info-val">{v}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:"var(--sp-4)", padding:"10px 12px", background:"var(--warning-bg)", border:"1px solid var(--warning-line)", borderRadius:"var(--r-sm)", fontSize:"11.5px", color:"var(--warning)", lineHeight:1.6 }}>
            This is a demo session. No real user accounts, credentials, or production data are involved.
            Identity switching is available for demonstration purposes only.
          </div>
        </div>

        {/* API configuration */}
        <div className="card card-p">
          <div style={{ fontSize:"13.5px", fontWeight:700, color:"var(--text-primary)", marginBottom:"var(--sp-4)" }}>
            API Configuration
          </div>
          <div className="form-row">
            <label className="form-label" htmlFor="api-url">API Base URL</label>
            <input
              id="api-url"
              value={import.meta.env.VITE_API_URL ?? "http://localhost:4000"}
              readOnly
            />
            <div style={{ fontSize:"11px", color:"var(--text-tertiary)", marginTop:4 }}>
              Configured via <code style={{ fontFamily:"var(--mono)", fontSize:"10.5px" }}>VITE_API_URL</code> environment variable.
            </div>
          </div>
          <a
            href={`${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/api/health`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ display:"inline-flex" }}
          >
            <ExternalLink size={12} strokeWidth={2} />
            Check Backend Health
          </a>
        </div>

        {/* Technology stack */}
        <div className="card card-p">
          <div style={{ fontSize:"13.5px", fontWeight:700, color:"var(--text-primary)", marginBottom:"var(--sp-4)" }}>
            Technology Stack
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--sp-2)" }}>
            {STACK.map((s) => (
              <div key={s.label} style={{ background:"var(--surface-raised)", border:"1px solid var(--border)", borderRadius:"var(--r-sm)", padding:"10px 12px" }}>
                <div style={{ fontSize:"9.5px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--text-tertiary)", marginBottom:3 }}>{s.label}</div>
                <div style={{ fontSize:"12px", fontWeight:600, color:"var(--text-primary)" }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="card card-p">
          <div style={{ fontSize:"13.5px", fontWeight:700, color:"var(--text-primary)", marginBottom:"var(--sp-4)" }}>
            About ScopeLock AI
          </div>
          <div style={{ fontSize:"12.5px", color:"var(--text-secondary)", lineHeight:1.7, marginBottom:"var(--sp-4)" }}>
            ScopeLock AI is an authorization firewall for AI agents. Every action proposed by an AI agent is independently evaluated
            by a deterministic policy engine before execution. The AI proposes. ScopeLock decides.
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:"11.5px", color:"var(--text-tertiary)" }}>
            <Info size={12} strokeWidth={2} style={{ flexShrink:0 }} />
            Built for MLH — Best Use of Open Source AI tooling.
          </div>
          <div style={{ marginTop:"var(--sp-4)", padding:"10px 12px", background:"var(--surface-raised)", border:"1px solid var(--border)", borderRadius:"var(--r-sm)", fontSize:"11px", color:"var(--text-tertiary)", lineHeight:1.6 }}>
            Demo data uses synthetic employee records. No real personal data is stored or displayed.
          </div>
        </div>
      </div>
    </div>
  );
}
