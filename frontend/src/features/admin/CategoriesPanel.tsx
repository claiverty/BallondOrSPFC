import type { AdminContext } from './types';
import { ArrowUpRight, Plus, Trash2, X } from 'lucide-react';
import { CategoryForm } from '../AdminForms';
export function CategoriesPanel({
  id,
  categories,
  mutation,
  action,
  editCat,
  setEditCat,
}: Pick<AdminContext, 'id' | 'categories' | 'mutation' | 'action' | 'editCat' | 'setEditCat'>) {
  return (
    <>
      <div className="panel-heading">
        <p>Categorias e regras são editáveis na fase de preparação.</p>
        <button className="button button-outline" onClick={() => setEditCat(null)}>
          <Plus size={16} />
          Nova categoria
        </button>
      </div>
      {editCat !== undefined ? (
        <section className="admin-panel">
          <div className="panel-heading">
            <h2>{editCat ? 'Editar categoria' : 'Nova categoria'}</h2>
            <button
              className="icon-button"
              aria-label="Fechar"
              onClick={() => setEditCat(undefined)}
            >
              <X />
            </button>
          </div>
          <CategoryForm
            key={editCat?.id ?? 'new'}
            category={editCat ?? undefined}
            busy={mutation.isPending}
            onSave={(v) =>
              action(
                `/admin/editions/${id}/categories${editCat ? `/${editCat.id}` : ''}`,
                v,
                editCat ? 'PATCH' : 'POST',
              )
            }
          />
        </section>
      ) : (
        categories.data?.map((c) => (
          <div className="admin-list-row" key={c.id}>
            <span className="outline-number">{String(c.display_order + 1).padStart(2, '0')}</span>
            <div>
              <h3>
                {c.name}
                {c.archived ? ' · Arquivada' : ''}
              </h3>
              <p>
                {c.max_nominees} indicados · {c.max_nominations} indicação(ões) ·{' '}
                {c.vote_required ? 'Obrigatória' : 'Opcional'}
              </p>
            </div>
            <button className="text-link" onClick={() => setEditCat(c)}>
              Editar
              <ArrowUpRight size={16} />
            </button>
            <button
              className="icon-button"
              aria-label={`Excluir ${c.name}`}
              onClick={() => {
                if (confirm(`Excluir a categoria ${c.name}?`))
                  action(`/admin/editions/${id}/categories/${c.id}`, undefined, 'DELETE');
              }}
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))
      )}
    </>
  );
}
