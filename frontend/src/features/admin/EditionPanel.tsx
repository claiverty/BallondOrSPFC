import type { AdminContext } from './types';
import { Copy } from 'lucide-react';
import { EditionForm } from '../AdminForms';
export function EditionPanel({
  edition,
  id,
  mutation,
  action,
  setDuplicate,
}: Pick<AdminContext, 'edition' | 'id' | 'mutation' | 'action' | 'setDuplicate'>) {
  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <h2>Configuração da edição</h2>
        <button className="text-link" onClick={() => setDuplicate(true)}>
          <Copy size={16} />
          Duplicar para o próximo ano
        </button>
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
