import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { PGlite } from '@electric-sql/pglite';
import { PoolClient } from 'pg';
import { readFile } from 'node:fs/promises';
import type { User } from '@supabase/supabase-js';
import type { Identity } from '@awards/contracts';
import { Database } from '../backend/src/common/database';
import { ErrorFilter } from '../backend/src/common/errors';
import { AuthGuard } from '../backend/src/auth/auth';
import { DiscordService } from '../backend/src/discord/discord';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
let app: NestFastifyApplication,
  db: PGlite,
  tokenUser: User,
  eligible = true;
let edition: string, cat: string, nominee: string, discord: string, profile: string;
const query = async <T extends Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  (await db.query<T>(sql, params)).rows;
beforeAll(async () => {
  Object.assign(process.env, {
    DATABASE_URL: 'postgresql://test:test@localhost/test',
    DATABASE_SSL: 'false',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    DISCORD_BOT_TOKEN: 'test-bot-token',
    DISCORD_GUILD_ID: '123456789012345678',
    WEB_ORIGIN: 'http://localhost:5173',
  });
  db = new PGlite();
  await db.exec(
    'create schema auth;create table auth.users(id uuid primary key);create role anon;create role authenticated;',
  );
  await db.exec(await readFile('supabase/migrations/001_platform.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/003_submission_invariants.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/005_allow_edition_deletion.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/006_rls_hardening.sql', 'utf8'));
  let pending = Promise.resolve();
  const bridge = {
    query,
    transaction: async <T>(fn: (c: PoolClient) => Promise<T>) => {
      let release!: () => void;
      const prior = pending;
      pending = new Promise<void>((r) => {
        release = r;
      });
      await prior;
      try {
        return await db.transaction(async (tx) => {
          const c = {
            query: async (sql: string, params: unknown[] = []) => {
              const r = await tx.query(sql, params);
              return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length };
            },
          } as unknown as PoolClient;
          return fn(c);
        });
      } finally {
        release();
      }
    },
  };
  const { AppModule } = await import('../backend/src/app');
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(Database)
    .useValue(bridge)
    .overrideProvider(DiscordService)
    .useValue({
      eligible: async () => {
        if (!eligible)
          throw new (await import('@nestjs/common')).ForbiddenException('Membro inelegível.');
        return {
          user: { id: discord, username: 'candidate' },
          roles: [],
          joined_at: '2025-01-01T00:00:00Z',
        };
      },
      member: async (id: string) => ({
        user: { id, username: 'candidate' },
        roles: [],
        joined_at: '2025-01-01T00:00:00Z',
      }),
    })
    .compile();
  app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
    logger: false,
  });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new ErrorFilter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const guards = module.get(AuthGuard, { each: true });
  for (const instance of guards) {
    const guard = instance as unknown as {
      supabase: {
        auth: {
          getUser: (token: string) => Promise<{ data: { user: User | null }; error: unknown }>;
        };
      };
    };
    vi.spyOn(guard.supabase.auth, 'getUser').mockImplementation(async (token) => ({
      data: { user: token === 'valid' ? tokenUser : null },
      error: token === 'valid' ? null : new Error('invalid'),
    }));
  }
});
afterAll(async () => {
  await app?.close();
  await db?.close();
});
beforeEach(async () => {
  eligible = true;
  edition = crypto.randomUUID();
  cat = crypto.randomUUID();
  nominee = crypto.randomUUID();
  profile = crypto.randomUUID();
  discord = String(900000000000000000n + BigInt(Math.floor(Math.random() * 1000000000)));
  tokenUser = {
    id: profile,
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    app_metadata: { provider: 'discord' },
    user_metadata: { provider_id: '111111111111111111' },
    identities: [
      {
        id: discord,
        identity_id: crypto.randomUUID(),
        user_id: profile,
        provider: 'discord',
        identity_data: { sub: discord, name: 'Test user' },
      },
    ],
  };
  await db.query('insert into auth.users(id) values($1)', [profile]);
  await db.query(
    "insert into awards.editions(id,name,slug,year,status,nominations_open_at,nominations_close_at,voting_open_at,voting_close_at) values($1,'API test',$2,2027,'VOTING_OPEN',now()-interval '1 day',now()+interval '1 day',now()-interval '1 day',now()+interval '1 day')",
    [edition, edition],
  );
  await db.query(
    "insert into awards.categories(id,edition_id,name,slug) values($1,$2,'Category','category')",
    [cat, edition],
  );
  await db.query(
    "insert into awards.members(id,discord_user_id,username,display_name) values($1,$2,'candidate','Candidate')",
    [nominee, String(BigInt(discord) + 100000000000n)],
  );
  await db.query(
    'insert into awards.category_nominees(category_id,edition_id,nominee_id) values($1,$2,$3)',
    [cat, edition, nominee],
  );
});
const headers = { authorization: 'Bearer valid' };
const body = () => ({
  edition_id: edition,
  idempotency_key: crypto.randomUUID(),
  items: [{ category_id: cat, nominee_id: nominee }],
});
const post = (payload = body(), auth = true) =>
  app.inject({ method: 'POST', url: '/api/ballots', headers: auth ? headers : {}, payload });
async function admin() {
  await app.inject({ url: '/api/me', headers });
  await db.query("insert into awards.user_roles(user_id,role) values($1,'super_admin')", [profile]);
}
describe('Nest HTTP and transactional workflows', () => {
  it('blocks unauthenticated ballots', async () =>
    expect((await post(body(), false)).statusCode).toBe(401));
  it('blocks an invalid JWT', async () =>
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/ballots',
          headers: { authorization: 'Bearer invalid' },
          payload: body(),
        })
      ).statusCode,
    ).toBe(401));
  it('reads Discord ID from verified identity instead of editable metadata', async () => {
    const response = await app.inject({ url: '/api/me', headers });
    expect(response.statusCode).toBe(200);
    expect(response.json<Identity>().discord_user_id).toBe(discord);
  });
  it('blocks an ineligible user', async () => {
    eligible = false;
    expect((await post()).statusCode).toBe(403);
  });
  it('blocks closed voting', async () => {
    await db.query("update awards.editions set status='VOTING_CLOSED' where id=$1", [edition]);
    expect((await post()).statusCode).toBe(409);
  });
  it('blocks unknown nominee with no partial ballot', async () => {
    const payload = body();
    payload.items[0].nominee_id = crypto.randomUUID();
    expect((await post(payload)).statusCode).toBe(400);
    expect(
      (
        await query<{ count: number }>(
          'select count(*)::int count from awards.ballots where edition_id=$1',
          [edition],
        )
      )[0].count,
    ).toBe(0);
  });
  it('is idempotent only for identical key and choices', async () => {
    const payload = body();
    const a = await post(payload),
      b = await post(payload);
    expect(a.statusCode).toBe(201);
    expect(b.statusCode).toBe(201);
    expect(a.json().id).toBe(b.json().id);
    expect((await post()).statusCode).toBe(409);
  });
  it('accepts one ballot under simultaneous requests with different keys', async () => {
    const responses = await Promise.all([post(), post(), post()]);
    expect(responses.map((r) => r.statusCode).sort()).toEqual([201, 409, 409]);
    expect(
      (
        await query<{ count: number }>(
          'select count(*)::int count from awards.ballots where edition_id=$1',
          [edition],
        )
      )[0].count,
    ).toBe(1);
  });
  it('blocks ordinary user from admin analytics and does not leak provisional results', async () => {
    expect(
      (await app.inject({ url: `/api/admin/editions/${edition}/analytics`, headers })).statusCode,
    ).toBe(403);
    await post();
    const winners = await app.inject({ url: `/api/winners/${edition}` });
    expect(winners.json()).toEqual([]);
    const publicCats = (await app.inject({ url: `/api/editions/${edition}/categories` })).json();
    expect(JSON.stringify(publicCats)).not.toContain('votes_count');
    expect(JSON.stringify(publicCats)).not.toContain('blacklisted_discord_ids');
  });
  it('applies nomination phase, limits and stable member identity', async () => {
    const e = crypto.randomUUID();
    await db.query(
      "insert into awards.editions(id,name,slug,year,status,nominations_open_at,nominations_close_at) values($1,'Nomination test',$2,2027,'NOMINATIONS_OPEN',now()-interval '1 day',now()+interval '1 day')",
      [e, e],
    );
    const c = crypto.randomUUID();
    await db.query(
      "insert into awards.categories(id,edition_id,name,slug,max_nominations) values($1,$2,'Nomination','n',1)",
      [c, e],
    );
    const payload = {
      edition_id: e,
      category_id: c,
      items: [{ discord_user_id: String(BigInt(discord) + 200000000000n) }],
    };
    expect(
      (await app.inject({ method: 'POST', url: '/api/nominations', headers, payload })).statusCode,
    ).toBe(201);
    const mine = (await app.inject({ url: `/api/nominations/me?edition_id=${e}`, headers })).json();
    expect(mine[0].discord_user_id).toBe(payload.items[0].discord_user_id);
    expect(
      (await app.inject({ method: 'POST', url: '/api/nominations', headers, payload })).statusCode,
    ).toBe(409);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/nominations',
          headers,
          payload: {
            ...payload,
            items: [...payload.items, { discord_user_id: String(BigInt(discord) + 300000000000n) }],
          },
        })
      ).statusCode,
    ).toBe(403);
    await db.query("update awards.editions set status='NOMINATIONS_REVIEW' where id=$1", [e]);
    expect(
      (await app.inject({ method: 'POST', url: '/api/nominations', headers, payload })).statusCode,
    ).toBe(409);
  });
  it('prevents self-nomination and ineligible candidates', async () => {
    const e = crypto.randomUUID(),
      c = crypto.randomUUID();
    await db.query(
      "insert into awards.editions(id,name,slug,year,status,nominations_open_at,nominations_close_at) values($1,'Self test',$2,2027,'NOMINATIONS_OPEN',now()-interval '1 day',now()+interval '1 day')",
      [e, e],
    );
    await db.query(
      'insert into awards.categories(id,edition_id,name,slug,rules) values($1,$2,\'Staff\',\'staff\',\'{"required_role_ids":["123456789012345678"],"blacklisted_discord_ids":[],"min_membership_days":0}\')',
      [c, e],
    );
    for (const id of [discord, String(BigInt(discord) + 200000000000n)])
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/api/nominations',
            headers,
            payload: { edition_id: e, category_id: c, items: [{ discord_user_id: id }] },
          })
        ).statusCode,
      ).toBe(403);
  });
  it('duplicates only categories and settings, never ballots/participants/results', async () => {
    await post();
    await admin();
    const response = await app.inject({
      method: 'POST',
      url: `/api/admin/editions/${edition}/duplicate`,
      headers,
      payload: { name: 'Next edition', slug: `next-${edition}`, year: 2028 },
    });
    expect(response.statusCode).toBe(201);
    const id = response.json().id;
    expect(
      (
        await query<{ count: number }>(
          'select count(*)::int count from awards.categories where edition_id=$1',
          [id],
        )
      )[0].count,
    ).toBe(1);
    for (const table of ['ballots', 'nomination_items', 'result_snapshots', 'category_nominees'])
      expect(
        (
          await query<{ count: number }>(
            `select count(*)::int count from awards.${table} where edition_id=$1`,
            [id],
          )
        )[0].count,
      ).toBe(0);
  });
  it('deletes an edition and all of its related data', async () => {
    await post();
    await admin();
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/admin/editions/${edition}`,
      headers,
    });
    expect(response.statusCode, response.body).toBe(200);
    expect(
      (
        await query<{ count: number }>(
          'select count(*)::int count from awards.editions where id=$1',
          [edition],
        )
      )[0].count,
    ).toBe(0);
    for (const table of [
      'ballot_items',
      'ballots',
      'nomination_items',
      'result_snapshots',
      'category_nominees',
      'categories',
    ])
      expect(
        (
          await query<{ count: number }>(
            `select count(*)::int count from awards.${table} where edition_id=$1`,
            [edition],
          )
        )[0].count,
      ).toBe(0);
  });
  it('tallies privately, publishes explicitly and audits every transition', async () => {
    await post();
    await admin();
    for (const status of ['VOTING_CLOSED', 'RESULTS_READY'])
      expect(
        (
          await app.inject({
            method: 'POST',
            url: `/api/admin/editions/${edition}/transition`,
            headers,
            payload: { status, reason: 'Test decision' },
          })
        ).statusCode,
      ).toBe(201);
    expect((await app.inject({ url: `/api/winners/${edition}` })).json()).toEqual([]);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/admin/editions/${edition}/transition`,
          headers,
          payload: { status: 'RESULTS_PUBLISHED', reason: 'Publish approved' },
        })
      ).statusCode,
    ).toBe(201);
    const winners = (await app.inject({ url: `/api/winners/${edition}` })).json();
    expect(winners).toHaveLength(1);
    expect(winners[0].display_name).toBe('Candidate');
    expect(winners[0].votes_count).toBeNull();
    expect(
      (
        await query<{ count: number }>(
          "select count(*)::int count from awards.audit_logs where edition_id=$1 and action='edition.transition'",
          [edition],
        )
      )[0].count,
    ).toBe(3);
  });
  it('runs a new configurable edition from creation through nominations, voting and archive', async () => {
    await admin();
    const name = `Edition ${crypto.randomUUID()}`;
    const start = new Date(Date.now() - 3600000).toISOString(),
      end = new Date(Date.now() + 86400000).toISOString();
    const created = await app.inject({
      method: 'POST',
      url: '/api/admin/editions',
      headers,
      payload: {
        name,
        slug: `edition-${crypto.randomUUID()}`,
        year: 2028,
        is_public: true,
        is_current: true,
        nominations_open_at: start,
        nominations_close_at: end,
        voting_open_at: start,
        voting_close_at: end,
      },
    });
    expect(created.statusCode).toBe(201);
    const e = created.json();
    const categories: string[] = [];
    for (const [index, title] of ['Membro', 'Staff'].entries()) {
      const c = await app.inject({
        method: 'POST',
        url: `/api/admin/editions/${e.id}/categories`,
        headers,
        payload: {
          name: title,
          slug: `category-${index}`,
          max_nominees: 3,
          max_nominations: 2,
          vote_required: true,
        },
      });
      expect(c.statusCode).toBe(201);
      categories.push(c.json().id);
    }
    const phase = async (status: string) => {
      const r = await app.inject({
        method: 'POST',
        url: `/api/admin/editions/${e.id}/transition`,
        headers,
        payload: { status, reason: 'Complete lifecycle validation' },
      });
      expect(r.statusCode, r.body).toBe(201);
    };
    await phase('NOMINATIONS_OPEN');
    const person = String(BigInt(discord) + 500000000000n),
      other = String(BigInt(discord) + 600000000000n);
    const n = await app.inject({
      method: 'POST',
      url: '/api/nominations',
      headers,
      payload: {
        edition_id: e.id,
        category_id: categories[0],
        items: [{ manual_name: 'Manual candidate' }],
      },
    });
    expect(n.statusCode).toBe(201);
    await phase('NOMINATIONS_REVIEW');
    const pending = (
      await app.inject({ url: `/api/admin/editions/${e.id}/nominations`, headers })
    ).json();
    expect(pending).toHaveLength(1);
    expect(pending[0].count).toBe(1);
    const reviewed = await app.inject({
      method: 'PATCH',
      url: `/api/admin/editions/${e.id}/nominations/${pending[0].id}`,
      headers,
      payload: { status: 'approved', discord_user_id: person, reason: 'Confirmed member identity' },
    });
    expect(reviewed.statusCode, reviewed.body).toBe(200);
    for (const c of categories)
      for (const id of [person, other])
        expect(
          (
            await app.inject({
              method: 'POST',
              url: `/api/admin/editions/${e.id}/categories/${c}/nominees`,
              headers,
              payload: { discord_user_id: id, reason: 'Official nominee review' },
            })
          ).statusCode,
        ).toBe(201);
    const before = (await app.inject({ url: `/api/editions/${e.id}/categories` })).json();
    expect(before[0].nominees).toEqual([]);
    await phase('NOMINEES_ANNOUNCED');
    await phase('VOTING_OPEN');
    const publicCategories = (await app.inject({ url: `/api/editions/${e.id}/categories` })).json();
    const ballot = await app.inject({
      method: 'POST',
      url: '/api/ballots',
      headers,
      payload: {
        edition_id: e.id,
        idempotency_key: crypto.randomUUID(),
        items: publicCategories.map((c: { id: string; nominees: Array<{ id: string }> }) => ({
          category_id: c.id,
          nominee_id: c.nominees[0].id,
        })),
      },
    });
    expect(ballot.statusCode, ballot.body).toBe(201);
    await phase('VOTING_CLOSED');
    await phase('RESULTS_READY');
    expect((await app.inject({ url: `/api/winners/${e.slug}` })).json()).toEqual([]);
    await phase('RESULTS_PUBLISHED');
    expect((await app.inject({ url: `/api/winners/${e.slug}` })).json()).toHaveLength(2);
    await phase('ARCHIVED');
    expect((await app.inject({ url: `/api/editions/${e.slug}` })).json().status).toBe('ARCHIVED');
  });
  it('generates OpenAPI for public and protected domains', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    expect(document.paths['/api/ballots']).toBeDefined();
    expect(document.paths['/api/admin/editions']).toBeDefined();
  });
});
