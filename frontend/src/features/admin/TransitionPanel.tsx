import type { AdminContext } from './types';
import { ArrowUpRight } from 'lucide-react';
import { phaseLabels } from '@awards/contracts';
export function TransitionPanel({
  id,
  next,
  reason,
  setReason,
  mutation,
  action,
}: Pick<AdminContext, 'id' | 'next' | 'reason' | 'setReason' | 'mutation' | 'action'>) {
  return (
    <section className="admin-panel">
      <h2>Próxima etapa</h2>
      <p>
        As mudanças de fase são sequenciais e auditadas. A API valida os pré-requisitos antes de
        avançar.
      </p>
      {next ? (
        <>
          <label>
            Motivo da mudança
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva a decisão administrativa"
            />
          </label>
          <button
            className="button"
            disabled={reason.trim().length < 3 || mutation.isPending}
            onClick={() => action(`/admin/editions/${id}/transition`, { status: next, reason })}
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
