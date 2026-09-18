import type { AdminContext } from './types';
import { Trash2 } from 'lucide-react';
import { demoMode } from '../../lib/auth';
import { MemberSearch } from '../../components/MemberSearch';
export function NomineesPanel({
  id,
  categories,
  reason,
  setReason,
  action,
  category,
  setCategoryId,
  setMessage,
}: Pick<
  AdminContext,
  | 'id'
  | 'categories'
  | 'reason'
  | 'setReason'
  | 'action'
  | 'category'
  | 'setCategoryId'
  | 'setMessage'
>) {
  return (
    <section className="admin-panel">
      <label>
        Categoria
        <select value={category?.id ?? ''} onChange={(e) => setCategoryId(e.target.value)}>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Motivo da decisão
        <input value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <MemberSearch
        onSelect={(m) => {
          if (reason.trim().length < 3) {
            setMessage('Informe o motivo antes de adicionar um indicado oficial.');
            return;
          }
          action(`/admin/editions/${id}/categories/${category?.id}/nominees`, {
            discord_user_id: m.discord_user_id,
            display_order: category?.nominees.length ?? 0,
            reason,
          });
        }}
      />
      {category?.nominees.map((n) => (
        <div className="admin-list-row" key={n.id}>
          <strong>{n.display_name}</strong>
          <label>
            Ordem
            <input
              type="number"
              defaultValue={n.display_order ?? 0}
              onBlur={(e) => {
                const order = Number(e.target.value);
                if (!demoMode && order !== (n.display_order ?? 0) && reason.trim().length >= 3)
                  action(`/admin/editions/${id}/categories/${category.id}/nominees`, {
                    discord_user_id: n.discord_user_id,
                    display_order: order,
                    reason,
                  });
              }}
            />
          </label>
          <button
            className="icon-button"
            aria-label={`Remover ${n.display_name}`}
            disabled={reason.trim().length < 3}
            onClick={() =>
              action(
                `/admin/editions/${id}/categories/${category.id}/nominees/${n.id}`,
                { reason },
                'DELETE',
              )
            }
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </section>
  );
}
