import { BadRequestException } from '@nestjs/common';
import { CreateEditionSchema, CreateCategorySchema } from '@awards/contracts';
import { PoolClient } from 'pg';
const editableColumns = new Set([
  ...Object.keys(CreateEditionSchema.shape),
  ...Object.keys(CreateCategorySchema.shape),
]);
export async function writeData(
  c: PoolClient,
  table: 'editions' | 'categories',
  data: Record<string, unknown>,
  id?: string,
  edition?: string,
) {
  const entries = Object.entries(data);
  if (entries.some(([key]) => !editableColumns.has(key)))
    throw new BadRequestException('Campo inválido.');
  const keys = entries.map(([k]) => k);
  const values = entries.map(([, v]) =>
    typeof v === 'object' && v !== null ? JSON.stringify(v) : v,
  );
  if (id) {
    return (
      await c.query(
        `update awards.${table} set ${keys.map((k, i) => `${k}=$${i + 1}`).join(',')} where id=$${keys.length + 1} returning *`,
        [...values, id],
      )
    ).rows[0];
  }
  if (edition) {
    keys.push('edition_id');
    values.push(edition);
  }
  return (
    await c.query(
      `insert into awards.${table}(${keys.join(',')}) values(${values.map((_, i) => `$${i + 1}`).join(',')}) returning *`,
      values,
    )
  ).rows[0];
}
