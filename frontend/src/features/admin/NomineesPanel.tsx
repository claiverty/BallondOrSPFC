import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { AdminContext } from './types';
import { GripVertical, Trash2 } from 'lucide-react';
import { demoMode } from '../../lib/auth';
import { MemberSearch } from '../../components/MemberSearch';
import { AdminPicker } from './AdminPicker';

export function NomineesPanel({
  id,
  categories,
  reason,
  setReason,
  action,
  mutation,
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
  | 'mutation'
  | 'category'
  | 'setCategoryId'
  | 'setMessage'
>) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [previewOrder, setPreviewOrder] = useState<string[]>([]);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const previousPositions = useRef(new Map<string, DOMRect>());
  const previewOrderRef = useRef<string[]>([]);
  const sourceNominees = category?.nominees ?? [];
  const orderedNominees = useMemo(() => {
    const nomineesById = new Map(sourceNominees.map((nominee) => [nominee.id, nominee]));
    if (
      previewOrder.length !== sourceNominees.length ||
      previewOrder.some((nomineeId) => !nomineesById.has(nomineeId))
    )
      return sourceNominees;
    return previewOrder.map((nomineeId) => nomineesById.get(nomineeId)!);
  }, [previewOrder, sourceNominees]);

  useEffect(() => {
    const order = sourceNominees.map((nominee) => nominee.id);
    previewOrderRef.current = order;
    setPreviewOrder(order);
  }, [category?.id, category?.nominees]);

  useLayoutEffect(() => {
    const nextPositions = new Map<string, DOMRect>();
    orderedNominees.forEach((nominee) => {
      const card = cardRefs.current.get(nominee.id);
      if (card) nextPositions.set(nominee.id, card.getBoundingClientRect());
    });

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      previousPositions.current.forEach((previousPosition, nomineeId) => {
        const nextPosition = nextPositions.get(nomineeId);
        const card = cardRefs.current.get(nomineeId);
        if (!card || !nextPosition) return;
        const distance = previousPosition.top - nextPosition.top;
        if (!distance) return;
        card.getAnimations().forEach((animation) => animation.cancel());
        card.animate(
          [{ transform: `translateY(${distance}px)` }, { transform: 'translateY(0)' }],
          { duration: 360, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        );
      });
    }
    previousPositions.current = nextPositions;
  }, [orderedNominees]);

  const movePreview = (targetId: string, pointerY: number, targetElement: HTMLDivElement) => {
    if (!draggedId || draggedId === targetId) return;
    setPreviewOrder((current) => {
      const order =
        current.length === sourceNominees.length
          ? [...current]
          : sourceNominees.map((nominee) => nominee.id);
      const sourceIndex = order.indexOf(draggedId);
      const targetIndex = order.indexOf(targetId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return current;
      const targetBounds = targetElement.getBoundingClientRect();
      const crossedTargetMiddle = pointerY - targetBounds.top > targetBounds.height / 2;
      if (
        (sourceIndex < targetIndex && !crossedTargetMiddle) ||
        (sourceIndex > targetIndex && crossedTargetMiddle)
      )
        return current;
      order.splice(sourceIndex, 1);
      order.splice(targetIndex, 0, draggedId);
      previewOrderRef.current = order;
      return order;
    });
  };

  const savePreviewOrder = () => {
    if (!category) return;
    const order = previewOrderRef.current;
    const original = sourceNominees.map((nominee) => nominee.id);
    if (
      order.length !== original.length ||
      order.every((nomineeId, index) => nomineeId === original[index])
    )
      return;
    if (reason.trim().length < 3) {
      setMessage('Informe o motivo antes de salvar a nova ordem.');
      previewOrderRef.current = original;
      setPreviewOrder(original);
      return;
    }
    if (demoMode) return;
    action(
      `/admin/editions/${id}/categories/${category.id}/nominees/reorder`,
      { nominee_ids: order, reason },
      'PATCH',
    );
  };

  const moveByKeyboard = (nomineeId: string, direction: -1 | 1) => {
    const order =
      previewOrderRef.current.length === sourceNominees.length
        ? [...previewOrderRef.current]
        : sourceNominees.map((nominee) => nominee.id);
    const index = order.indexOf(nomineeId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return;
    [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
    previewOrderRef.current = order;
    setPreviewOrder(order);
    savePreviewOrder();
  };

  return (
    <section className="admin-panel">
      <p>
        Escolha manualmente os indicados que avançarão para a votação. A quantidade de indicações
        serve como referência, mas a classificação final é administrativa.
      </p>
      <AdminPicker
        label="Categoria"
        value={category?.id ?? ''}
        options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
        onChange={setCategoryId}
      />
      <label>
        Motivo da classificação
        <input value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <MemberSearch
        onSelect={(m) => {
          if (reason.trim().length < 3) {
            setMessage('Informe o motivo antes de classificar um indicado.');
            return;
          }
          action(`/admin/editions/${id}/categories/${category?.id}/nominees`, {
            discord_user_id: m.discord_user_id,
            display_order: category?.nominees.length ?? 0,
            reason,
          });
        }}
      />
      {category && category.nominees.length > 0 && (
        <section className="nominee-classification-list" aria-label="Indicados classificados">
          <div className="nominee-classification-heading">
            <div>
              <span>Indicados classificados</span>
              <strong>
                {category.nominees.length} de {category.max_nominees}
              </strong>
            </div>
            <small>Arraste para ordenar na votação</small>
          </div>
          {orderedNominees.map((n, index) => (
            <div
              className={`nominee-classification-row${draggedId === n.id ? ' is-dragging' : ''}`}
              key={n.id}
              ref={(element) => {
                if (element) cardRefs.current.set(n.id, element);
                else cardRefs.current.delete(n.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                movePreview(n.id, event.clientY, event.currentTarget);
              }}
              onDrop={() => {
                if (draggedId) savePreviewOrder();
                setDraggedId(null);
              }}
            >
              <div className="nominee-classification-person">
                <span className="nominee-classification-rank">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {n.avatar_url ? (
                  <img src={n.avatar_url} alt="" className="nominee-classification-avatar" />
                ) : (
                  <span className="nominee-classification-avatar nominee-classification-fallback">
                    {n.display_name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span>
                  <strong>{n.display_name}</strong>
                  <small>@{n.username}</small>
                </span>
              </div>
              <button
                className="icon-button category-drag-handle"
                aria-label={`Arrastar ${n.display_name} para mudar a ordem`}
                draggable={!mutation.isPending}
                disabled={mutation.isPending}
                onDragStart={() => setDraggedId(n.id)}
                onDragEnd={() => setDraggedId(null)}
                onKeyDown={(event) => {
                  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
                  event.preventDefault();
                  moveByKeyboard(n.id, event.key === 'ArrowUp' ? -1 : 1);
                }}
                aria-keyshortcuts="ArrowUp ArrowDown"
                title="Arraste para reordenar."
              >
                <GripVertical size={18} aria-hidden="true" />
              </button>
              <button
                className="icon-button nominee-remove-button"
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
      )}
    </section>
  );
}
