import { useState, useRef, useEffect } from "react";
import { api } from "../api";
import { useUser } from "../context/UserContext";
import { Send, ShieldAlert, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { DecisionBadge } from "../components/StatusBadge";

const ACTIONS: Record<string, { action: string; rid: (id: string) => string; label: string }> = {
  read_own_profile: {
    action: "read_own_profile",
    rid: (id) => `employee_${({"alice":"101","bob":"102","carol":"103","david":"104","admin":"105"} as Record<string,string>)[id]??"101"}`,
    label: "Read own profile",
  },
  read_salary: {
    action: "read_salary",
    rid: (id) => `employee_${({"alice":"101","bob":"102","carol":"103","david":"104","admin":"105"} as Record<string,string>)[id]??"101"}`,
    label: "Read own salary",
  },
  read_other_salary: {
    action: "read_salary",
    rid: (id) => id === "alice" ? "employee_102" : "employee_101",
    label: "Read another employee's salary",
  },
  list_department_employees: {
    action: "list_department_employees",
    rid: () => "employee_101",
    label: "List department employees",
  },
  delete_record: {
    action: "delete_record",
    rid: () => "employee_103",
    label: "Delete a record",
  },
};

const SUGGESTIONS = [
  { label: "Read my own profile",               key: "read_own_profile" },
  { label: "Check my own salary",               key: "read_salary" },
  { label: "Read another employee's salary",    key: "read_other_salary" },
  { label: "List employees in my department",   key: "list_department_employees" },
  { label: "Delete an employee record",         key: "delete_record" },
];

const SECURITY_MODEL = [
  ["Identity",  "Server-resolved"],
  ["Decision",  "Backend gateway"],
  ["AI role",   "Propose only"],
  ["Audit",     "All attempts logged"],
] as const;

interface Msg {
  id: string;
  role: "user" | "ai";
  text: string;
  ts: Date;
  decision?: { decision: "ALLOW" | "DENY"; reasonCode: string };
}

function parseIntent(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes("other") || t.includes("another") || t.includes("bob") || t.includes("carol")) return "read_other_salary";
  if (t.includes("salary") || t.includes("pay") || t.includes("compensation")) return "read_salary";
  if (t.includes("profile") || t.includes("own") || t.includes("my record")) return "read_own_profile";
  if (t.includes("list") || t.includes("department") || t.includes("dept") || t.includes("team")) return "list_department_employees";
  if (t.includes("delete") || t.includes("remove") || t.includes("destroy")) return "delete_record";
  return null;
}

export default function AIAssistant() {
  const { user }          = useUser();
  const [msgs, setMsgs]   = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef             = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setInput("");
    const userMsg: Msg = { id: crypto.randomUUID(), role:"user", text: text.trim(), ts: new Date() };
    setMsgs((m) => [...m, userMsg]);
    setLoading(true);

    try {
      const intent = parseIntent(text);
      if (!intent || !ACTIONS[intent]) {
        setMsgs((m) => [...m, {
          id: crypto.randomUUID(), role:"ai", ts: new Date(),
          text: 'I can evaluate authorization policies for you. Try: "read my profile", "check my salary", "list my department", or "delete a record".',
        }]);
        return;
      }

      const act = ACTIONS[intent];
      setMsgs((m) => [...m, {
        id: crypto.randomUUID(), role:"ai", ts: new Date(),
        text: `Submitting to backend: \`${act.action}\` on \`${act.rid(user.id)}\` as principal \`${user.id}\`…`,
      }]);

      const r = await api.authorizeAction(act.action, "employee", act.rid(user.id), user.id);
      const dec = r.decision;
      const allowed = dec.decision === "ALLOW";

      setMsgs((m) => [...m, {
        id: crypto.randomUUID(), role:"ai", ts: new Date(),
        decision: dec,
        text: allowed
          ? `Backend decision: Access permitted for \`${act.label}\`. This was determined by the policy engine — not by this AI. The decision is logged to the audit trail.`
          : `Backend decision: Access denied for \`${act.label}\`. Reason: \`${dec.reasonCode}\`. This is real policy enforcement. The AI cannot override this decision.`,
      }]);
    } catch (e) {
      setMsgs((m) => [...m, {
        id: crypto.randomUUID(), role:"ai", ts: new Date(),
        text: `Backend error: ${e instanceof Error ? e.message : "Unknown error"}. Verify the backend is running.`,
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">AI Assistant</div>
          <div className="page-subtitle">
            Policy-aware authorization assistant. Every proposed action is evaluated by the backend before any operation is performed.
          </div>
        </div>
      </div>

      <div className="ai-grid" style={{ display:"grid", gridTemplateColumns:"1fr 220px", gap:"var(--sp-4)", height:"calc(100vh - var(--header-h) - 160px)" }}>
        {/* Chat */}
        <div className="card" style={{ display:"flex", flexDirection:"column", overflow:"hidden" }}>
          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:"var(--sp-4)", display:"flex", flexDirection:"column", gap:"var(--sp-3)" }}>
            {msgs.length === 0 && (
              <div style={{ margin:"auto", textAlign:"center", padding:"var(--sp-8) var(--sp-5)", maxWidth:320 }}>
                <div style={{ width:44, height:44, borderRadius:"var(--r-md)", background:"var(--accent-dim)", border:"1px solid var(--accent-line)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto var(--sp-3)", color:"var(--accent)" }}>
                  <Sparkles size={20} strokeWidth={1.8} />
                </div>
                <div style={{ fontSize:"14px", fontWeight:700, color:"var(--text-primary)", marginBottom:6 }}>Authorization-Aware Assistant</div>
                <div style={{ fontSize:"12px", color:"var(--text-tertiary)", lineHeight:1.65 }}>
                  Describe an action. The backend policy engine evaluates it before anything executes. The AI proposes. ScopeLock decides.
                </div>
              </div>
            )}

            {msgs.map((m) => (
              <div key={m.id} style={{
                display:"flex",
                flexDirection: m.role === "user" ? "row-reverse" : "row",
                gap:"var(--sp-2)",
                alignItems:"flex-start",
              }}>
                {/* Avatar */}
                <div style={{
                  width:28, height:28, borderRadius:"50%", flexShrink:0,
                  background: m.role === "ai" ? "var(--navy)" : "var(--surface-raised)",
                  border: m.role === "user" ? "1px solid var(--border)" : "none",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  marginTop:2,
                }}>
                  {m.role === "ai"
                    ? <ShieldAlert size={13} strokeWidth={2} style={{ color:"white" }} />
                    : <span style={{ fontSize:"11px", fontWeight:700, color:"var(--text-secondary)" }}>{user.id[0].toUpperCase()}</span>
                  }
                </div>

                {/* Bubble */}
                <div style={{ maxWidth:"76%", display:"flex", flexDirection:"column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    background: m.role === "user" ? "var(--accent-dim)" : "var(--surface-main)",
                    border: `1px solid ${m.role === "user" ? "var(--accent-line)" : "var(--border)"}`,
                    borderRadius:"var(--r-md)",
                    padding:"10px 14px",
                    fontSize:"13px",
                    color: m.role === "user" ? "var(--accent)" : "var(--text-primary)",
                    lineHeight:1.55,
                    whiteSpace:"pre-wrap",
                    boxShadow:"var(--shadow-xs)",
                  }}>
                    {m.text}
                  </div>
                  {m.decision && (
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}>
                      <DecisionBadge decision={m.decision.decision} />
                      <span style={{ fontSize:"10.5px", color:"var(--text-tertiary)", fontFamily:"var(--mono)" }}>
                        {m.decision.reasonCode}
                      </span>
                    </div>
                  )}
                  <div style={{ fontSize:"10px", color:"var(--text-tertiary)", marginTop:4, padding:"0 3px" }}>
                    {m.ts.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display:"flex", gap:"var(--sp-2)", alignItems:"flex-start" }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:"var(--navy)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <ShieldAlert size={13} strokeWidth={2} style={{ color:"white" }} />
                </div>
                <div style={{ background:"var(--surface-raised)", border:"1px solid var(--border)", borderRadius:"var(--r-md)", padding:"10px 14px", display:"flex", alignItems:"center", gap:8, fontSize:"12px", color:"var(--text-tertiary)" }}>
                  <span className="spin" />
                  Evaluating with backend…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div style={{ display:"flex", gap:"var(--sp-2)", padding:"var(--sp-3)", borderTop:"1px solid var(--border)", background:"var(--surface-raised)" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
              placeholder="Describe an action to evaluate…"
              disabled={loading}
              aria-label="Message input"
              style={{ flex:1, fontSize:"13px" }}
            />
            <button
              className="btn btn-primary"
              onClick={() => void send(input)}
              disabled={loading || !input.trim()}
              aria-label="Send"
            >
              <Send size={13} strokeWidth={2} />
              Send
            </button>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display:"flex", flexDirection:"column", gap:"var(--sp-3)" }}>
          <div className="card card-p">
            <div style={{ fontSize:"10.5px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--text-tertiary)", marginBottom:"var(--sp-3)" }}>
              Example Prompts
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"var(--sp-1)" }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.key}
                  className="btn btn-ghost btn-sm"
                  style={{ textAlign:"left", justifyContent:"flex-start", whiteSpace:"normal", height:"auto", lineHeight:1.45, padding:"7px 10px", fontSize:"11.5px" }}
                  onClick={() => void send(s.label)}
                  disabled={loading}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card card-p">
            <div style={{ fontSize:"10.5px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--text-tertiary)", marginBottom:"var(--sp-3)" }}>
              Security Model
            </div>
            {SECURITY_MODEL.map(([k, v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:"1px solid var(--border-soft)", fontSize:"11.5px" }}>
                <span style={{ color:"var(--text-tertiary)" }}>{k}</span>
                <span style={{ color:"var(--success)", fontWeight:700, fontSize:"10.5px" }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop:"var(--sp-3)", fontSize:"11px", color:"var(--text-tertiary)", lineHeight:1.6 }}>
              The AI only proposes. The policy engine decides. The audit log records.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
