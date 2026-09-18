import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Nomination } from '@awards/contracts';
import { demoMode, request } from '../../lib/auth';
import type { AdminContext } from './types';
import { Notice } from '../../components/ui';
import { ReviewRow } from './ReviewRow';
export function NominationsPanel({
  id,
  categories,
  reason,
  setReason,
  action,
}: Pick<AdminContext, 'id' | 'categories' | 'reason' | 'setReason' | 'action'>) {
  const [offset, setOffset] = useState(0);
  const [categoryId, setCategoryId] = useState('');
  const nominations = useQuery({
    queryKey: ['admin', 'nominations', id, offset, categoryId],
    queryFn: () =>
      demoMode
        ? Promise.resolve([])
        : request<Nomination[]>(
            `/admin/editions/${id}/nominations?offset=${offset}${categoryId ? `&category_id=${categoryId}` : ''}`,
          ),
  });
  return (
    <section className="admin-panel">
      <p>
        Indicações manuais exigem associação a um Discord ID para aprovação. As decisões não
        promovem candidatos automaticamente.
      </p>
      <label>
        Categoria
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setOffset(0);
          }}
        >
          <option value="">Todas as categorias</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Motivo da revisão
        <input value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      {nominations.data?.map((n) => (
        <ReviewRow
          key={n.id}
          nomination={n}
          reason={reason}
          onAction={(body) => action(`/admin/editions/${id}/nominations/${n.id}`, body, 'PATCH')}
        />
      ))}
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
