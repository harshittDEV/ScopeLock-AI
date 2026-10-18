import { useState, useRef, useEffect, useCallback } from "react";
import { agentApi } from "../api";
import type { AgentProposalResponse, ActionResult } from "../api";
import { useUser } from "../context/UserContext";
import {
  Send, ShieldAlert, Sparkles, CheckCircle2, XCircle,
  AlertTriangle, RefreshCw, Zap, Shield, Lock,
  Info, ChevronDown, ChevronRight, Eye,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
interface ChatMsg {
  id:       string;
  role:     "user" | "system";
  text:     string;
  ts:       Date;
  response?: AgentProposalResponse;
  loading?:  boolean;
}

// ── Example prompts ──────────────────────────────────────────────────────────
const EXAMPLES = [
  "Show me my own employee profile",
  "What is my current salary?",
  "List everyone in my department",
  "Read another employee's salary details",
  "Delete an employee record from the system",
];

// ── Sub-components ────────────────────────────────────────────────────────────

function AiStatusBanner({ configured, model, loading }: {
  configured: boolean | null;
  model: string | null;
  loading: boolean;
}) {
  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", background:"var(--surface-raised)", border:"1px solid var(--border)", borderRadius:"var(--r-sm)", fontSize:"11.5px", color:"var(--text-tertiary)" }}>
      <span className="spin" />
      Checking AI model status…
    </div>
  );
  if (configured === null) return null;
  if (!configured) return (
    <div className="alert alert-warn" style={{ margin:0 }}>
      <AlertTriangle size={13} strokeWidth={2} style={{ flexShrink:0 }} />
      <div>
        <strong>AI model not configured</strong>
        <div style={{ fontSize:"11px", marginTop:2 }}>
          Set <code style={{ fontFamily:"var(--mono)", fontSize:"10px" }}>AI_PROVIDER=ollama</code> and
          run <code style={{ fontFamily:"var(--mono)", fontSize:"10px" }}>ollama run llama3.2:3b</code> locally.
          See the Settings page for full configuration instructions.
        </div>
      </div>
    </div>
  );
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 13px", background:"var(--success-bg)", border:"1px solid var(--success-line)", borderRadius:"var(--r-sm)", fontSize:"11.5px", color:"var(--success)", fontWeight:600 }}>
      <CheckCircle2 size={12} strokeWidth={2.5} />
      AI model ready
      {model && <span style={{ fontWeight:400, color:"var(--success)", opacity:0.8, fontFamily:"var(--mono)", fontSize:"10.5px" }}>· {model}</span>}
    </div>
  );
}

function ProposalCard({ response }: { response: AgentProposalResponse }) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  if (!response.aiAvailable || response.error) {
    const kind = response.error?.kind ?? "unavailable";
    const isConfig = kind === "unavailable";
    return (
      <div style={{
        background: isConfig ? "var(--warning-bg)" : "var(--danger-bg)",
        border: `1px solid ${isConfig ? "var(--warning-line)" : "var(--danger-line)"}`,
        borderRadius: "var(--r-md)", padding: "var(--sp-4)", marginTop: "var(--sp-2)",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, fontWeight:700, fontSize:"13px", color: isConfig ? "var(--warning)" : "var(--danger)", marginBottom:6 }}>
          <AlertTriangle size={14} strokeWidth={2} />
          {kind === "unavailable" ? "AI model unavailable" :
           kind === "timeout"      ? "Model timed out" :
           kind === "validation_error" ? "Model output rejected" :
           "Model error"}
        </div>
        <div style={{ fontSize:"12px", lineHeight:1.6, color:"var(--text-secondary)" }}>
          {response.error?.message}
        </div>
        {isConfig && (
          <div style={{ marginTop:"var(--sp-3)", fontSize:"11px", color:"var(--text-tertiary)", fontFamily:"var(--mono)", background:"var(--surface-raised)", padding:"6px 10px", borderRadius:"var(--r-sm)", lineHeight:1.7 }}>
            # .env<br/>
            AI_PROVIDER=ollama<br/>
            AI_BASE_URL=http://localhost:11434<br/>
            AI_MODEL=llama3.2:3b<br/><br/>
            # Then: ollama run llama3.2:3b
          </div>
        )}
      </div>
    );
  }

  if (response.clarificationRequired) {
    return (
      <div style={{ background:"var(--info-bg)", border:"1px solid var(--info-line)", borderRadius:"var(--r-md)", padding:"var(--sp-4)", marginTop:"var(--sp-2)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:7, fontWeight:700, fontSize:"13px", color:"var(--info)", marginBottom:8 }}>
          <Info size={14} strokeWidth={2} />
          Clarification needed
        </div>
        <div style={{ fontSize:"12px", color:"var(--text-secondary)", marginBottom:"var(--sp-2)", lineHeight:1.6 }}>
          <em>{response.interpretation}</em>
        </div>
        <div style={{ fontSize:"12.5px", color:"var(--info)" }}>
          {response.clarificationMessage}
        </div>
      </div>
    );
  }

  if (!response.actions || response.actions.length === 0) return null;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"var(--sp-2)", marginTop:"var(--sp-2)" }}>
      {/* Interpretation */}
      <div style={{ padding:"10px 14px", background:"var(--surface-raised)", border:"1px solid var(--border)", borderRadius:"var(--r)", fontSize:"12px", color:"var(--text-secondary)", lineHeight:1.6 }}>
        <strong style={{ color:"var(--text-primary)" }}>Interpreted: </strong>
        {response.interpretation}
        {response.correlationId && (
          <div className="mono" style={{ fontSize:"9.5px", color:"var(--text-tertiary)", marginTop:4 }}>
            Correlation: {response.correlationId}
          </div>
        )}
      </div>

      {/* Action results */}
      {response.actions.map((ar: ActionResult, i: number) => {
        const isAllow = ar.authorization.decision === "ALLOW";
        const isOpen  = expanded[i] ?? false;
        return (
          <div key={i} style={{
            border: `1px solid ${isAllow ? "var(--success-line)" : "var(--danger-line)"}`,
            borderLeft: `3px solid ${isAllow ? "var(--success)" : "var(--danger)"}`,
            borderRadius: "var(--r-md)",
            background: isAllow ? "var(--success-bg)" : "var(--danger-bg)",
            overflow: "hidden",
          }}>
            {/* Header row */}
            <div
              style={{ display:"flex", alignItems:"center", gap:"var(--sp-2)", padding:"10px 14px", cursor:"pointer" }}
              onClick={() => setExpanded((p) => ({ ...p, [i]: !isOpen }))}
              role="button"
              aria-expanded={isOpen}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpanded((p) => ({ ...p, [i]: !isOpen })); }}
            >
              {isAllow
                ? <CheckCircle2 size={15} strokeWidth={2.5} style={{ color:"var(--success)", flexShrink:0 }} />
                : <XCircle     size={15} strokeWidth={2.5} style={{ color:"var(--danger)",  flexShrink:0 }} />}
              <code style={{ fontFamily:"var(--mono)", fontSize:"12px", fontWeight:700, color: isAllow ? "var(--success)" : "var(--danger)" }}>
                {ar.proposed.action}
              </code>
              <span style={{ fontSize:"11px", color:"var(--text-tertiary)", marginLeft:2 }}>
                → {ar.proposed.resourceId}
              </span>
              <span style={{ marginLeft:"auto", padding:"2px 8px", borderRadius:"var(--r-xs)", border:"1px solid", fontSize:"10.5px", fontWeight:700,
                background: isAllow ? "var(--success-bg)" : "var(--danger-bg)",
                color:      isAllow ? "var(--success)" : "var(--danger)",
                borderColor:isAllow ? "var(--success-line)" : "var(--danger-line)",
              }}>
                {ar.authorization.decision}
              </span>
              {isOpen
                ? <ChevronDown size={12} style={{ color:"var(--text-tertiary)", flexShrink:0 }} />
                : <ChevronRight size={12} style={{ color:"var(--text-tertiary)", flexShrink:0 }} />}
            </div>

            {/* Expanded detail */}
            {isOpen && (
              <div style={{ padding:"0 14px 14px", borderTop:`1px solid ${isAllow ? "var(--success-line)" : "var(--danger-line)"}` }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--sp-3)", marginTop:"var(--sp-3)" }}>
                  {/* Proposal */}
                  <div>
                    <div style={{ fontSize:"9.5px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color: isAllow ? "var(--success)" : "var(--danger)", marginBottom:6 }}>
                      Proposed Action
                    </div>
                    {[
                      ["Action",        ar.proposed.action],
                      ["Resource Type", ar.proposed.resourceType],
                      ["Resource ID",   ar.proposed.resourceId],
                      ["Rationale",     ar.proposed.rationale ?? "—"],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", fontSize:"11px", borderBottom:`1px solid ${isAllow ? "rgba(35,132,91,0.1)" : "rgba(195,68,68,0.1)"}` }}>
                        <span style={{ color:"var(--text-tertiary)" }}>{k}</span>
                        <span style={{ fontFamily:"var(--mono)", fontSize:"10.5px", color:"var(--text-primary)", fontWeight:600, maxWidth:120, textAlign:"right", wordBreak:"break-all" }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Authorization */}
                  <div>
                    <div style={{ fontSize:"9.5px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color: isAllow ? "var(--success)" : "var(--danger)", marginBottom:6 }}>
                      Authorization
                    </div>
                    {[
                      ["Decision",    ar.authorization.decision],
                      ["Reason",      ar.authorization.reasonCode],
                      ["Policy Ver.", ar.authorization.policyVersion],
                      ["Execution",   ar.execution.attempted ? (ar.execution.success ? "SUCCEEDED" : "FAILED") : "NOT ATTEMPTED"],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", fontSize:"11px", borderBottom:`1px solid ${isAllow ? "rgba(35,132,91,0.1)" : "rgba(195,68,68,0.1)"}` }}>
                        <span style={{ color:"var(--text-tertiary)" }}>{k}</span>
                        <span style={{ fontFamily:"var(--mono)", fontSize:"10.5px", color:"var(--text-primary)", fontWeight:600 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Execution result data */}
                {ar.execution.attempted && ar.execution.success && ar.execution.data != null && (
                  <div style={{ marginTop:"var(--sp-3)" }}>
                    <div style={{ fontSize:"9.5px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--success)", marginBottom:6, display:"flex", alignItems:"center", gap:5 }}>
                      <Eye size={10} />
                      Execution Result
                    </div>
                    <pre style={{
                      background:"var(--surface-raised)", border:"1px solid var(--border)",
                      borderRadius:"var(--r-sm)", padding:"8px 10px",
                      fontSize:"10.5px", fontFamily:"var(--mono)",
                      color:"var(--text-secondary)", overflowX:"auto",
                      whiteSpace:"pre-wrap", wordBreak:"break-all", lineHeight:1.5,
                      maxHeight:160,
                    }}>
                      {JSON.stringify(ar.execution.data, null, 2)}
                    </pre>
                  </div>
                )}

                {ar.execution.attempted && !ar.execution.success && ar.execution.error && (
                  <div style={{ marginTop:"var(--sp-3)", padding:"8px 10px", background:"var(--warning-bg)", border:"1px solid var(--warning-line)", borderRadius:"var(--r-sm)", fontSize:"11.5px", color:"var(--warning)" }}>
                    <AlertTriangle size={11} style={{ display:"inline", marginRight:5 }} />
                    {ar.execution.error}
                  </div>
                )}

                {!ar.execution.attempted && (
                  <div style={{ marginTop:"var(--sp-3)", padding:"8px 10px", background:"var(--danger-bg)", border:"1px solid var(--danger-line)", borderRadius:"var(--r-sm)", fontSize:"11.5px", color:"var(--danger)" }}>
                    <Lock size={11} style={{ display:"inline", marginRight:5 }} />
                    Denied by policy engine — no execution attempted, no side effects.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ fontSize:"10.5px", color:"var(--text-tertiary)", padding:"4px 2px" }}>
        All decisions enforced server-side · every action logged to audit trail · model cannot override policy
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AIAssistant() {
  const { user }                  = useUser();
  const [msgs, setMsgs]           = useState<ChatMsg[]>([]);
  const [input, setInput]         = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [aiStatus, setAiStatus]   = useState<{ configured: boolean | null; model: string | null; loading: boolean }>({
    configured: null, model: null, loading: true,
  });
  const endRef                    = useRef<HTMLDivElement>(null);
  const inputRef                  = useRef<HTMLInputElement>(null);

  // Check AI status on mount and identity change
  const checkStatus = useCallback(async () => {
    setAiStatus((p) => ({ ...p, loading: true }));
    try {
      const s = await agentApi.status(user.id);
      setAiStatus({ configured: s.configured, model: s.model, loading: false });
    } catch {
      setAiStatus({ configured: false, model: null, loading: false });
    }
  }, [user.id]);

  useEffect(() => { void checkStatus(); }, [checkStatus]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function submit() {
    const text = input.trim();
    if (!text || submitting) return;
    setInput("");
    setSubmitting(true);

    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", text, ts: new Date() };
    const loadingMsg: ChatMsg = { id: crypto.randomUUID(), role: "system", text: "", ts: new Date(), loading: true };

    setMsgs((m) => [...m, userMsg, loadingMsg]);

    try {
      const result = await agentApi.propose(text, user.id);
      setMsgs((m) => m.map((msg) =>
        msg.id === loadingMsg.id
          ? { ...msg, loading: false, response: result, text: result.interpretation ?? "" }
          : msg
      ));
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Request failed";
      setMsgs((m) => m.map((msg) =>
        msg.id === loadingMsg.id
          ? { ...msg, loading: false, response: {
              aiAvailable: false, clarificationRequired: false, actions: [],
              error: { kind: "unavailable", message: errMsg },
            }}
          : msg
      ));
    } finally {
      setSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">AI Assistant</div>
          <div className="page-subtitle">
            Describe an action in natural language. The model proposes a structured request.
            The backend policy engine independently decides authorization. The AI cannot override policy.
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => void checkStatus()} aria-label="Refresh AI status">
            <RefreshCw size={12} strokeWidth={2.5} />
            Refresh
          </button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 240px", gap:"var(--sp-4)", height:"calc(100vh - var(--header-h) - 170px)", minHeight:480 }}>

        {/* Chat panel */}
        <div className="card" style={{ display:"flex", flexDirection:"column", overflow:"hidden" }}>
          {/* Status banner */}
          <div style={{ padding:"var(--sp-3) var(--sp-4)", borderBottom:"1px solid var(--border-soft)" }}>
            <AiStatusBanner
              configured={aiStatus.configured}
              model={aiStatus.model}
              loading={aiStatus.loading}
            />
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:"var(--sp-4)", display:"flex", flexDirection:"column", gap:"var(--sp-3)" }}>
            {msgs.length === 0 && (
              <div style={{ margin:"auto", textAlign:"center", maxWidth:320, padding:"var(--sp-8) var(--sp-4)" }}>
                <div style={{ width:48, height:48, borderRadius:"var(--r-lg)", background:"var(--accent-dim)", border:"1px solid var(--accent-line)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto var(--sp-3)", color:"var(--accent)" }}>
                  <Sparkles size={22} strokeWidth={1.8} />
                </div>
                <div style={{ fontSize:"14px", fontWeight:700, color:"var(--text-primary)", marginBottom:6 }}>
                  Policy-Enforced AI Assistant
                </div>
                <div style={{ fontSize:"12px", color:"var(--text-tertiary)", lineHeight:1.7 }}>
                  Describe what you want to do. The model interprets your intent, proposes a structured action, and the backend decides whether it's permitted.
                  <br /><br />
                  <strong>The AI proposes. ScopeLock decides.</strong>
                </div>
              </div>
            )}

            {msgs.map((msg) => (
              <div key={msg.id} style={{ display:"flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap:"var(--sp-2)", alignItems:"flex-start" }}>
                {/* Avatar */}
                <div style={{
                  width:28, height:28, borderRadius:"50%", flexShrink:0, marginTop:2,
                  background: msg.role === "system" ? "var(--navy)" : "var(--surface-raised)",
                  border: msg.role === "user" ? "1px solid var(--border)" : "none",
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  {msg.role === "system"
                    ? <ShieldAlert size={13} strokeWidth={2} style={{ color:"white" }} />
                    : <span style={{ fontSize:"11px", fontWeight:700, color:"var(--text-secondary)" }}>{user.id[0].toUpperCase()}</span>
                  }
                </div>

                {/* Bubble */}
                <div style={{ maxWidth:"80%", minWidth:0, display:"flex", flexDirection:"column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  {msg.role === "user" ? (
                    <div style={{ background:"var(--accent-dim)", border:"1px solid var(--accent-line)", borderRadius:"var(--r-md)", padding:"10px 14px", fontSize:"13px", color:"var(--accent)", lineHeight:1.55, boxShadow:"var(--shadow-xs)" }}>
                      {msg.text}
                    </div>
                  ) : msg.loading ? (
                    <div style={{ background:"var(--surface-main)", border:"1px solid var(--border)", borderRadius:"var(--r-md)", padding:"10px 14px", display:"flex", alignItems:"center", gap:8, fontSize:"12px", color:"var(--text-tertiary)", boxShadow:"var(--shadow-xs)" }}>
                      <span className="spin" />
                      Generating proposal, evaluating policy…
                    </div>
                  ) : (
                    <div style={{ width:"100%" }}>
                      {msg.response && <ProposalCard response={msg.response} />}
                    </div>
                  )}
                  <div style={{ fontSize:"10px", color:"var(--text-tertiary)", marginTop:4, padding:"0 3px" }}>
                    {msg.ts.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div style={{ display:"flex", gap:"var(--sp-2)", padding:"var(--sp-3) var(--sp-4)", borderTop:"1px solid var(--border)", background:"var(--surface-raised)" }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) { e.preventDefault(); void submit(); } }}
              placeholder={aiStatus.configured === false ? "Configure AI provider to use this feature…" : "Describe what you want to do…"}
              disabled={submitting || aiStatus.configured === false}
              maxLength={800}
              aria-label="Natural language request input"
              style={{ flex:1, fontSize:"13px" }}
            />
            <button
              className="btn btn-primary"
              onClick={() => void submit()}
              disabled={submitting || !input.trim() || aiStatus.configured === false}
              aria-label="Submit request"
            >
              {submitting ? <span className="spin" /> : <Send size={13} strokeWidth={2} />}
              {submitting ? "Evaluating…" : "Send"}
            </button>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display:"flex", flexDirection:"column", gap:"var(--sp-3)", overflowY:"auto" }}>
          {/* Examples */}
          <div className="card card-p">
            <div style={{ fontSize:"10.5px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--text-tertiary)", marginBottom:"var(--sp-3)" }}>
              Example Prompts
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"var(--sp-1)" }}>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  className="btn btn-ghost btn-sm"
                  style={{ textAlign:"left", justifyContent:"flex-start", whiteSpace:"normal", height:"auto", lineHeight:1.45, padding:"7px 10px", fontSize:"11.5px" }}
                  onClick={() => { setInput(ex); inputRef.current?.focus(); }}
                  disabled={submitting || aiStatus.configured === false}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Pipeline */}
          <div className="card card-p">
            <div style={{ fontSize:"10.5px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--text-tertiary)", marginBottom:"var(--sp-3)" }}>
              Authorization Pipeline
            </div>
            {[
              { icon:<Sparkles size={11} />,    label:"Natural language",   sub:"User input" },
              { icon:<Zap size={11} />,         label:"AI proposal",        sub:"Ollama (llama3.2)" },
              { icon:<Shield size={11} />,      label:"Zod validation",     sub:"Schema + allowlist" },
              { icon:<ShieldAlert size={11} />, label:"Policy engine",      sub:"Deterministic, server-side" },
              { icon:<CheckCircle2 size={11} />,label:"Tool execution",     sub:"Only if ALLOW" },
              { icon:<Eye size={11} />,         label:"Audit record",       sub:"All decisions logged" },
            ].map((step, i) => (
              <div key={i}>
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0" }}>
                  <div style={{ width:22, height:22, borderRadius:4, background:"var(--accent-dim)", border:"1px solid var(--accent-line)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--accent)", flexShrink:0 }}>
                    {step.icon}
                  </div>
                  <div>
                    <div style={{ fontSize:"11.5px", fontWeight:600, color:"var(--text-primary)" }}>{step.label}</div>
                    <div style={{ fontSize:"10px", color:"var(--text-tertiary)" }}>{step.sub}</div>
                  </div>
                </div>
                {i < 5 && <div style={{ width:1, height:6, background:"var(--border)", margin:"0 10px" }} />}
              </div>
            ))}
          </div>

          {/* Identity */}
          <div className="card card-p">
            <div style={{ fontSize:"10.5px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--text-tertiary)", marginBottom:"var(--sp-3)" }}>
              Active Identity
            </div>
            {[
              ["User",   user.id],
              ["Role",   user.role],
              ["Dept",   user.department],
            ].map(([k, v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:"11.5px", borderBottom:"1px solid var(--border-soft)" }}>
                <span style={{ color:"var(--text-tertiary)" }}>{k}</span>
                <span style={{ fontWeight:600, color:"var(--text-primary)" }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop:"var(--sp-3)", fontSize:"10.5px", color:"var(--text-tertiary)", lineHeight:1.6 }}>
              Identity resolved server-side. The AI cannot elevate or change your permissions.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
