import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Category, OfficialNomineeSchema, ReviewNominationSchema } from '@awards/contracts';
import { z } from 'zod';
import { PoolClient } from 'pg';
import { Database } from '../common/database';
import { audit, category, lockEdition } from '../common/domain';
import { DiscordService, memberSnapshot, validateEligibility } from '../discord/discord';
@Injectable()
export class NomineeAdminService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(DiscordService) private readonly discord: DiscordService,
  ) {}
  async nominations(edition: string, offset = 0, categoryId?: string) {
    return this.db.query(
      `select min(n.id::text) id,n.category_id,n.member_id,min(n.manual_name) manual_name,m.display_name,m.discord_user_id,c.name category_name,count(*)::int count,case when bool_or(n.status='pending_review') then 'pending_review' when bool_or(n.status='approved') then 'approved' else 'rejected' end status from awards.nomination_items n left join awards.members m on m.id=n.member_id join awards.categories c on c.id=n.category_id where n.edition_id=$1 and ($3::uuid is null or n.category_id=$3) group by n.category_id,n.member_id,lower(n.manual_name),m.display_name,m.discord_user_id,c.name order by count desc,min(n.id::text) limit 100 offset $2`,
      [edition, offset, categoryId ?? null],
    );
  }
  async review(
    actor: string,
    edition: string,
    id: string,
    data: z.output<typeof ReviewNominationSchema>,
  ) {
    return this.db.transaction(async (c) => {
      const e = await lockEdition(c, edition, true);
      if (e.status !== 'NOMINATIONS_REVIEW')
        throw new ConflictException('A revisão não está aberta.');
      const n = (
        await c.query<{
          category_id: string;
          member_id: string | null;
          manual_name: string | null;
        }>(
          'select category_id,member_id,manual_name from awards.nomination_items where id=$1 and edition_id=$2',
          [id, edition],
        )
      ).rows[0];
      if (!n) throw new NotFoundException('Indicação não encontrada.');
      let member = n.member_id;
      if (data.discord_user_id) {
        const cat = await category(c, n.category_id, edition);
        member = await this.resolve(c, data.discord_user_id, cat);
      }
      if (data.status === 'approved' && !member)
        throw new BadRequestException(
          'Associe a indicação manual a um Discord ID antes de aprovar.',
        );
      // Resolve the entire candidate group, removing duplicate indications by the same person.
      const groupParams = [edition, n.category_id, n.member_id, n.manual_name];
      if (member && member !== n.member_id)
        await c.query(
          `delete from awards.nomination_items n where n.edition_id=$1 and n.category_id=$2 and n.member_id is not distinct from $3::uuid and lower(n.manual_name) is not distinct from lower($4::text) and exists(select 1 from awards.nomination_items keep where keep.category_id=n.category_id and keep.nominator_user_id=n.nominator_user_id and keep.member_id=$5 and keep.id<>n.id)`,
          [...groupParams, member],
        );
      const cat = await category(c, n.category_id, edition);
      const reviewed = await c.query(
        `update awards.nomination_items n set status=case when $5='approved' and not $7 and exists(select 1 from awards.profiles p join awards.members m on m.discord_user_id=p.discord_user_id where p.id=n.nominator_user_id and m.id=$6) then 'rejected' else $5 end,member_id=$6,manual_name=case when $6::uuid is null then manual_name else null end where n.edition_id=$1 and n.category_id=$2 and n.member_id is not distinct from $3::uuid and lower(n.manual_name) is not distinct from lower($4::text)`,
        [...groupParams, data.status, member, cat.allow_self_nomination],
      );
      await audit(c, actor, edition, 'nomination.reviewed', id, data.reason, {
        status: data.status,
        affected: reviewed.rowCount,
      });
      return { reviewed: true };
    });
  }
  private async resolve(c: PoolClient, discordId: string, cat: Category) {
    const m = await this.discord.member(discordId);
    validateEligibility(m, cat.rules);
    const s = memberSnapshot(m);
    return (
      await c.query<{ id: string }>(
        `insert into awards.members(discord_user_id,username,display_name,avatar_url) values($1,$2,$3,$4) on conflict(discord_user_id) do update set username=$2,display_name=$3,avatar_url=$4,updated_at=now() returning id`,
        [s.discord_user_id, s.username, s.display_name, s.avatar_url],
      )
    ).rows[0].id;
  }
  async official(
    actor: string,
    edition: string,
    catId: string,
    data: z.output<typeof OfficialNomineeSchema>,
  ) {
    return this.db.transaction(async (c) => {
      const e = await lockEdition(c, edition, true);
      if (!['DRAFT', 'NOMINATIONS_REVIEW'].includes(e.status))
        throw new ConflictException('Os indicados oficiais estão bloqueados.');
      const cat = await category(c, catId, edition);
      const member = await this.resolve(c, data.discord_user_id, cat);
      const count = (
        await c.query<{ count: number }>(
          'select count(*)::int count from awards.category_nominees where category_id=$1 and nominee_id<>$2',
          [catId, member],
        )
      ).rows[0].count;
      if (count >= cat.max_nominees)
        throw new ConflictException('O limite de indicados foi atingido.');
      await c.query(
        'insert into awards.category_nominees(category_id,edition_id,nominee_id,display_order) values($1,$2,$3,$4) on conflict(category_id,nominee_id) do update set display_order=$4',
        [catId, edition, member, data.display_order],
      );
      await audit(c, actor, edition, 'nominee.assigned', member, data.reason, {
        category_id: catId,
      });
      return { saved: true };
    });
  }
  async removeOfficial(
    actor: string,
    edition: string,
    catId: string,
    member: string,
    reason: string,
  ) {
    return this.db.transaction(async (c) => {
      const e = await lockEdition(c, edition, true);
      if (!['DRAFT', 'NOMINATIONS_REVIEW'].includes(e.status))
        throw new ConflictException('Os indicados oficiais estão bloqueados.');
      await c.query(
        'delete from awards.category_nominees where category_id=$1 and edition_id=$2 and nominee_id=$3',
        [catId, edition, member],
      );
      await audit(c, actor, edition, 'nominee.removed', member, reason, { category_id: catId });
      return { deleted: true };
    });
  }
}
