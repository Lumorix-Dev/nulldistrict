import type { PropsWithChildren, ReactNode } from "react";

export function Panel({ title, kicker, children }: PropsWithChildren<{ title: string; kicker?: string }>) {
  return (
    <section className="panel">
      {kicker ? <span className="kicker">{kicker}</span> : null}
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function IconButton({
  children,
  onClick,
  title,
  active
}: PropsWithChildren<{ onClick?: () => void; title: string; active?: boolean }>) {
  return (
    <button className={`icon-button ${active ? "active" : ""}`} onClick={onClick} title={title} aria-label={title}>
      {children}
    </button>
  );
}

export function EmptyState({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}
