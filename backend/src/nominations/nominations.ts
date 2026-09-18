import { ApiZodBody } from '../common/openapi';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Injectable,
  Module,
  Post,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NominationSchema } from '@awards/contracts';
import { z } from 'zod';
import { Database } from '../common/database';
import { AuthGuard, AuthRequest } from '../auth/auth';
import {
  DiscordModule,
  DiscordService,
  memberSnapshot,
  validateEligibility,
} from '../discord/discord';
import { ZodPipe } from '../common/validation';
import { category, lockEdition, requireOpen } from '../common/domain';
@Injectable()
export class NominationsService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(DiscordService) private readonly discord: DiscordService,
  ) {}
  async save(user: AuthRequest['identity'], data: z.output<typeof NominationSchema>) {
    return this.db.transaction(async (c) => {
      const e = await lockEdition(c, data.edition_id);
      requireOpen(e, 'nominations');
      const cat = await category(c, data.category_id, e.id);
      if (data.items.length > cat.max_nominations)
        throw new ForbiddenException('O limite de indicações desta categoria foi excedido.');
      const targets = data.items.map((i) => i.discord_user_id ?? i.manual_name?.toLowerCase());
      if (new Set(targets).size !== targets.length)
        throw new ForbiddenException('Não indique a mesma pessoa mais de uma vez nesta categoria.');
      await this.discord.eligible(user.discord_user_id);
      await c.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [
        `${user.id}:${cat.id}`,
      ]);
      const resolved: Array<{ member: string | null; manual: string | null }> = [];
      for (const item of data.items) {
        if (item.discord_user_id) {
          if (!cat.allow_self_nomination && item.discord_user_id === user.discord_user_id)
            throw new ForbiddenException('Autoindicação não permitida nesta categoria.');
          const m = await this.discord.member(item.discord_user_id);
          validateEligibility(m, cat.rules);
          const s = memberSnapshot(m);
          const { rows } = await c.query<{ id: string }>(
            `insert into awards.members(discord_user_id,username,display_name,avatar_url) values($1,$2,$3,$4) on conflict(discord_user_id) do update set username=$2,display_name=$3,avatar_url=$4,updated_at=now() returning id`,
            [s.discord_user_id, s.username, s.display_name, s.avatar_url],
          );
          resolved.push({ member: rows[0].id, manual: null });
        } else resolved.push({ member: null, manual: item.manual_name! });
      }
      await c.query(
        'delete from awards.nomination_items where nominator_user_id=$1 and category_id=$2',
        [user.id, cat.id],
      );
      for (const [slot, item] of resolved.entries())
        await c.query(
          'insert into awards.nomination_items(edition_id,category_id,nominator_user_id,slot,member_id,manual_name) values($1,$2,$3,$4,$5,$6)',
          [e.id, cat.id, user.id, slot, item.member, item.manual],
        );
      return { saved: true };
    });
  }
  async mine(user: string, edition: string) {
    return this.db.query(
      `select n.id,n.category_id,n.member_id,n.manual_name,n.status,m.display_name,m.discord_user_id from awards.nomination_items n left join awards.members m on m.id=n.member_id where n.nominator_user_id=$1 and n.edition_id=$2 order by n.category_id,n.slot`,
      [user, edition],
    );
  }
}
@ApiTags('Nominations')
@ApiBearerAuth()
@Controller('nominations')
@UseGuards(AuthGuard)
class NominationsController {
  constructor(@Inject(NominationsService) private readonly service: NominationsService) {}
  @ApiZodBody(NominationSchema)
  @Post()
  save(
    @Req()
    r: AuthRequest,
    @Body(new ZodPipe(NominationSchema)) b: z.output<typeof NominationSchema>,
  ) {
    return this.service.save(r.identity, b);
  }
  @Get('me') mine(@Req() r: AuthRequest, @Query('edition_id', ParseUUIDPipe) e: string) {
    return this.service.mine(r.identity.id, e);
  }
}
@Module({
  imports: [DiscordModule],
  providers: [NominationsService],
  controllers: [NominationsController],
})
export class NominationsModule {}
