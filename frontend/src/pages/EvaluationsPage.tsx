import { FlaskConical, Construction } from "lucide-react";
import { EmptyState } from "../components/EmptyState";

export default function EvaluationsPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Evaluations</div>
          <div className="page-subtitle">
            Automated policy evaluation runs, test scenarios, and outcome analysis.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="coming-soon">
          <div style={{
            width:56, height:56, borderRadius:"var(--r-xl)",
            background:"var(--warning-bg)", border:"1px solid var(--warning-line)",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"var(--warning)", marginBottom:"var(--sp-3)",
          }}>
            <Construction size={26} strokeWidth={1.6} />
          </div>
          <div style={{ fontSize:"17px", fontWeight:700, color:"var(--text-primary)", marginBottom:8 }}>
            Evaluations Not Yet Implemented
          </div>
          <div style={{ fontSize:"13px", color:"var(--text-tertiary)", maxWidth:380, textAlign:"center", lineHeight:1.65, marginBottom:"var(--sp-3)" }}>
            The evaluations workspace — automated policy test runs, scenario replay, and pass/fail summaries — has not been built yet.
          </div>
          <div style={{
            padding:"var(--sp-3) var(--sp-4)",
            background:"var(--surface-raised)", border:"1px solid var(--border)",
            borderRadius:"var(--r)", fontSize:"12px", color:"var(--text-secondary)",
            maxWidth:400, textAlign:"center", lineHeight:1.65,
          }}>
            <strong>What this will include:</strong> Evaluation run history, test scenario definitions (action + identity + expected decision),
            pass/fail outcomes against the live policy engine, and scenario export.
          </div>
        </div>
      </div>
    </div>
  );
}
