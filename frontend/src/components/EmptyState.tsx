// frontend/src/components/EmptyState.tsx

interface EmptyStateProps {
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  message: string;
  action?: React.ReactNode;
}

export function EmptyState({ Icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon size={20} strokeWidth={1.5} />
      </div>
      <div className="empty-title">{title}</div>
      <div className="empty-sub">{message}</div>
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

