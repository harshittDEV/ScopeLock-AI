import { useState, useRef, useEffect } from "react";
import { api } from "../api";
import { useUser } from "../context/UserContext";
import {
  Send,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

/* ── Action registry ────────────────────────────────────── */
const ACTIONS: Record<
  string,
  { action: string; resourceId: (id: string) => string; label: string }
> = {
  read_own_profile: {
    action: "read_own_profile",
    resourceId: (id) =>
      `employee_${
        ({ alice: "101", bob: "102", carol: "103", david: "104", admin: "105" } as Record<string, string>)[id] ?? "101"
      }`,
    label: "Read own profile",
  },
  read_salary: {
    action: "read_salary",
    resourceId: (id) =>
      `employee_${
        ({ alice: "101", bob: "102", carol: "103", david: "104", admin: "105" } as Record<string, string>)[id] ?? "101"
      }`,
    label: "Read own salary",
  },
  read_other_salary: {
    action: "read_salary",
    resourceId: (id) => (id === "alice" ? "employee_102" : "employee_101"),
    label: "Read other's salary",
  },
  list_department_employees: {
    action: "list_department_employees",
    resourceId: () => "employee_101",
    label: "List dept employees",
  },
  update_department: {
    action: "update_department",
    resourceId: () => "employee_103",
    label: "Update department",
  },
};

const SUGGESTIONS = [
  { label: "Read my own profile",                  key: "read_own_profile" },
  { label: "Check my own salary",                  key: "read_salary" },
  { label: "Read another employee's salary",       key: "read_other_salary" },
  { label: "List employees in my department",      key: "list_department_employees" },
];

/* ── Message type ────────────────────────────────────────── */
interface Msg {
  id: string;
  role: "user" | "ai";
  text: string;
  ts: Date;
  decision?: { decision: "ALLOW" | "DENY"; reasonCode: string };
}

/* ── Intent parser ───────────────────────────────────────── */
function parseIntent(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes("other") || t.includes("another") || t.includes("bob") || t.includes("carol"))
    return "read_other_salary";
  if (t.includes("salary") || t.includes("pay") || t.includes("compensation"))
    return "read_salary";
  if (t.includes("profile") || t.includes("own") || t.includes("my record"))
    return "read_own_profile";
  if (t.includes("list") || t.includes("department") || t.includes("dept") || t.includes("team"))
    return "list_department_employees";
  if (t.includes("update") || t.includes("change department"))
    return "update_department";
  return null;
}

/* ── Security model info ─────────────────────────────────── */
const SECURITY_MODEL = [
  ["Identity",  "Server-resolved"],
  ["Decision",  "Backend gateway"],
  ["AI role",   "Propose only"],
  ["Audit",     "All attempts logged"],
] as const;

export default function AIAssistant() {
  const { user }                    = useUser();
  const [msgs, setMsgs]             = useState<Msg[]>([]);
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const endRef                      = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setInput("");

    const userMsg: Msg = {
      id: crypto.randomUUID(),
      role: "user",
      text: text.trim(),
      ts: new Date(),
    };
    setMsgs((m) => [...m, userMsg]);
    setLoading(true);

    try {
      const intent = parseIntent(text);
      if (!intent || !ACTIONS[intent]) {
        setMsgs((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "ai",
            text: `I can help you test authorization policies. Try: "read my salary", "read another employee's salary", "list my department", or "read my own profile".`,
            ts: new Date(),
          },
        ]);
        return;
      }

      const act = ACTIONS[intent];

      // Inform user which action will be evaluated
      setMsgs((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "ai",
          text: `Evaluating action: \`${act.action}\` for resource \`${act.resourceId(user.id)}\` as principal \`${user.id}\`…`,
          ts: new Date(),
        },
      ]);

      // Call backend authorization gateway
      const r = await api.authorizeAction(
        act.action,
        "employee",
        act.resourceId(user.id),
        user.id
      );
      const dec = r.decision;
      const allowed = dec.decision === "ALLOW";

      setMsgs((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "ai",
          text: allowed
            ? `Access permitted. The authorization engine granted \`${act.label}\`. This decision is enforced by the backend — not by this AI response.`
            : `Access denied. The authorization engine blocked \`${act.label}\` for \`${user.id}\`. Reason: \`${dec.reasonCode}\`. This is a real policy enforcement — not a simulated response.`,
          ts: new Date(),
          decision: dec,
        },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not evaluate authorization";
      setMsgs((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "ai",
          text: `Backend error: ${msg}. Ensure the backend is running.`,
          ts: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="ai-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 220px",
        gap: 14,
        height: "calc(100vh - var(--header-h) - 48px)",
      }}
    >
      {/* ── Chat panel ── */}
      <div
        className="card"
        style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        {/* Chat messages */}
        <div className="chat-msgs">
          {msgs.length === 0 && (
            <div
              style={{
                margin: "auto",
                textAlign: "center",
                padding: "28px 20px",
                maxWidth: 320,
              }}
            >
              <Sparkles
                size={28}
                strokeWidth={1.5}
                style={{
                  color: "var(--accent)",
                  marginBottom: 12,
                  display: "block",
                  margin: "0 auto 12px",
                }}
              />
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--text-1)",
                  marginBottom: 6,
                }}
              >
                Authorization-Aware AI Assistant
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "var(--text-3)",
                  lineHeight: 1.65,
                }}
              >
                Every action you request is evaluated by the backend policy
                engine before any operation is performed. This AI never
                determines final permissions.
              </div>
            </div>
          )}

          {msgs.map((m) => (
            <div key={m.id} className={`msg ${m.role === "user" ? "user" : ""}`}>
              <div className={`msg-av ${m.role === "ai" ? "ai" : "user"}`}>
                {m.role === "ai" ? (
                  <ShieldAlert size={13} strokeWidth={2} />
                ) : (
                  user.id[0].toUpperCase()
                )}
              </div>
              <div className="msg-body">
                <div className="msg-text" style={{ whiteSpace: "pre-wrap" }}>
                  {m.text}
                </div>
                {m.decision && (
                  <div style={{ marginTop: 7, display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      className={`badge ${
                        m.decision.decision === "ALLOW" ? "badge-allow" : "badge-deny"
                      }`}
                    >
                      {m.decision.decision === "ALLOW" ? (
                        <CheckCircle2 size={10} strokeWidth={2.5} />
                      ) : (
                        <XCircle size={10} strokeWidth={2.5} />
                      )}
                      {m.decision.decision}
                    </span>
                    <span style={{ fontSize: 10.5, color: "var(--text-3)", fontFamily: "var(--mono)" }}>
                      {m.decision.reasonCode}
                    </span>
                  </div>
                )}
                <div className="msg-time">{m.ts.toLocaleTimeString()}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="msg">
              <div className="msg-av ai">
                <ShieldAlert size={13} strokeWidth={2} />
              </div>
              <div className="msg-body">
                <div
                  className="msg-text"
                  style={{ display: "flex", gap: 8, alignItems: "center" }}
                >
                  <span className="spin" />
                  <span style={{ color: "var(--text-3)", fontSize: 12 }}>
                    Evaluating with backend…
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Input bar */}
        <div className="chat-input">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && !e.shiftKey && (e.preventDefault(), void send(input))
            }
            placeholder="Ask about an authorization action…"
            disabled={loading}
            aria-label="Message input"
          />
          <button
            className="btn btn-primary"
            onClick={() => void send(input)}
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            <Send size={13} strokeWidth={2} />
            Send
          </button>
        </div>
      </div>

      {/* ── Right sidebar ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Example prompts */}
        <div className="card card-p">
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: "var(--text-2)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              marginBottom: 12,
            }}
          >
            Example Prompts
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s.key}
                className="btn btn-ghost btn-sm"
                style={{
                  textAlign: "left",
                  justifyContent: "flex-start",
                  whiteSpace: "normal",
                  height: "auto",
                  lineHeight: 1.45,
                  padding: "7px 10px",
                }}
                onClick={() => void send(s.label)}
                disabled={loading}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Security model */}
        <div className="card card-p">
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: "var(--text-2)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              marginBottom: 12,
            }}
          >
            Security Model
          </div>
          {SECURITY_MODEL.map(([k, v]) => (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 0",
                borderBottom: "1px solid var(--border-soft)",
                fontSize: 12,
              }}
            >
              <span style={{ color: "var(--text-3)" }}>{k}</span>
              <span style={{ color: "var(--green)", fontWeight: 700, fontSize: 11 }}>{v}</span>
            </div>
          ))}
          <div
            style={{
              marginTop: 12,
              fontSize: 11,
              color: "var(--text-3)",
              lineHeight: 1.6,
            }}
          >
            The AI only proposes. The policy engine decides. The audit log records.
          </div>
        </div>
      </div>
    </div>
  );
}
