import type { AdminContext } from './types';
import { ArrowUpRight, GripVertical, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CategoryForm } from '../AdminForms';
export function CategoriesPanel({
  id,
  categories,
  mutation,
  action,
  editCat,
  setEditCat,
}: Pick<AdminContext, 'id' | 'categories' | 'mutation' | 'action' | 'editCat' | 'setEditCat'>) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [previewOrder, setPreviewOrder] = useState<string[]>([]);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const previousPositions = useRef(new Map<string, DOMRect>());
  const previewOrderRef = useRef<string[]>([]);
  const sourceCategories = categories.data ?? [];
  const orderedCategories = useMemo(() => {
    const categoriesById = new Map(sourceCategories.map((category) => [category.id, category]));
    if (
      previewOrder.length !== sourceCategories.length ||
      previewOrder.some((categoryId) => !categoriesById.has(categoryId))
    )
      return sourceCategories;
    return previewOrder.map((categoryId) => categoriesById.get(categoryId)!);
  }, [previewOrder, sourceCategories]);

  useEffect(() => {
    const order = sourceCategories.map((category) => category.id);
    previewOrderRef.current = order;
    setPreviewOrder(order);
  }, [categories.data]);

  useLayoutEffect(() => {
    const nextPositions = new Map<string, DOMRect>();
    orderedCategories.forEach((category) => {
      const card = cardRefs.current.get(category.id);
      if (card) nextPositions.set(category.id, card.getBoundingClientRect());
    });

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      previousPositions.current.forEach((previousPosition, categoryId) => {
        const nextPosition = nextPositions.get(categoryId);
        const card = cardRefs.current.get(categoryId);
        if (!card || !nextPosition) return;

        const distance = previousPosition.top - nextPosition.top;
        if (!distance) return;
        card.getAnimations().forEach((animation) => animation.cancel());
        card.animate(
          [
            { transform: `translateY(${distance}px)` },
            { transform: 'translateY(0)' },
          ],
          { duration: 360, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        );
      });
    }

    previousPositions.current = nextPositions;
  }, [orderedCategories]);

  const movePreview = (targetId: string, pointerY: number, targetElement: HTMLDivElement) => {
    if (!draggedId || draggedId === targetId) return;

    setPreviewOrder((current) => {
      const order = current.length === sourceCategories.length
        ? [...current]
        : sourceCategories.map((category) => category.id);
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
    const order = previewOrderRef.current;
    if (
      order.length !== sourceCategories.length ||
      order.every((categoryId, index) => categoryId === sourceCategories[index]?.id)
    )
      return;
    action(`/admin/editions/${id}/categories/reorder`, { category_ids: order }, 'PATCH');
  };

  return (
    <>
      <div className="panel-heading">
        <p>
          Categorias e regras são editáveis na preparação. A ordem pode ser reorganizada a qualquer
          momento.
        </p>
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
        orderedCategories.map((c, index) => (
          <div
            className={`admin-list-row category-arrange-row${draggedId === c.id ? ' is-dragging' : ''}`}
            key={c.id}
            ref={(element) => {
              if (element) cardRefs.current.set(c.id, element);
              else cardRefs.current.delete(c.id);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              movePreview(c.id, event.clientY, event.currentTarget);
            }}
            onDrop={() => {
              if (draggedId) savePreviewOrder();
              setDraggedId(null);
            }}
          >
            <span className="outline-number">{String(index + 1).padStart(2, '0')}</span>
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
            <button
              className="icon-button category-drag-handle"
              aria-label={`Arrastar ${c.name} para mudar a ordem`}
              draggable={!mutation.isPending}
              disabled={mutation.isPending}
              onDragStart={() => setDraggedId(c.id)}
              onDragEnd={() => setDraggedId(null)}
              title="Arraste para reordenar."
            >
              <GripVertical size={19} aria-hidden="true" />
            </button>
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
