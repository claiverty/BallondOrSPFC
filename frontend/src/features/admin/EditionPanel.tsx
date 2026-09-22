import type { AdminContext } from './types';
import { Copy, Trash2 } from 'lucide-react';
import { EditionForm } from '../AdminForms';
export function EditionPanel({
  edition,
  id,
  mutation,
  action,
  setDuplicate,
  deleteEdition,
}: Pick<
  AdminContext,
  'edition' | 'id' | 'mutation' | 'action' | 'setDuplicate' | 'deleteEdition'
>) {
  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <h2>Configuração da edição</h2>
        <div className="panel-heading-actions">
          <button className="text-link" onClick={() => setDuplicate(true)}>
            <Copy size={16} />
            Duplicar para o próximo ano
          </button>
          {deleteEdition && (
            <button
              className="text-link danger"
              onClick={deleteEdition}
              disabled={mutation.isPending}
            >
              <Trash2 size={16} />
              Excluir edição
            </button>
          )}
        </div>
      </div>
      <EditionForm
        key={id}
        edition={edition}
        busy={mutation.isPending}
        onSave={(v) => action(`/admin/editions/${id}`, v, 'PATCH')}
      />
    </section>
  );
}
