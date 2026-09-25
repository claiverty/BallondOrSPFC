import 'reflect-metadata';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { Logger } from '@nestjs/common';
import { expect, test, vi } from 'vitest';
import type { PoolClient } from 'pg';
import type { Identity } from '@awards/contracts';
import { Database } from '../backend/src/common/database';
import { DiscordService } from '../backend/src/discord/discord';
import { NominationsService } from '../backend/src/nominations/nominations';
import { BallotsService } from '../backend/src/ballots/ballots';
import { EditionAdminService } from '../backend/src/admin/edition-admin.service';
import { ResultsService } from '../backend/src/results/results';

// Snapshot of the nine publicly visible 2026 categories on 25 Sep 2026.
// Private eligibility rules and real accounts are deliberately not copied.
const categories = [
  ['O Mais Querido', 'o-mais-querido'],
  ['Staff do Ano', 'staff-do-ano'],
  ['Membro do Ano', 'membro-do-ano'],
  ['Rei da Resenha', 'rei-da-resenha'],
  ['Revelação do Ano', 'revelacao-do-ano'],
  ['O Mais Influente', 'o-mais-influente'],
  ['O Mais Chato', 'o-mais-chato'],
  ['O Melhor Veterano', 'o-melhor-veterano'],
  ['O Mais Fanático', 'o-mais-fanatico'],
] as const;
const nominatorCount = 200;
const voterCount = 1000;
const candidatesPerCategory = 5;
const nominationsPerCategory = 3;

function snowflake(prefix: bigint, index: number) {
  return String(prefix + BigInt(index));
}

function member(discordId: string) {
  return {
    user: { id: discordId, username: `test_${discordId.slice(-5)}` },
    nick: `Tester ${discordId.slice(-5)}`,
    roles: [],
    joined_at: '2024-01-01T00:00:00.000Z',
  };
}

test('2026-sized edition handles nomination and ballot bursts without duplicate participation', async () => {
  const pg = new PGlite();
  const ballotLog = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  try {
    await pg.exec(
      'create schema auth;create table auth.users(id uuid primary key);create role anon;create role authenticated;',
    );
    for (const migration of [
      '001_platform.sql',
      '003_submission_invariants.sql',
      '006_rls_hardening.sql',
      '010_hall_of_fame_media.sql',
    ]) {
      await pg.exec(await readFile(`supabase/migrations/${migration}`, 'utf8'));
    }

    // PGlite has one connection. Queue transactions as the HTTP test adapter does.
    let pending = Promise.resolve();
    const db = {
      query: async <T extends Record<string, unknown>>(sql: string, params: unknown[] = []) =>
        (await pg.query<T>(sql, params)).rows,
      transaction: async <T>(fn: (client: PoolClient) => Promise<T>) => {
        let release!: () => void;
        const previous = pending;
        pending = new Promise<void>((resolve) => {
          release = resolve;
        });
        await previous;
        try {
          return await pg.transaction(async (tx) => {
            const client = {
              query: async (sql: string, params: unknown[] = []) => {
                const result = await tx.query(sql, params);
                return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
              },
            } as unknown as PoolClient;
            return fn(client);
          });
        } finally {
          release();
        }
      },
    } as unknown as Database;
    const discord = {
      eligible: async (id: string) => member(id),
      member: async (id: string) => member(id),
    } as unknown as DiscordService;
    const nominations = new NominationsService(db, discord);
    const ballots = new BallotsService(db, discord);
    const editions = new EditionAdminService(db, discord);
    const results = new ResultsService(db);
    const editionId = crypto.randomUUID();
    const categoryIds = categories.map(() => crypto.randomUUID());
    const identities: Identity[] = [];
    const candidateDiscordIds = categories.map((_, categoryIndex) =>
      Array.from({ length: candidatesPerCategory }, (_, candidateIndex) =>
        snowflake(930000000000000000n, categoryIndex * candidatesPerCategory + candidateIndex),
      ),
    );

    await pg.query(
      `insert into awards.editions(id,name,slug,year,status,is_public,is_current,
       nominations_open_at,nominations_close_at,voting_open_at,voting_close_at)
       values($1,'2026 isolated stress test','2026',2026,'DRAFT',true,true,
       now()-interval '1 day',now()+interval '1 day',
       now()-interval '1 day',now()+interval '1 day')`,
      [editionId],
    );
    for (const [index, [name, slug]] of categories.entries()) {
      await pg.query(
        `insert into awards.categories(id,edition_id,name,slug,display_order,
         max_nominees,max_nominations,vote_required,allow_self_nomination)
         values($1,$2,$3,$4,$5,$6,$7,true,false)`,
        [
          categoryIds[index],
          editionId,
          name,
          slug,
          index,
          candidatesPerCategory,
          nominationsPerCategory,
        ],
      );
    }
    for (let index = 0; index <= voterCount; index++) {
      const identity: Identity = {
        id: crypto.randomUUID(),
        discord_user_id: snowflake(920000000000000000n, index),
        display_name: `Voter ${index}`,
        avatar_url: null,
        role: 'user',
      };
      identities.push(identity);
      await pg.query('insert into auth.users(id) values($1)', [identity.id]);
      await pg.query(
        'insert into awards.profiles(id,discord_user_id,username,display_name) values($1,$2,$3,$4)',
        [identity.id, identity.discord_user_id, `voter_${index}`, identity.display_name],
      );
    }

    const transition = async (status: Parameters<EditionAdminService['transition']>[2]['status']) =>
      editions.transition(identities[0].id, editionId, {
        status,
        reason: 'Isolated stress test',
      });
    const nominationPayload = (userIndex: number, categoryIndex: number) => ({
      edition_id: editionId,
      category_id: categoryIds[categoryIndex],
      items: Array.from({ length: nominationsPerCategory }, (_, slot) => ({
        discord_user_id:
          candidateDiscordIds[categoryIndex][(userIndex + slot) % candidatesPerCategory],
      })),
    });

    await transition('NOMINATIONS_OPEN');
    await expect(
      ballots.submit(identities[0], {
        edition_id: editionId,
        idempotency_key: crypto.randomUUID(),
        items: [{ category_id: categoryIds[0], nominee_id: crypto.randomUUID() }],
      }),
    ).rejects.toThrow(/votação não está aberta/i);
    await expect(
      nominations.save(identities[nominatorCount], {
        ...nominationPayload(nominatorCount, 0),
        items: Array.from({ length: nominationsPerCategory + 1 }, (_, index) => ({
          discord_user_id: candidateDiscordIds[0][index],
        })),
      }),
    ).rejects.toThrow(/limite de indicações/i);
    await expect(
      nominations.save(identities[nominatorCount], {
        ...nominationPayload(nominatorCount, 0),
        items: [
          { discord_user_id: candidateDiscordIds[0][0] },
          { discord_user_id: candidateDiscordIds[0][0] },
        ],
      }),
    ).rejects.toThrow(/mesma pessoa/i);
    await expect(
      nominations.save(identities[nominatorCount], {
        ...nominationPayload(nominatorCount, 0),
        items: [{ discord_user_id: identities[nominatorCount].discord_user_id }],
      }),
    ).rejects.toThrow(/autoindicação/i);

    const nominationRequests = Array.from({ length: nominatorCount }, (_, userIndex) =>
      categoryIds.map((_, categoryIndex) => ({ userIndex, categoryIndex })),
    ).flat();
    for (let offset = 0; offset < nominationRequests.length; offset += 25) {
      await Promise.all(
        nominationRequests
          .slice(offset, offset + 25)
          .map(({ userIndex, categoryIndex }) =>
            nominations.save(identities[userIndex], nominationPayload(userIndex, categoryIndex)),
          ),
      );
    }
    await expect(nominations.save(identities[0], nominationPayload(0, 0))).rejects.toThrow(
      /já foi enviada/i,
    );
    const duplicateNomination = await Promise.allSettled([
      nominations.save(identities[nominatorCount + 1], nominationPayload(nominatorCount + 1, 0)),
      nominations.save(identities[nominatorCount + 1], nominationPayload(nominatorCount + 1, 0)),
    ]);
    expect(duplicateNomination.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(duplicateNomination.filter((result) => result.status === 'rejected')).toHaveLength(1);

    const nominationCount = (
      await pg.query<{ count: number }>(
        'select count(*)::int count from awards.nomination_items where edition_id=$1',
        [editionId],
      )
    ).rows[0].count;
    expect(nominationCount).toBe((nominatorCount * categories.length + 1) * nominationsPerCategory);
    await transition('NOMINATIONS_REVIEW');
    await expect(
      nominations.save(identities[nominatorCount + 2], nominationPayload(nominatorCount + 2, 0)),
    ).rejects.toThrow(/indicações não estão abertas/i);

    const members = (
      await pg.query<{ id: string; discord_user_id: string }>(
        'select id,discord_user_id from awards.members',
      )
    ).rows;
    const memberIds = new Map(members.map((item) => [item.discord_user_id, item.id]));
    const nomineeIds = candidateDiscordIds.map((group) =>
      group.map((discordId) => {
        const id = memberIds.get(discordId);
        if (!id) throw new Error(`Candidate missing after nominations: ${discordId}`);
        return id;
      }),
    );
    for (const [categoryIndex, group] of nomineeIds.entries()) {
      for (const [candidateIndex, nomineeId] of group.entries()) {
        await pg.query(
          `insert into awards.category_nominees(category_id,edition_id,nominee_id,display_order)
           values($1,$2,$3,$4)`,
          [categoryIds[categoryIndex], editionId, nomineeId, candidateIndex],
        );
      }
    }
    await transition('NOMINEES_ANNOUNCED');
    await transition('VOTING_OPEN');

    const ballotPayload = (userIndex: number) => {
      const distribution = userIndex % 20;
      const candidateIndex =
        distribution < 12 ? 0 : distribution < 17 ? 1 : distribution < 19 ? 2 : 3;
      return {
        edition_id: editionId,
        idempotency_key: crypto.randomUUID(),
        items: categoryIds.map((categoryId, categoryIndex) => ({
          category_id: categoryId,
          nominee_id: nomineeIds[categoryIndex][candidateIndex],
        })),
      };
    };
    await expect(
      ballots.submit(identities[nominatorCount], {
        ...ballotPayload(nominatorCount),
        items: ballotPayload(nominatorCount).items.slice(0, -1),
      }),
    ).rejects.toThrow(/categorias obrigatórias/i);
    await expect(
      ballots.submit(identities[nominatorCount], {
        ...ballotPayload(nominatorCount),
        items: ballotPayload(nominatorCount).items.map((item, index) =>
          index === 0 ? { ...item, nominee_id: crypto.randomUUID() } : item,
        ),
      }),
    ).rejects.toThrow(/não pertence à categoria/i);

    for (let offset = 0; offset < voterCount - 1; offset += 25) {
      const users = identities.slice(offset, Math.min(offset + 25, voterCount - 1));
      await Promise.all(
        users.map((identity, index) => ballots.submit(identity, ballotPayload(offset + index))),
      );
    }
    const racePayloads = Array.from({ length: 3 }, () => ballotPayload(voterCount - 1));
    const race = await Promise.allSettled(
      racePayloads.map((payload) => ballots.submit(identities[voterCount - 1], payload)),
    );
    expect(race.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(race.filter((result) => result.status === 'rejected')).toHaveLength(2);
    const winningAttempt = race.findIndex((result) => result.status === 'fulfilled');
    const receipt = race[winningAttempt];
    if (receipt.status !== 'fulfilled') throw new Error('No accepted ballot in duplicate race');
    expect(await ballots.submit(identities[voterCount - 1], racePayloads[winningAttempt])).toEqual(
      receipt.value,
    );
    await expect(ballots.submit(identities[0], ballotPayload(0))).rejects.toThrow(
      /já confirmou sua votação/i,
    );
    await transition('VOTING_CLOSED');
    await expect(ballots.submit(identities[voterCount], ballotPayload(voterCount))).rejects.toThrow(
      /votação não está aberta/i,
    );

    const ballotCount = (
      await pg.query<{ count: number }>(
        'select count(*)::int count from awards.ballots where edition_id=$1',
        [editionId],
      )
    ).rows[0].count;
    const itemCount = (
      await pg.query<{ count: number }>(
        'select count(*)::int count from awards.ballot_items where edition_id=$1',
        [editionId],
      )
    ).rows[0].count;
    expect(ballotCount).toBe(voterCount);
    expect(itemCount).toBe(voterCount * categories.length);
    await transition('RESULTS_READY');
    expect(await results.winners('2026')).toEqual([]);
    const snapshotCount = (
      await pg.query<{ count: number }>(
        'select count(*)::int count from awards.result_snapshots where edition_id=$1',
        [editionId],
      )
    ).rows[0].count;
    expect(snapshotCount).toBe(categories.length * candidatesPerCategory);
    const snapshots = (
      await pg.query<{
        category_id: string;
        votes_count: number;
        percentage: string;
        rank: number;
      }>(
        'select category_id,votes_count,percentage,rank from awards.result_snapshots where edition_id=$1 order by category_id,rank',
        [editionId],
      )
    ).rows;
    for (const categoryId of categoryIds) {
      const ranked = snapshots.filter((result) => result.category_id === categoryId);
      expect(ranked.map((result) => result.votes_count)).toEqual([600, 250, 100, 50, 0]);
      expect(ranked.map((result) => result.rank)).toEqual([1, 2, 3, 4, 5]);
      expect(ranked.reduce((total, result) => total + Number(result.percentage), 0)).toBeCloseTo(
        100,
      );
    }
    await transition('RESULTS_PUBLISHED');
    expect(await results.winners('2026')).toHaveLength(categories.length * 3);
    expect(await results.winners()).toHaveLength(categories.length);
    await transition('ARCHIVED');
  } finally {
    ballotLog.mockRestore();
    await pg.close();
  }
});
