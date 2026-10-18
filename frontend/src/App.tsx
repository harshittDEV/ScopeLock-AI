import { useState, useEffect, useCallback } from "react";
import "./App.css";
import { UserProvider, useUser, DEMO_USERS } from "./context/UserContext";
import { api } from "./api";

// Pages
import CommandCenter        from "./pages/CommandCenter";
import AuditTrail           from "./pages/AuditTrail";
import AuthorizationPolicies from "./pages/AuthorizationPolicies";
import AgentsPage           from "./pages/AgentsPage";
import ToolsPermissions     from "./pages/ToolsPermissions";
import MetricsDashboard     from "./pages/MetricsDashboard";
import EvaluationsPage      from "./pages/EvaluationsPage";
import SettingsPage         from "./pages/SettingsPage";
import FirewallEvaluator    from "./pages/FirewallEvaluator";
import AIAssistant          from "./pages/AIAssistant";

import {
  Shield,
  LayoutDashboard,
  Bot,
  ShieldCheck,
  Wrench,
  ScrollText,
  FlaskConical,
  BarChart3,
  Settings,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronDown,
  Menu,
  X,
  AlertTriangle,
  Zap,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────── */
type Page =
  | "command-center"
  | "agents"
  | "policies"
  | "tools"
  | "audit"
  | "evaluations"
  | "metrics"
  | "settings"
  | "firewall"
  | "ai-assistant";

type ConnStatus = "ok" | "wait" | "err";

/* ── Navigation config ──────────────────────────────────── */
interface NavGroup {
  label: string;
  items: Array<{
    id: Page;
    label: string;
    Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  }>;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "OVERVIEW",
    items: [
      { id: "command-center", label: "Command Center", Icon: LayoutDashboard },
    ],
  },
  {
    label: "GOVERNANCE",
    items: [
      { id: "agents",   label: "Agents",                 Icon: Bot },
      { id: "policies", label: "Authorization Policies", Icon: ShieldCheck },
      { id: "tools",    label: "Tools & Permissions",    Icon: Wrench },
      { id: "firewall", label: "Live Evaluator",         Icon: Zap },
      { id: "ai-assistant", label: "AI Assistant",       Icon: Shield },
    ],
  },
  {
    label: "OBSERVABILITY",
    items: [
      { id: "audit",       label: "Audit Trail",  Icon: ScrollText },
      { id: "evaluations", label: "Evaluations",  Icon: FlaskConical },
      { id: "metrics",     label: "Metrics",      Icon: BarChart3 },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { id: "settings", label: "Settings", Icon: Settings },
    ],
  },
];

const PAGE_META: Record<Page, { title: string; breadcrumb: string[] }> = {
  "command-center": { title: "Command Center",          breadcrumb: ["Overview", "Command Center"] },
  "agents":         { title: "Agents",                  breadcrumb: ["Governance", "Agents"] },
  "policies":       { title: "Authorization Policies",  breadcrumb: ["Governance", "Authorization Policies"] },
  "tools":          { title: "Tools & Permissions",     breadcrumb: ["Governance", "Tools & Permissions"] },
  "firewall":       { title: "Live Evaluator",          breadcrumb: ["Governance", "Live Evaluator"] },
  "ai-assistant":   { title: "AI Assistant",            breadcrumb: ["Governance", "AI Assistant"] },
  "audit":          { title: "Audit Trail",             breadcrumb: ["Observability", "Audit Trail"] },
  "evaluations":    { title: "Evaluations",             breadcrumb: ["Observability", "Evaluations"] },
  "metrics":        { title: "Metrics",                 breadcrumb: ["Observability", "Metrics"] },
  "settings":       { title: "Settings",                breadcrumb: ["System", "Settings"] },
};

/* ── Shield logo ────────────────────────────────────────── */
function ShieldLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11 4.5-.85 8-5.75 8-11V6L12 2z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

/* ── Connection pill ────────────────────────────────────── */
function ConnPill({ status }: { status: ConnStatus }) {
  const configs = {
    ok:   { label: "Connected",   Icon: Wifi,     cls: "ok" },
    wait: { label: "Connecting…", Icon: RefreshCw, cls: "wait" },
    err:  { label: "Offline",     Icon: WifiOff,  cls: "err" },
  } as const;
  const { label, Icon, cls } = configs[status];
  return (
    <div className={`status-pill ${cls}`}>
      <Icon size={10} strokeWidth={2.5} />
      {label}
    </div>
  );
}

/* ── App Shell ──────────────────────────────────────────── */
function Shell() {
  const { user, setUser } = useUser();
  const [page, setPage]         = useState<Page>("command-center");
  const [conn, setConn]         = useState<ConnStatus>("wait");
  const [sideOpen, setSideOpen] = useState(false);

  const ping = useCallback(async () => {
    try {
      await api.health();
      setConn("ok");
    } catch {
      setConn("err");
    }
  }, []);

  useEffect(() => {
    void ping();
    const t = setInterval(ping, 12000);
    return () => clearInterval(t);
  }, [ping]);

  function navigate(p: Page) {
    setPage(p);
    setSideOpen(false);
  }

  const meta = PAGE_META[page];

  return (
    <div className="layout">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${sideOpen ? "open" : ""}`}
        onClick={() => setSideOpen(false)}
        aria-hidden="true"
      />

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sideOpen ? "open" : ""}`} aria-label="Main navigation">
        {/* Brand */}
        <div className="sb-brand">
          <div className="sb-logo" aria-hidden="true">
            <ShieldLogo />
          </div>
          <div className="sb-wordmark">
            <div className="sb-wordmark-name">ScopeLock AI</div>
            <div className="sb-wordmark-sub">Control Plane</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sb-nav" aria-label="Primary navigation">
          {NAV_GROUPS.map((group) => (
            <div className="sb-group" key={group.label}>
              <div className="sb-group-label">{group.label}</div>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${page === item.id ? "active" : ""}`}
                  onClick={() => navigate(item.id)}
                  aria-current={page === item.id ? "page" : undefined}
                >
                  <span className="nav-icon">
                    <item.Icon size={14} strokeWidth={2} />
                  </span>
                  <span className="nav-label">{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sb-footer">
          {/* User identity */}
          <div className="sb-user" title="Switch demo identity">
            <div className="user-avatar" aria-hidden="true">
              {user.id[0].toUpperCase()}
            </div>
            <div className="user-info">
              <div className="user-name">{user.id}</div>
              <div className="user-role">{user.role} · {user.department}</div>
            </div>
            <ChevronDown size={12} strokeWidth={2} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
          </div>

          {/* Identity selector */}
          <select
            aria-label="Select demo identity"
            value={user.id}
            onChange={(e) => {
              const u = DEMO_USERS.find((x) => x.id === e.target.value);
              if (u) setUser(u);
            }}
            style={{
              fontSize: "11px",
              padding: "5px 8px",
              marginBottom: "8px",
              background: "var(--surface-raised)",
              borderRadius: "var(--r-sm)",
            }}
          >
            {DEMO_USERS.map((u) => (
              <option key={u.id} value={u.id}>{u.label}</option>
            ))}
          </select>

          {/* Demo environment badge */}
          <div className="env-badge" title="This is a demo environment — not production data">
            <span className="env-dot" />
            <span className="env-text">
              <AlertTriangle size={9} strokeWidth={2.5} style={{ display: "inline", marginRight: 4 }} />
              DEMO ENVIRONMENT
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-area">
        {/* Top bar */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="sb-toggle"
              onClick={() => setSideOpen((v) => !v)}
              aria-label={sideOpen ? "Close menu" : "Open menu"}
              aria-expanded={sideOpen}
            >
              {sideOpen ? <X size={15} /> : <Menu size={15} />}
            </button>

            <div className="breadcrumb">
              {meta.breadcrumb.map((crumb, i) => (
                <span key={crumb} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {i < meta.breadcrumb.length - 1 ? (
                    <>
                      <span>{crumb}</span>
                      <span className="breadcrumb-sep">/</span>
                    </>
                  ) : (
                    <span className="breadcrumb-current">{crumb}</span>
                  )}
                </span>
              ))}
            </div>
          </div>

          <div className="topbar-right">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => void ping()}
              aria-label="Refresh connection"
              title="Check backend connection"
            >
              <RefreshCw size={12} strokeWidth={2.5} />
            </button>
            <ConnPill status={conn} />
          </div>
        </header>

        {/* Page content */}
        <main className="page-content fade-in" key={page}>
          {page === "command-center" && <CommandCenter />}
          {page === "agents"         && <AgentsPage />}
          {page === "policies"       && <AuthorizationPolicies />}
          {page === "tools"          && <ToolsPermissions />}
          {page === "firewall"       && <FirewallEvaluator />}
          {page === "ai-assistant"   && <AIAssistant />}
          {page === "audit"          && <AuditTrail />}
          {page === "evaluations"    && <EvaluationsPage />}
          {page === "metrics"        && <MetricsDashboard />}
          {page === "settings"       && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <UserProvider>
      <Shell />
    </UserProvider>
  );
}
