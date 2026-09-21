import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PoolClient } from 'pg';
import { Database } from '../common/database';
import { DiscordService, memberSnapshot } from '../discord/discord';

export interface HistoricalMember {
  id: string;
  discord_user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  wins: number;
  is_linked: boolean;
}

@Injectable()
export class MemberAdminService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(DiscordService) private readonly discord: DiscordService,
  ) {}

  async members(): Promise<HistoricalMember[]> {
    return this.db.query<HistoricalMember>(
      `select
        m.id,
        m.discord_user_id,
        m.username,
        m.display_name,
        m.avatar_url,
        count(r.nominee_id) filter (where r.rank=1)::int as wins,
        not starts_with(m.discord_user_id, '92000000000000000') as is_linked
      from awards.members m
      left join awards.result_snapshots r on r.nominee_id=m.id
      group by m.id
      order by is_linked asc, wins desc, m.display_name asc`,
    );
  }

  async link(
    actor: { id: string; role: string },
    memberId: string,
    discordUserId: string,
    reason: string,
  ) {
    if (actor.role !== 'super_admin')
      throw new ForbiddenException('Somente super_admin pode vincular perfis históricos.');

    const discordMember = memberSnapshot(await this.discord.member(discordUserId));
    return this.db.transaction(async (c) => {
      const member = await this.member(c, memberId);
      const existing = (
        await c.query<{ id: string }>(
          'select id from awards.members where discord_user_id=$1 and id<>$2 for update',
          [discordMember.discord_user_id, memberId],
        )
      ).rows[0];

      if (existing)
        throw new ConflictException(
          'Este perfil do Discord já está vinculado a outro registro. Unifique os registros antes de continuar.',
        );

      await c.query(
        `update awards.members
          set discord_user_id=$2,username=$3,display_name=$4,avatar_url=$5,updated_at=now()
          where id=$1`,
        [
          member.id,
          discordMember.discord_user_id,
          discordMember.username,
          discordMember.display_name,
          discordMember.avatar_url,
        ],
      );
      await c.query(
        `insert into awards.audit_logs(actor_id,action,entity_id,reason,details)
          values($1,$2,$3,$4,$5)`,
        [
          actor.id,
          'member.discord_linked',
          member.id,
          reason,
          JSON.stringify({ previous_discord_user_id: member.discord_user_id }),
        ],
      );
      return { saved: true };
    });
  }

  private async member(c: PoolClient, id: string) {
    const member = (
      await c.query<{ id: string; discord_user_id: string }>(
        'select id,discord_user_id from awards.members where id=$1 for update',
        [id],
      )
    ).rows[0];
    if (!member) throw new NotFoundException('Registro histórico não encontrado.');
    return member;
  }
}
