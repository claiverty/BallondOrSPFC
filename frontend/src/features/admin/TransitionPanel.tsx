import type { AdminContext } from './types';
import { ArrowUpRight } from 'lucide-react';
import { phaseLabels } from '@awards/contracts';
export function TransitionPanel({
  id,
  next,
  mutation,
  action,
}: Pick<AdminContext, 'id' | 'next' | 'mutation' | 'action'>) {
  return (
    <section className="admin-panel">
      <h2>Próxima etapa</h2>
      <p>
        As mudanças de fase são sequenciais e auditadas. A API valida os pré-requisitos antes de
        avançar.
      </p>
      {next ? (
        <>
          <button
            className="button"
            disabled={mutation.isPending}
            onClick={() =>
              action(`/admin/editions/${id}/transition`, {
                status: next,
                reason: `Avanço administrativo: ${phaseLabels[next]}`,
              })
            }
          >
            Avançar: {phaseLabels[next]}
            <ArrowUpRight size={17} />
          </button>
        </>
      ) : (
        <p>Esta edição está arquivada.</p>
      )}
    </section>
  );
}
