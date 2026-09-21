import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Nomination } from '@awards/contracts';
import { demoMode, request } from '../../lib/auth';
import type { AdminContext } from './types';
import { Notice } from '../../components/ui';
import { AdminPicker } from './AdminPicker';
export function NominationsPanel({
  id,
  categories,
  action,
  mutation,
}: Pick<AdminContext, 'id' | 'categories' | 'action' | 'mutation'>) {
  const [offset, setOffset] = useState(0);
  const [categoryId, setCategoryId] = useState('');
  useEffect(() => {
    if (!categoryId && categories.data?.[0]) setCategoryId(categories.data[0].id);
  }, [categoryId, categories.data]);
  const nominations = useQuery({
    queryKey: ['admin', 'nominations', id, offset, categoryId],
    queryFn: () =>
      demoMode
        ? Promise.resolve([])
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
          {(nominations.data ?? [])
            .slice()
            .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
            .map((n, index) => {
              const classified = Boolean(
                n.discord_user_id &&
                  category.nominees.some((nominee) => nominee.discord_user_id === n.discord_user_id),
              );
              const limitReached = category.nominees.length >= category.max_nominees;
              const canClassify = Boolean(n.discord_user_id) && !classified && !limitReached;
              return (
                <div className="nomination-ranking-row" key={n.id}>
                  <span className="nomination-ranking-position">{index + 1}</span>
                  <div>
                    <strong>{n.display_name ?? n.manual_name ?? 'Nome não informado'}</strong>
                    <small>{n.discord_user_id ? `@${n.discord_user_id}` : 'Indicação manual'}</small>
                  </div>
                  <strong className="nomination-ranking-count">
                    {n.count ?? 0} {n.count === 1 ? 'indicação' : 'indicações'}
                  </strong>
                  {n.discord_user_id ? (
                    <button
                      type="button"
                      className="text-link nomination-ranking-action"
                      disabled={mutation.isPending || classified || !canClassify}
                      title={
                        classified
                          ? 'Esta pessoa já foi classificada.'
                          : limitReached
                            ? 'O limite de indicados desta categoria foi atingido.'
                            : undefined
                      }
                      onClick={() =>
                        action(`/admin/editions/${id}/categories/${category.id}/nominees`, {
                          discord_user_id: n.discord_user_id,
                          display_order: category.nominees.length,
                          reason: 'Classificação a partir das indicações',
                        })
                      }
                    >
                      {classified ? 'Classificado' : limitReached ? 'Limite atingido' : 'Classificar'}
                    </button>
                  ) : (
                    <span className="nomination-ranking-action muted">Associar Discord</span>
                  )}
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
