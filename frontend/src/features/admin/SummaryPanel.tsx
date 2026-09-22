import type { AdminContext } from './types';
import { demoMode } from '../../lib/auth';
import { phaseLabels } from '@awards/contracts';
export function SummaryPanel({
  edition,
  categories,
  analytics,
}: Pick<AdminContext, 'edition' | 'categories' | 'analytics'>) {
  return (
    <>
      <div className="admin-stats">
        {[
          [analytics.data?.ballots ?? 0, 'Cédulas confirmadas'],
          [categories.data?.length ?? 0, 'Categorias'],
        ].map(([value, label]) => (
          <div key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
            <span>{demoMode ? 'Preview demonstrativo' : 'Dados da edição'}</span>
          </div>
        ))}
      </div>
      <section className="admin-panel phase-panel">
        <div>
          <span className="eyebrow">FASE ATUAL</span>
          <h2>{phaseLabels[edition.status]}</h2>
          <p>
            {edition.voting_close_at
              ? `Votação encerra em ${new Date(edition.voting_close_at).toLocaleString('pt-BR')}`
              : 'Configure o período de votação.'}
          </p>
        </div>
        <span className="phase-pill">
          <span className="status-dot" />
          {edition.status}
        </span>
      </section>
    </>
  );
}
