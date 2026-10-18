// frontend/src/components/StatusBadge.tsx
import { CheckCircle2, XCircle, AlertTriangle, Info, Circle } from "lucide-react";

type DecisionType = "ALLOW" | "DENY";
type StatusType = "active" | "idle" | "error" | "draft" | "active_status" | "deprecated";

interface DecisionBadgeProps {
  decision: DecisionType;
  size?: "sm" | "md";
}

export function DecisionBadge({ decision, size = "md" }: DecisionBadgeProps) {
  const cls = decision === "ALLOW" ? "badge-allow" : "badge-deny";
  const Icon = decision === "ALLOW" ? CheckCircle2 : XCircle;
  const iconSize = size === "sm" ? 9 : 10;
  return (
    <span className={`badge ${cls}`}>
      <Icon size={iconSize} strokeWidth={2.5} />
      {decision}
    </span>
  );
}

interface AgentStatusBadgeProps {
  status: "active" | "idle" | "error";
}

export function AgentStatusBadge({ status }: AgentStatusBadgeProps) {
  const map = {
    active: { cls: "badge-allow", label: "Active",   Icon: Circle },
    idle:   { cls: "badge-neutral", label: "Idle",   Icon: Circle },
    error:  { cls: "badge-deny",  label: "Error",    Icon: AlertTriangle },
  } as const;
  const { cls, label, Icon } = map[status];
  return (
    <span className={`badge ${cls}`}>
      <Icon size={9} strokeWidth={2.5} fill={status === "active" ? "currentColor" : undefined} />
      {label}
    </span>
  );
}

interface RoleBadgeProps {
  role: "EMPLOYEE" | "MANAGER" | "ADMIN";
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const cls = {
    EMPLOYEE: "badge-employee",
    MANAGER:  "badge-manager",
    ADMIN:    "badge-admin",
  }[role];
  return <span className={`badge ${cls}`}>{role}</span>;
}

interface PolicyStatusBadgeProps {
  status: "active" | "draft" | "deprecated";
}

export function PolicyStatusBadge({ status }: PolicyStatusBadgeProps) {
  const map = {
    active:     { cls: "badge-allow",   label: "Active" },
    draft:      { cls: "badge-neutral", label: "Draft" },
    deprecated: { cls: "badge-warn",    label: "Deprecated" },
  } as const;
  const { cls, label } = map[status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

interface ToolCategoryBadgeProps {
  category: "data-read" | "data-write" | "admin" | "reporting";
}

export function ToolCategoryBadge({ category }: ToolCategoryBadgeProps) {
  const map = {
    "data-read":  { cls: "badge-info",    label: "Data Read" },
    "data-write": { cls: "badge-warn",    label: "Data Write" },
    "admin":      { cls: "badge-deny",    label: "Admin" },
    "reporting":  { cls: "badge-neutral", label: "Reporting" },
  } as const;
  const { cls, label } = map[category];
  return <span className={`badge ${cls}`}>{label}</span>;
}

interface InfoBadgeProps { label: string; }
export function InfoBadge({ label }: InfoBadgeProps) {
  return <span className="badge badge-info"><Info size={9} strokeWidth={2.5} />{label}</span>;
}
