import type { AdminContext } from './types';
import { ArrowUpRight, Check } from 'lucide-react';
import { Notice } from '../../components/ui';
import { phaseLabels } from '@awards/contracts';
export function ResultsPanel({
  id,
  next,
  reason,
  setReason,
  mutation,
  action,
  results,
}: Pick<AdminContext, 'id' | 'next' | 'reason' | 'setReason' | 'mutation' | 'action' | 'results'>) {
  return (
    <section className="admin-panel">
      <h2>Apuração e publicação</h2>
      <p>
        Encerre a votação e avance para revisão dos resultados. Empates no primeiro lugar devem ser
        resolvidos com motivo antes da publicação.
      </p>
      <label>
        Motivo
        <input value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      {results.data?.map((r) => (
        <div className="review-row" key={`${r.category_id}:${r.nominee_id}`}>
          <span>{r.category_name}</span>
          <strong>
            {r.rank}º · {r.display_name}
          </strong>
          <span>
            {r.votes_count} votos · {Number(r.percentage).toFixed(1)}%
          </span>
          {r.rank === 1 &&
            results.data.filter((other) => other.category_id === r.category_id && other.rank === 1)
              .length > 1 && (
              <button
                className="text-link"
                disabled={reason.length < 3}
                onClick={() =>
                  action(`/admin/editions/${id}/ties`, {
                    category_id: r.category_id,
                    nominee_id: r.nominee_id,
                    reason,
                  })
                }
              >
                Selecionar vencedor do empate
                <Check size={16} />
              </button>
            )}
        </div>
      ))}
      {!results.data?.length && <p className="empty">Nenhuma apuração disponível.</p>}
      {next && ['RESULTS_READY', 'RESULTS_PUBLISHED', 'ARCHIVED'].includes(next) && (
        <button
          className="button"
          disabled={reason.trim().length < 3 || mutation.isPending}
          onClick={() => action(`/admin/editions/${id}/transition`, { status: next, reason })}
        >
          {phaseLabels[next]}
          <ArrowUpRight size={16} />
        </button>
      )}
      {results.error && <Notice message={results.error.message} />}
    </section>
  );
}
