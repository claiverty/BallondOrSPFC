import { loadEnvFile } from 'node:process';
try {
  loadEnvFile('backend/.env');
} catch {
  /* Environment can also be set by the caller. */
}
import { Pool } from 'pg';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { databaseSsl } from './common/database-ssl';
async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error('Configure DATABASE_URL de staging/desenvolvimento.');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: databaseSsl(process.env.DATABASE_SSL !== 'false'),
    max: 1,
  });
  const c = await pool.connect();
  try {
    await c.query('select pg_advisory_lock(4282026)');
    await c.query(
      'create table if not exists public.awards_migrations(name text primary key,applied_at timestamptz default now())',
    );
    const seed = process.argv.includes('--seed');
    const dir = resolve('supabase', seed ? 'seed' : 'migrations');
    for (const name of (await readdir(dir)).filter((n) => n.endsWith('.sql')).sort()) {
      const key = seed ? `seed/${name}` : name;
      if (
        (await c.query('select name from public.awards_migrations where name=$1', [key])).rowCount
      )
        continue;
      await c.query('begin');
      try {
        await c.query(await readFile(resolve(dir, name), 'utf8'));
        await c.query('insert into public.awards_migrations(name) values($1)', [key]);
        await c.query('commit');
        console.log(`Aplicado: ${key}`);
      } catch (e) {
        await c.query('rollback');
        throw e;
      }
    }
  } finally {
    await c.query('select pg_advisory_unlock(4282026)');
    c.release();
    await pool.end();
  }
}
main().catch((error: unknown) => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : 'unknown';

  console.error(
    `Migração não concluída (${code}). Revise o banco/configuração; nenhuma migration parcial foi aplicada.`,
  );
  process.exit(1);
});
