import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Nomination } from '@awards/contracts';
import { demoMode, request } from '../../lib/auth';
import { demoNominations } from '../../lib/demo';
import type { AdminContext } from './types';
import { Notice } from '../../components/ui';
import { AdminPicker } from './AdminPicker';
import { CheckCircle2, Plus, XCircle } from 'lucide-react';
export function NominationsPanel({
  id,
  categories,
  action,
  mutation,
}: Pick<AdminContext, 'id' | 'categories' | 'action' | 'mutation'>) {
  const [offset, setOffset] = useState(0);
  const [categoryId, setCategoryId] = useState('');
  const [demoClassifiedByCategory, setDemoClassifiedByCategory] = useState<Record<string, string[]>>({});
  useEffect(() => {
    if (!categoryId && categories.data?.[0]) setCategoryId(categories.data[0].id);
  }, [categoryId, categories.data]);
  const nominations = useQuery({
    queryKey: ['admin', 'nominations', id, offset, categoryId],
    queryFn: () =>
      demoMode
        ? Promise.resolve(demoNominations.filter((nomination) => nomination.category_id === categoryId))
        : request<Nomination[]>(
            `/admin/editions/${id}/nominations?offset=${offset}${categoryId ? `&category_id=${categoryId}` : ''}`,
          ),
    enabled: !!id && !!categoryId,
  });
  const category = categories.data?.find((item) => item.id === categoryId);
  return (
    <section className="admin-panel">
      <p>
        Todas as indicações recebidas são válidas. Selecione uma categoria para ver os nomes
        organizados pela quantidade de indicações recebidas. Clique em Classificar para escolher
        quem seguirá para a votação. A aba Classificação fica disponível para revisar a ordem e
        ajustar casos manuais.
      </p>
      <AdminPicker
        label="Categoria"
        value={categoryId}
        options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
        onChange={(value) => {
          setCategoryId(value);
          setOffset(0);
        }}
      />
      {category && (
        <section className="nomination-ranking">
          <div className="nomination-ranking-heading">
            <h3>{category.name}</h3>
            <span>{nominations.data?.length ?? 0} nomes</span>
          </div>
          <div className="nomination-ranking-columns">
            <span>Colocação</span>
            <span>Nome</span>
            <span>Indicações</span>
            <span>Status</span>
          </div>
          {(nominations.data ?? [])
            .slice()
            .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
            .map((n, index) => {
              const classifiedIds = demoMode
                ? demoClassifiedByCategory[category.id] ??
                  category.nominees.flatMap((nominee) =>
                    nominee.discord_user_id ? [nominee.discord_user_id] : [],
                  )
                : category.nominees.flatMap((nominee) =>
                    nominee.discord_user_id ? [nominee.discord_user_id] : [],
                  );
              const classified = Boolean(
                n.discord_user_id && classifiedIds.includes(n.discord_user_id),
              );
              const limitReached = classifiedIds.length >= category.max_nominees;
              const canClassify = Boolean(n.discord_user_id) && !classified && !limitReached;
              return (
                <div className="nomination-ranking-row" key={n.id}>
                  <span className="nomination-ranking-position">{index + 1}</span>
                  <div>
                    <strong>{n.display_name ?? n.manual_name ?? 'Nome não informado'}</strong>
                    <small>{n.discord_user_id ? `@${n.discord_user_id}` : 'Indicação manual'}</small>
                  </div>
                  <strong
                    className="nomination-ranking-count"
                    aria-label={`${n.count ?? 0} ${n.count === 1 ? 'indicação' : 'indicações'}`}
                  >
                    {n.count ?? 0}
                  </strong>
                  <div className="nomination-ranking-status">
                    {n.discord_user_id ? (
                      <button
                        type="button"
                        className={`nomination-ranking-action nomination-classify-button${classified ? ' is-classified' : ''}${!canClassify && !classified ? ' is-unavailable' : ''}`}
                        disabled={mutation.isPending || (!classified && !canClassify)}
                        aria-label={
                          classified
                            ? 'Remover classificação'
                            : limitReached
                              ? 'Limite de classificados atingido'
                              : 'Classificar pessoa'
                        }
                        title={
                          classified
                            ? 'Clique para retirar esta pessoa da classificação.'
                            : limitReached
                              ? 'O limite de indicados desta categoria foi atingido.'
                              : undefined
                        }
                        onClick={() => {
                          if (classified && n.member_id) {
                            if (demoMode) {
                              setDemoClassifiedByCategory((current) => ({
                                ...current,
                                [category.id]: classifiedIds.filter(
                                  (memberId) => memberId !== n.discord_user_id,
                                ),
                              }));
                              return;
                            }
                            action(
                              `/admin/editions/${id}/categories/${category.id}/nominees/${n.member_id}`,
                              { reason: 'Remoção na classificação das indicações' },
                              'DELETE',
                            );
                            return;
                          }
                          if (demoMode && n.discord_user_id) {
                            setDemoClassifiedByCategory((current) => {
                              const existing = current[category.id] ?? classifiedIds;
                              if (
                                existing.includes(n.discord_user_id!) ||
                                existing.length >= category.max_nominees
                              )
                                return current;
                              return {
                                ...current,
                                [category.id]: [...existing, n.discord_user_id!],
                              };
                            });
                            return;
                          }
                          action(`/admin/editions/${id}/categories/${category.id}/nominees`, {
                            discord_user_id: n.discord_user_id,
                            display_order: category.nominees.length,
                            reason: 'Classificação a partir das indicações',
                          });
                        }}
                      >
                      <Plus
                        className="nomination-classify-default"
                        size={20}
                        strokeWidth={2.5}
                        aria-hidden="true"
                      />
                        <CheckCircle2 className="nomination-classify-approved" size={20} aria-hidden="true" />
                        <XCircle className="nomination-classify-remove" size={20} aria-hidden="true" />
                      </button>
                    ) : (
                      <span className="nomination-ranking-action muted">Associar Discord</span>
                    )}
                  </div>
                </div>
              );
            })}
        </section>
      )}
      {!nominations.data?.length && <p className="empty">Nenhuma indicação nesta edição.</p>}
      <div className="vote-navigation">
        <button
          className="button button-outline"
          disabled={!offset || nominations.isFetching}
          onClick={() => setOffset(Math.max(0, offset - 100))}
        >
          Anterior
        </button>
        <span>Página {offset / 100 + 1}</span>
        <button
          className="button button-outline"
          disabled={(nominations.data?.length ?? 0) < 100 || nominations.isFetching}
          onClick={() => setOffset(offset + 100)}
        >
          Próxima
        </button>
      </div>
      {nominations.error && <Notice message={nominations.error.message} />}
    </section>
  );
}
