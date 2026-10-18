import { useState, useEffect, useCallback } from "react";
import "./App.css";
import {
  UserProvider,
  useUser,
  DEMO_USERS,
} from "./context/UserContext";
import Dashboard   from "./pages/Dashboard";
import AuditLog    from "./pages/AuditLog";
import Firewall    from "./pages/Firewall";
import AIAssistant from "./pages/AIAssistant";
import About       from "./pages/About";
import { api } from "./api";
import {
  LayoutDashboard,
  ScrollText,
  ShieldCheck,
  Bot,
  Info,
  AlertTriangle,
  Menu,
  X,
  Wifi,
  WifiOff,
  Loader2,
  RefreshCw,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────── */
type Page = "dashboard" | "audit" | "firewall" | "ai" | "about";
type ConnStatus = "ok" | "wait" | "err";

/* ── Navigation definition ──────────────────────────────── */
interface NavItem {
  id: Page;
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  group?: string;
}

const NAV: NavItem[] = [
  { id: "dashboard", label: "Overview",         Icon: LayoutDashboard, group: "MONITOR" },
  { id: "audit",     label: "Audit Logs",       Icon: ScrollText },
  { id: "firewall",  label: "Authorization",    Icon: ShieldCheck,     group: "PROTECT" },
  { id: "ai",        label: "AI Assistant",     Icon: Bot },
  { id: "about",     label: "About",            Icon: Info,            group: "SYSTEM" },
];

const TITLES: Record<Page, { title: string; desc: string }> = {
  dashboard: { title: "Security Overview",        desc: "Monitor agent activity, authorization decisions, and policy enforcement." },
  audit:     { title: "Audit Logs",               desc: "Persisted authorization events — immutable, server-enforced." },
  firewall:  { title: "Authorization Firewall",   desc: "Evaluate live policy decisions against the backend engine." },
  ai:        { title: "AI Assistant",             desc: "Policy-aware authorization assistant — every action evaluated by the backend." },
  about:     { title: "About ScopeLock AI",       desc: "Trustworthy and verifiable AI authorization platform." },
};

/* ── Shield logo SVG ────────────────────────────────────── */
function ShieldLogo() {
  return (
    <svg
      className="sb-brand-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11 4.5-.85 8-5.75 8-11V6L12 2z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

/* ── Connection Status pill ─────────────────────────────── */
function ConnPill({ status }: { status: ConnStatus }) {
  const map = {
    ok:   { label: "Connected",     Icon: Wifi,     cls: "ok" },
    wait: { label: "Connecting…",   Icon: Loader2,  cls: "wait" },
    err:  { label: "Offline",       Icon: WifiOff,  cls: "err" },
  } as const;

  const { label, Icon, cls } = map[status];
  return (
    <div className={`conn-pill ${cls}`}>
      <Icon size={11} strokeWidth={2.5} />
      {label}
    </div>
  );
}

/* ── Main Shell ─────────────────────────────────────────── */
function Shell() {
  const [page, setPage]       = useState<Page>("dashboard");
  const [conn, setConn]       = useState<ConnStatus>("wait");
  const [sideOpen, setSideOpen] = useState(false);
  const { user, setUser }     = useUser();

  /* health check every 12 s */
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

  const { title, desc } = TITLES[page];

  function navigate(p: Page) {
    setPage(p);
    setSideOpen(false);
  }

  return (
    <div className="layout">
      {/* ── Sidebar overlay (mobile) ── */}
      <div
        className={`sidebar-overlay ${sideOpen ? "open" : ""}`}
        onClick={() => setSideOpen(false)}
        aria-hidden="true"
      />

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sideOpen ? "open" : ""}`} aria-label="Main navigation">
        {/* Brand */}
        <div className="sb-brand">
          <div className="sb-brand-mark" aria-hidden="true">
            <ShieldLogo />
          </div>
          <div>
            <div className="sb-brand-name">ScopeLock AI</div>
            <div className="sb-brand-tag">AI Authorization Platform</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sb-nav" aria-label="Primary">
          {NAV.map((n) => (
            <div key={n.id}>
              {n.group && <div className="sb-section">{n.group}</div>}
              <button
                className={`nav-btn ${page === n.id ? "active" : ""}`}
                onClick={() => navigate(n.id)}
                aria-current={page === n.id ? "page" : undefined}
                title={n.label}
              >
                <span className="nav-icon">
                  <n.Icon size={14} strokeWidth={2} />
                </span>
                {n.label}
              </button>
            </div>
          ))}
        </nav>

        {/* Identity switcher */}
        <div className="sb-footer">
          <div className="id-switcher">
            <div className="id-demo-label">
              <AlertTriangle size={9} strokeWidth={2.5} />
              Demo Environment
            </div>
            <select
              className="id-select"
              value={user.id}
              aria-label="Select demo identity"
              onChange={(e) => {
                const u = DEMO_USERS.find((x) => x.id === e.target.value);
                if (u) setUser(u);
              }}
            >
              {DEMO_USERS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
            <div className="id-info">
              <div className="id-avatar" aria-hidden="true">
                {user.id[0].toUpperCase()}
              </div>
              <div>
                <div className="id-name">{user.id}</div>
                <div className="id-role">
                  <span className={`role-badge role-${user.role}`}>{user.role}</span>
                  &nbsp;· {user.department}
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="main-wrap">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            {/* Mobile toggle */}
            <button
              className="sb-toggle"
              onClick={() => setSideOpen((v) => !v)}
              aria-label={sideOpen ? "Close menu" : "Open menu"}
              aria-expanded={sideOpen}
            >
              {sideOpen ? <X size={16} /> : <Menu size={16} />}
            </button>

            <div>
              <span className="header-title">{title}</span>
              <span className="header-desc" style={{ marginLeft: 10 }}>{desc}</span>
            </div>
          </div>

          <div className="header-right">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => void ping()}
              aria-label="Refresh connection status"
              title="Refresh backend connection"
            >
              <RefreshCw size={12} strokeWidth={2.5} />
            </button>
            <ConnPill status={conn} />
          </div>
        </header>

        {/* Page content */}
        <div className="content fadein" key={page}>
          {page === "dashboard" && <Dashboard />}
          {page === "audit"     && <AuditLog />}
          {page === "firewall"  && <Firewall />}
          {page === "ai"        && <AIAssistant />}
          {page === "about"     && <About />}
        </div>
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
