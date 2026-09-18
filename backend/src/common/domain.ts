import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Category, Edition, isOpen } from '@awards/contracts';
import { PoolClient } from 'pg';
export async function lockEdition(c: PoolClient, id: string, write = false): Promise<Edition> {
  const { rows } = await c.query<Edition>(
    `select * from awards.editions where id=$1 for ${write ? 'update' : 'share'}`,
    [id],
  );
  if (!rows[0]) throw new NotFoundException('Edição não encontrada.');
  return rows[0];
}
export function requireOpen(e: Edition, kind: 'nominations' | 'voting') {
  if (!isOpen(e, kind))
    throw new ConflictException(
      kind === 'voting' ? 'A votação não está aberta.' : 'As indicações não estão abertas.',
    );
}
export function requireDraft(e: Edition) {
  if (e.status !== 'DRAFT')
    throw new ConflictException(
      'Categorias e regras só podem ser alteradas antes de abrir a edição.',
    );
}
export async function category(c: PoolClient, id: string, edition: string): Promise<Category> {
  const { rows } = await c.query<Category>(
    'select * from awards.categories where id=$1 and edition_id=$2 and not archived',
    [id, edition],
  );
  if (!rows[0]) throw new BadRequestException('Categoria inválida para esta edição.');
  return rows[0];
}
export async function audit(
  c: PoolClient,
  actor: string,
  edition: string,
  action: string,
  entity: string,
  reason: string,
  details: unknown = {},
) {
  await c.query(
    'insert into awards.audit_logs(actor_id,edition_id,action,entity_id,reason,details) values($1,$2,$3,$4,$5,$6)',
    [actor, edition, action, entity, reason, JSON.stringify(details)],
  );
}
