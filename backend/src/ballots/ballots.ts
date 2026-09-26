import { ApiZodBody } from '../common/openapi';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Injectable,
  Logger,
  Module,
  Post,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SubmitBallotSchema, Category } from '@awards/contracts';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { Database } from '../common/database';
import { lockEdition, requireOpen } from '../common/domain';
import { AuthGuard, AuthRequest } from '../auth/auth';
import { DiscordMemberNotFoundException, DiscordModule, DiscordService } from '../discord/discord';
import { ZodPipe } from '../common/validation';
export function validateBallot(
  items: Array<{ category_id: string; nominee_id: string }>,
  cats: Category[],
  relations: Array<{ category_id: string; nominee_id: string }>,
) {
  if (new Set(items.map((i) => i.category_id)).size !== items.length)
    throw new BadRequestException('Categorias duplicadas.');
  for (const c of cats)
    if (c.vote_required && !items.some((i) => i.category_id === c.id))
      throw new BadRequestException('Preencha todas as categorias obrigatórias.');
  for (const i of items)
    if (
      !cats.some((c) => c.id === i.category_id) ||
      !relations.some((r) => r.category_id === i.category_id && r.nominee_id === i.nominee_id)
    )
      throw new BadRequestException('Um indicado não pertence à categoria selecionada.');
}
export function ballotHash(items: Array<{ category_id: string; nominee_id: string }>) {
  return createHash('sha256')
    .update(JSON.stringify([...items].sort((a, b) => a.category_id.localeCompare(b.category_id))))
    .digest('hex');
}
@Injectable()
export class BallotsService {
  private readonly log = new Logger('Ballots');
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(DiscordService) private readonly discord: DiscordService,
  ) {}
  async submit(user: AuthRequest['identity'], data: z.output<typeof SubmitBallotSchema>) {
    const hash = ballotHash(data.items);
    const result = await this.db.transaction(async (c) => {
      const e = await lockEdition(c, data.edition_id);
      await c.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [
        `ballot:${e.id}:${user.id}`,
      ]);
      const prior = (
        await c.query<{
          id: string;
          idempotency_key: string;
          payload_hash: string;
          submitted_at: string;
        }>(
          'select id,idempotency_key,payload_hash,submitted_at from awards.ballots where edition_id=$1 and user_id=$2',
          [e.id, user.id],
        )
      ).rows[0];
      if (prior) {
        if (prior.idempotency_key === data.idempotency_key && prior.payload_hash === hash)
          return { id: prior.id, submitted_at: prior.submitted_at };
        throw new ConflictException('Você já confirmou sua votação nesta edição.');
      }
      requireOpen(e, 'voting');
      try {
        await this.discord.eligible(user.discord_user_id);
      } catch (error) {
        if (error instanceof DiscordMemberNotFoundException)
          throw new ForbiddenException(
            'Entre no discord.gg/saopaulo com a conta usada no login para poder votar.',
          );
        throw error;
      }
      const cats = (
        await c.query<Category>(
          'select * from awards.categories where edition_id=$1 and not archived',
          [e.id],
        )
      ).rows;
      const relations = (
        await c.query<{ category_id: string; nominee_id: string }>(
          'select category_id,nominee_id from awards.category_nominees where edition_id=$1',
          [e.id],
        )
      ).rows;
      validateBallot(data.items, cats, relations);
      requireOpen(e, 'voting');
      const { rows } = await c.query<{ id: string; submitted_at: string }>(
        'insert into awards.ballots(edition_id,user_id,idempotency_key,payload_hash) values($1,$2,$3,$4) returning id,submitted_at',
        [e.id, user.id, data.idempotency_key, hash],
      );
      for (const i of data.items)
        await c.query(
          'insert into awards.ballot_items(ballot_id,edition_id,category_id,nominee_id) values($1,$2,$3,$4)',
          [rows[0].id, e.id, i.category_id, i.nominee_id],
        );
      return rows[0];
    });
    this.log.log(
      JSON.stringify({
        event: 'ballot_submitted',
        edition_id: data.edition_id,
        ballot_id: result.id,
      }),
    );
    return result;
  }
  async mine(user: string, edition: string) {
    return (
      (
        await this.db.query(
          'select id,submitted_at from awards.ballots where edition_id=$1 and user_id=$2',
          [edition, user],
        )
      )[0] ?? null
    );
  }
}
@ApiTags('Ballots')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('ballots')
class BallotsController {
  constructor(@Inject(BallotsService) private readonly service: BallotsService) {}
  @ApiZodBody(SubmitBallotSchema)
  @Post()
  submit(
    @Req()
    r: AuthRequest,
    @Body(new ZodPipe(SubmitBallotSchema)) b: z.output<typeof SubmitBallotSchema>,
  ) {
    return this.service.submit(r.identity, b);
  }
  @Get('me') mine(@Req() r: AuthRequest, @Query('edition_id', ParseUUIDPipe) e: string) {
    return this.service.mine(r.identity.id, e);
  }
}
@Module({ imports: [DiscordModule], providers: [BallotsService], controllers: [BallotsController] })
export class BallotsModule {}
