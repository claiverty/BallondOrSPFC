import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { readFile } from 'node:fs/promises';
import { BallotsService } from '../backend/src/ballots/ballots';
import type { Database } from '../backend/src/common/database';
import type { DiscordService } from '../backend/src/discord/discord';
import type { Identity } from '@awards/contracts';
const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)('Real PostgreSQL independent connection concurrency', () => {
  let pool: Pool, service: BallotsService, edition: string, category: string, nominee: string;
  beforeAll(async () => {
    if (!url || new URL(url).pathname !== '/awards_test')
      throw new Error('Use only the isolated awards_test database.');
    pool = new Pool({ connectionString: url, max: 5, ssl: false });
    await pool.query(
      'create schema auth;create table auth.users(id uuid primary key);create role anon;create role authenticated;',
    );
    for (const file of ['001_platform.sql', '003_submission_invariants.sql', '006_rls_hardening.sql'])
      await pool.query(await readFile(`supabase/migrations/${file}`, 'utf8'));
    const db = {
      transaction: async <T>(fn: (c: import('pg').PoolClient) => Promise<T>) => {
        const c = await pool.connect();
        try {
          await c.query('begin');
          const result = await fn(c);
          await c.query('commit');
          return result;
        } catch (e) {
          await c.query('rollback');
          throw e;
        } finally {
          c.release();
        }
      },
    } as Database;
    const discord = { eligible: async () => ({}) } as unknown as DiscordService;
    service = new BallotsService(db, discord);
    edition = crypto.randomUUID();
    category = crypto.randomUUID();
    nominee = crypto.randomUUID();
    await pool.query(
      "insert into awards.editions(id,name,slug,year,status,voting_open_at,voting_close_at) values($1,'Concurrency','concurrency',2027,'VOTING_OPEN',now()-interval '1 day',now()+interval '1 day')",
      [edition],
    );
    await pool.query(
      "insert into awards.categories(id,edition_id,name,slug) values($1,$2,'Category','category')",
      [category, edition],
    );
    await pool.query(
      "insert into awards.members(id,discord_user_id,username,display_name) values($1,'123456789012345678','test','Test')",
      [nominee],
    );
    await pool.query(
      'insert into awards.category_nominees(category_id,edition_id,nominee_id) values($1,$2,$3)',
      [category, edition, nominee],
    );
  });
  afterAll(async () => pool?.end());
  async function user(): Promise<Identity> {
    const id = crypto.randomUUID();
    const discord = String(900000000000000000n + BigInt(Math.floor(Math.random() * 1000000000)));
    await pool.query('insert into auth.users(id) values($1)', [id]);
    await pool.query(
      "insert into awards.profiles(id,discord_user_id,username,display_name) values($1,$2,'test','Test')",
      [id, discord],
    );
    return { id, discord_user_id: discord, display_name: 'Test', role: 'user', avatar_url: null };
  }
  function ballot() {
    return {
      edition_id: edition,
      idempotency_key: crypto.randomUUID(),
      items: [{ category_id: category, nominee_id: nominee }],
    };
  }
  it('accepts exactly one simultaneous participation across separate connections', async () => {
    const identity = await user();
    const results = await Promise.allSettled([
      service.submit(identity, ballot()),
      service.submit(identity, ballot()),
      service.submit(identity, ballot()),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(2);
    const { rows } = await pool.query(
      'select count(*)::int count from awards.ballots where user_id=$1',
      [identity.id],
    );
    expect(rows[0].count).toBe(1);
  });
  it('returns the same receipt for concurrent idempotent retries', async () => {
    const identity = await user(),
      payload = ballot();
    const [a, b] = await Promise.all([
      service.submit(identity, payload),
      service.submit(identity, payload),
    ]);
    expect(a.id).toBe(b.id);
  });
  it('serializes edition closing against a pending submission', async () => {
    const identity = await user(),
      c = await pool.connect();
    await c.query('begin');
    await c.query('select id from awards.editions where id=$1 for update', [edition]);
    const result = service.submit(identity, ballot()).then(
      () => false,
      () => true,
    );
    await c.query("update awards.editions set status='VOTING_CLOSED' where id=$1", [edition]);
    await c.query('commit');
    c.release();
    expect(await result).toBe(true);
    const { rows } = await pool.query(
      'select count(*)::int count from awards.ballots where user_id=$1',
      [identity.id],
    );
    expect(rows[0].count).toBe(0);
  });
});
