import type { AdminContext } from './types';
export function AuditPanel({ logs }: Pick<AdminContext, 'logs'>) {
  return (
    <section className="admin-panel">
      <h2>Decisões registradas</h2>
      {logs.data?.map((l) => (
        <div className="audit-row" key={l.id}>
          <span className="eyebrow">{l.action}</span>
          <strong>{l.reason}</strong>
          <small>
            {new Date(l.created_at).toLocaleString('pt-BR')} · {l.actor_id}
          </small>
        </div>
      ))}
      {!logs.data?.length && <p className="empty">Nenhuma ação registrada nesta edição.</p>}
    </section>
  );
}
