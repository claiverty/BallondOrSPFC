import type { AdminContext } from './types';
import { ArrowUpRight, Check, Radio, RefreshCw } from 'lucide-react';
import { Notice } from '../../components/ui';
import { phaseLabels } from '@awards/contracts';

type LiveRow = NonNullable<AdminContext['analytics']['data']>['categories'][number];

function groupLiveRows(rows: LiveRow[]) {
  const groups = new Map<string, { id: string; name: string; rows: LiveRow[] }>();
  for (const row of rows) {
    const group = groups.get(row.category_id) ?? {
      id: row.category_id,
      name: row.category_name,
      rows: [],
    };
    group.rows.push(row);
    groups.set(row.category_id, group);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    rows: [...group.rows].sort((a, b) => b.votes_count - a.votes_count),
  }));
}

function formatUpdatedAt(timestamp: number) {
  if (!timestamp) return 'Aguardando votos';
  return `Atualizado às ${new Date(timestamp).toLocaleTimeString('pt-BR')}`;
}

export function ResultsPanel({
  id,
  next,
  reason,
  setReason,
  mutation,
  action,
  results,
  analytics,
}: Pick<
  AdminContext,
  'id' | 'next' | 'reason' | 'setReason' | 'mutation' | 'action' | 'results' | 'analytics'
>) {
  const liveGroups = groupLiveRows(analytics.data?.categories ?? []);
  const tieRows = (results.data ?? []).filter(
    (row) =>
      row.rank === 1 &&
      (results.data ?? []).filter(
        (other) => other.category_id === row.category_id && other.rank === 1,
      ).length > 1,
  );
  const hasTie = tieRows.length > 0;
  const standardReason = next
    ? `Avanço administrativo: ${phaseLabels[next]}`
    : 'Apuração dos resultados';

  return (
    <>
      <section className="admin-panel results-live-panel">
        <div className="panel-heading results-live-heading">
          <div>
            <span className="eyebrow">ACOMPANHAMENTO AO VIVO</span>
            <h2>Votação por categoria</h2>
            <p>Os gráficos são atualizados automaticamente enquanto os votos chegam.</p>
          </div>
          <span className="results-live-status">
            <Radio size={15} aria-hidden="true" />
            Ao vivo
          </span>
        </div>
        <div className="results-live-meta" aria-live="polite">
          <div>
            <small>Cédulas recebidas</small>
            <strong>{analytics.data?.ballots ?? 0}</strong>
          </div>
          <div>
            <small>Categorias monitoradas</small>
            <strong>{liveGroups.length}</strong>
          </div>
          <div>
            <small>{analytics.isFetching ? 'Atualizando' : 'Última atualização'}</small>
            <strong>
              {analytics.isFetching && <RefreshCw size={14} aria-hidden="true" />}
              {formatUpdatedAt(analytics.dataUpdatedAt)}
            </strong>
          </div>
        </div>
        {liveGroups.length ? (
          <div className="results-chart-grid">
            {liveGroups.map((group) => {
              const maxVotes = Math.max(...group.rows.map((row) => row.votes_count), 1);
              const totalVotes = group.rows.reduce((total, row) => total + row.votes_count, 0);
              return (
                <article className="results-chart-card" key={group.id}>
                  <div className="results-chart-card-heading">
                    <h3>{group.name}</h3>
                    <span>{totalVotes} votos</span>
                  </div>
                  <div className="results-chart" role="list" aria-label={`Votos em ${group.name}`}>
                    {group.rows.map((row, index) => (
                      <div className="results-chart-row" role="listitem" key={row.nominee_id}>
                        <div className="results-chart-label">
                          <span>{String(index + 1).padStart(2, '0')}</span>
                          <strong>{row.display_name}</strong>
                        </div>
                        <div className="results-chart-track" aria-hidden="true">
                          <span
                            className={index === 0 && row.votes_count > 0 ? 'leader' : ''}
                            style={{
                              width: `${row.votes_count ? (row.votes_count / maxVotes) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span className="results-chart-value">
                          {row.votes_count}
                          <small>{Number(row.percentage).toFixed(1)}%</small>
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="empty">Os gráficos aparecerão assim que houver categorias e votos.</p>
        )}
        {analytics.error && <Notice message={analytics.error.message} />}
      </section>

      <section className="admin-panel results-review-panel">
        <h2>Apuração e publicação</h2>
        <p>
          Depois de encerrar a votação, confira a classificação final e publique os vencedores.
        </p>
        {hasTie && (
          <label>
            Justificativa do desempate
            <input value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
        )}
        {results.data?.map((r) => (
          <div className="review-row" key={`${r.category_id}:${r.nominee_id}`}>
            <span>{r.category_name}</span>
            <strong>
              {r.rank}º · {r.display_name}
            </strong>
            <span>
              {r.votes_count} votos · {Number(r.percentage).toFixed(1)}%
            </span>
            {r.rank === 1 && hasTie && tieRows.some((tie) => tie.nominee_id === r.nominee_id) && (
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
        {!results.data?.length && <p className="empty">A apuração final aparecerá ao encerrar a votação.</p>}
        {next && ['RESULTS_READY', 'RESULTS_PUBLISHED', 'ARCHIVED'].includes(next) && (
          <button
            className="button"
            disabled={(hasTie && reason.trim().length < 3) || mutation.isPending}
            onClick={() =>
              action(`/admin/editions/${id}/transition`, {
                status: next,
                reason: hasTie ? reason : standardReason,
              })
            }
          >
            {phaseLabels[next]}
            <ArrowUpRight size={16} />
          </button>
        )}
        {results.error && <Notice message={results.error.message} />}
      </section>
    </>
  );
}
