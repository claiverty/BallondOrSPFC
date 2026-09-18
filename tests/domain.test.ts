import { describe, it, expect } from 'vitest';
import {
  canTransition,
  statuses,
  isOpen,
  SubmitBallotSchema,
  NominationSchema,
  CreateEditionSchema,
} from '@awards/contracts';
import { validateEligibility } from '../backend/src/discord/discord';
import { validateBallot, ballotHash } from '../backend/src/ballots/ballots';
import { demoCategories, demoEdition } from '../frontend/src/lib/demo';
import { RulesSchema } from '@awards/contracts';
const member = {
  user: { id: '123456789012345678', username: 'test' },
  roles: ['987654321098765432'],
  joined_at: '2025-01-01T00:00:00Z',
};
describe('Edition lifecycle', () => {
  it('permits only the next phase', () => {
    for (const [i, s] of statuses.entries())
      for (const [j, t] of statuses.entries()) expect(canTransition(s, t)).toBe(j === i + 1);
  });
  it('enforces both phase and UTC period with exclusive closing time', () => {
    const e = {
      ...demoEdition,
      voting_open_at: '2026-09-01T00:00:00Z',
      voting_close_at: '2026-10-01T00:00:00Z',
    };
    expect(isOpen(e, 'voting', Date.parse(e.voting_open_at))).toBe(true);
    expect(isOpen(e, 'voting', Date.parse(e.voting_close_at))).toBe(false);
    expect(isOpen({ ...e, status: 'VOTING_CLOSED' }, 'voting', Date.parse(e.voting_open_at))).toBe(
      false,
    );
    expect(isOpen({ ...e, voting_close_at: null }, 'voting')).toBe(false);
  });
  it('rejects inverted schedules', () =>
    expect(
      CreateEditionSchema.safeParse({ ...demoEdition, voting_open_at: '2027-01-01T00:00:00Z' })
        .success,
    ).toBe(false));
});
describe('Eligibility', () => {
  it('accepts a server member with the required role and tenure', () =>
    expect(() =>
      validateEligibility(
        member,
        RulesSchema.parse({ required_role_ids: member.roles, min_membership_days: 30 }),
      ),
    ).not.toThrow());
  it.each([
    { user: { ...member.user, bot: true } },
    { pending: true },
    { roles: [] },
    { joined_at: null },
  ])('rejects bot, pending, missing role or tenure: %j', (override) =>
    expect(() =>
      validateEligibility(
        { ...member, ...override },
        RulesSchema.parse({ required_role_ids: member.roles, min_membership_days: 30 }),
      ),
    ).toThrow(),
  );
  it('rejects blacklisted members', () =>
    expect(() =>
      validateEligibility(member, RulesSchema.parse({ blacklisted_discord_ids: [member.user.id] })),
    ).toThrow());
});
describe('Ballot domain', () => {
  const cats = demoCategories.slice(0, 2);
  const items = cats.map((c) => ({ category_id: c.id, nominee_id: c.nominees[0].id }));
  const relations = cats.flatMap((c) =>
    c.nominees.map((n) => ({ category_id: c.id, nominee_id: n.id })),
  );
  it('accepts a complete ballot', () =>
    expect(() => validateBallot(items, cats, relations)).not.toThrow());
  it('rejects incomplete required categories', () =>
    expect(() => validateBallot(items.slice(0, 1), cats, relations)).toThrow());
  it('rejects an unknown nominee', () =>
    expect(() =>
      validateBallot([{ ...items[0], nominee_id: crypto.randomUUID() }, items[1]], cats, relations),
    ).toThrow());
  it('rejects a nominee from another category', () =>
    expect(() =>
      validateBallot(
        [{ ...items[0], nominee_id: cats[1].nominees[1].id }, items[1]],
        cats,
        relations,
      ),
    ).toThrow());
  it('rejects duplicate categories and empty ballots at contract boundary', () => {
    expect(
      SubmitBallotSchema.safeParse({
        edition_id: demoEdition.id,
        idempotency_key: crypto.randomUUID(),
        items: [items[0], items[0]],
      }).success,
    ).toBe(false);
    expect(
      SubmitBallotSchema.safeParse({
        edition_id: demoEdition.id,
        idempotency_key: crypto.randomUUID(),
        items: [],
      }).success,
    ).toBe(false);
  });
  it('hashes deterministically independent of category order', () =>
    expect(ballotHash(items)).toBe(ballotHash([...items].reverse())));
  it('does not accept a manual name together with an ID', () =>
    expect(
      NominationSchema.safeParse({
        edition_id: demoEdition.id,
        category_id: cats[0].id,
        items: [{ manual_name: 'Test', discord_user_id: member.user.id }],
      }).success,
    ).toBe(false));
});
