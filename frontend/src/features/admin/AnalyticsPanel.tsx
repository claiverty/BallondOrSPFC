import type { AdminContext } from './types';
import { Notice } from '../../components/ui';
export function AnalyticsPanel({ analytics }: Pick<AdminContext, 'analytics'>) {
  return (
    <section className="admin-panel">
      <h2>Participação por categoria</h2>
      <p>
        Estatísticas agregadas privadas. O universo elegível é informado pela organização; quando
        ausente, a taxa não é estimada.
      </p>
      {analytics.data?.categories.map((c) => (
        <div className="analytics-row" key={`${c.category_id}:${c.nominee_id}`}>
          <div>
            <span>{c.category_name}</span>
            <strong>{c.display_name}</strong>
          </div>
          <progress
            aria-label={`Participação de ${c.display_name}`}
            value={c.percentage}
            max={100}
          />
          <span>
            {c.votes_count} · {c.percentage.toFixed(1)}%
          </span>
        </div>
      ))}
      {analytics.data?.timeline.map((t) => (
        <div className="review-row" key={t.day}>
          <span>{t.day}</span>
          <strong>{t.count} cédulas</strong>
        </div>
      ))}
      {!analytics.data?.categories.length && (
        <p className="empty">Estatísticas aparecerão após os primeiros votos reais.</p>
      )}
      {analytics.error && <Notice message={analytics.error.message} />}
    </section>
  );
}
