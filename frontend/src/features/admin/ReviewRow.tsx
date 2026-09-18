import { useState } from 'react';
import { Check, X } from 'lucide-react';
import type { Nomination } from '@awards/contracts';
export function ReviewRow({
  nomination: n,
  reason,
  onAction,
}: {
  nomination: Nomination;
  reason: string;
  onAction: (b: unknown) => void;
}) {
  const [discord, setDiscord] = useState(n.discord_user_id ?? '');
  return (
    <div className="review-row">
      <div>
        <strong>{n.display_name ?? n.manual_name}</strong>
        <small>
          {n.category_name} · {n.count ?? 1} indicação(ões) · {n.status}
        </small>
      </div>
      {!n.member_id && (
        <label>
          Discord ID
          <input value={discord} onChange={(e) => setDiscord(e.target.value)} />
        </label>
      )}
      <button
        className="text-link"
        disabled={reason.trim().length < 3}
        onClick={() =>
          onAction({ status: 'approved', discord_user_id: discord || undefined, reason })
        }
      >
        <Check size={16} />
        Aprovar
      </button>
      <button
        className="text-link danger"
        disabled={reason.trim().length < 3}
        onClick={() => onAction({ status: 'rejected', reason })}
      >
        <X size={16} />
        Rejeitar
      </button>
    </div>
  );
}
