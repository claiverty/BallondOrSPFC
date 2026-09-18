import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    'create schema auth;create table auth.users(id uuid primary key,aud text,role text,email text,created_at timestamptz,updated_at timestamptz);create role anon;create role authenticated;',
  );
  await db.exec(await readFile('supabase/migrations/001_platform.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/003_submission_invariants.sql', 'utf8'));
});
afterAll(async () => {
  await db.close();
});
async function fixture() {
  const edition = crypto.randomUUID(),
    category = crypto.randomUUID(),
    other = crypto.randomUUID(),
    user = crypto.randomUUID(),
    nominee = crypto.randomUUID();
  const discord = String(900000000000000000n + BigInt(Math.floor(Math.random() * 1000000000)));
  await db.query('insert into auth.users(id) values($1)', [user]);
  await db.query(
    "insert into awards.profiles(id,discord_user_id,username,display_name) values($1,$2,'test','Test')",
    [user, discord],
  );
  await db.query(
    "insert into awards.editions(id,name,slug,year,status,voting_open_at,voting_close_at) values($1,'Test',$2,2027,'VOTING_OPEN',now()-interval '1 day',now()+interval '1 day')",
    [edition, edition],
  );
  await db.query(
    "insert into awards.categories(id,edition_id,name,slug) values($1,$2,'Test','test'),($3,$2,'Other','other')",
    [category, edition, other],
  );
  await db.query(
    "insert into awards.members(id,discord_user_id,username,display_name) values($1,$2,'nominee','Nominee')",
    [nominee, String(BigInt(discord) + 100000000000n)],
  );
  await db.query(
    'insert into awards.category_nominees(category_id,edition_id,nominee_id) values($1,$2,$3),($4,$2,$3)',
    [category, edition, nominee, other],
  );
  return { edition, category, other, user, nominee };
}
async function ballot(f: Awaited<ReturnType<typeof fixture>>) {
  return db.transaction(async (c) => {
    const id = crypto.randomUUID();
    await c.query(
      "insert into awards.ballots(id,edition_id,user_id,idempotency_key,payload_hash) values($1,$2,$3,$4,'hash')",
      [id, f.edition, f.user, crypto.randomUUID()],
    );
    await c.query(
      'insert into awards.ballot_items(ballot_id,edition_id,category_id,nominee_id) values($1,$2,$3,$4),($1,$2,$5,$4)',
      [id, f.edition, f.category, f.nominee, f.other],
    );
    return id;
  });
}
describe('PostgreSQL constraints and RLS', () => {
  it('stores a complete ballot and blocks a second participation', async () => {
    const f = await fixture();
    await ballot(f);
    await expect(ballot(f)).rejects.toThrow(/unique/i);
  });
  it('rejects partial ballots at transaction commit and rolls back everything', async () => {
    const f = await fixture();
    await expect(
      db.transaction(async (c) => {
        const id = crypto.randomUUID();
        await c.query(
          "insert into awards.ballots(id,edition_id,user_id,idempotency_key,payload_hash) values($1,$2,$3,$4,'hash')",
          [id, f.edition, f.user, crypto.randomUUID()],
        );
        await c.query(
          'insert into awards.ballot_items(ballot_id,edition_id,category_id,nominee_id) values($1,$2,$3,$4)',
          [id, f.edition, f.category, f.nominee],
        );
      }),
    ).rejects.toThrow(/incomplete/i);
    const { rows } = await db.query<{ count: number }>(
      'select count(*)::int count from awards.ballots where edition_id=$1',
      [f.edition],
    );
    expect(rows[0].count).toBe(0);
  });
  it('rejects cross-edition category/nominee relationships', async () => {
    const f = await fixture(),
      g = await fixture();
    await expect(
      db.transaction(async (c) => {
        const id = crypto.randomUUID();
        await c.query(
          "insert into awards.ballots(id,edition_id,user_id,idempotency_key,payload_hash) values($1,$2,$3,$4,'hash')",
          [id, f.edition, f.user, crypto.randomUUID()],
        );
        await c.query(
          'insert into awards.ballot_items(ballot_id,edition_id,category_id,nominee_id) values($1,$2,$3,$4)',
          [id, f.edition, g.category, g.nominee],
        );
      }),
    ).rejects.toThrow(/foreign key/i);
  });
  it('prevents edits to confirmed ballots', async () => {
    const f = await fixture();
    const id = await ballot(f);
    await expect(
      db.query("update awards.ballots set payload_hash='changed' where id=$1", [id]),
    ).rejects.toThrow(/immutable/i);
    await expect(
      db.query('delete from awards.ballot_items where ballot_id=$1', [id]),
    ).rejects.toThrow(/immutable/i);
  });
  it('enables RLS on every platform table', async () => {
    const { rows } = await db.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='awards' and relkind='r'",
    );
    expect(rows.length).toBeGreaterThan(10);
    expect(rows.every((r) => r.relrowsecurity)).toBe(true);
  });
  it('denies authenticated and anonymous direct access to ballots and results', async () => {
    for (const role of ['anon', 'authenticated'])
      await expect(
        db.transaction(async (c) => {
          await c.exec(`set local role ${role}`);
          await c.query('select * from awards.ballot_items');
        }),
      ).rejects.toThrow(/permission denied/i);
  });
  it('blocks phase skipping in SQL', async () => {
    const f = await fixture();
    await expect(
      db.query("update awards.editions set status='RESULTS_PUBLISHED' where id=$1", [f.edition]),
    ).rejects.toThrow(/transition/i);
  });
  it('blocks duplicate nomination slots for a category/user', async () => {
    const f = await fixture();
    const n = crypto.randomUUID();
    await db.query(
      "insert into awards.editions(id,name,slug,year,status,nominations_open_at,nominations_close_at) values($1,'Nominations',$2,2027,'NOMINATIONS_OPEN',now()-interval '1 day',now()+interval '1 day')",
      [n, n],
    );
    await db.query(
      "insert into awards.categories(edition_id,name,slug) values($1,'Nomination','n')",
      [n],
    );
    const categories = await db.query<{ id: string }>(
      'select id from awards.categories where edition_id=$1',
      [n],
    );
    f.edition = n;
    f.category = categories.rows[0].id;
    await db.query(
      'insert into awards.nomination_items(edition_id,category_id,nominator_user_id,slot,member_id) values($1,$2,$3,0,$4)',
      [f.edition, f.category, f.user, f.nominee],
    );
    await expect(
      db.query(
        "insert into awards.nomination_items(edition_id,category_id,nominator_user_id,slot,manual_name) values($1,$2,$3,0,'Other')",
        [f.edition, f.category, f.user],
      ),
    ).rejects.toThrow(/unique/i);
  });
  it('validates the development seed including mock users, atomic ballots and historical snapshots', async () => {
    await db.transaction(async (c) =>
      c.exec(await readFile('supabase/seed/development.sql', 'utf8')),
    );
    const { rows } = await db.query<{ count: number }>(
      "select count(*)::int count from awards.ballots where edition_id='10000000-0000-4000-8000-000000000002'",
    );
    expect(rows[0].count).toBe(3);
    expect(
      (
        await db.query<{ status: string }>(
          "select status from awards.editions where slug='dev-history'",
        )
      ).rows[0].status,
    ).toBe('ARCHIVED');
  });
});
