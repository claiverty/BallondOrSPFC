import {
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Injectable,
  Module,
  Query,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { RulesSchema, snowflake, Nominee } from '@awards/contracts';
import { env } from '../common/env';
import { AuthGuard } from '../auth/auth';
import { ZodPipe } from '../common/validation';
const MemberSchema = z.object({
  user: z.object({
    id: snowflake,
    username: z.string(),
    global_name: z.string().nullable().optional(),
    avatar: z.string().nullable().optional(),
    bot: z.boolean().optional(),
  }),
  nick: z.string().nullable().optional(),
  roles: z.array(z.string()),
  joined_at: z.iso.datetime({ offset: true }).nullable(),
  pending: z.boolean().optional(),
});
export type GuildMember = z.infer<typeof MemberSchema>;
export function validateEligibility(
  member: GuildMember,
  rules: z.output<typeof RulesSchema>,
  now = Date.now(),
) {
  if (member.user.bot || member.pending)
    throw new ForbiddenException('Este membro não é elegível.');
  if (rules.blacklisted_discord_ids.includes(member.user.id))
    throw new ForbiddenException('Este membro não é elegível nesta categoria.');
  if (
    rules.required_role_ids.length &&
    !rules.required_role_ids.some((r) => member.roles.includes(r))
  )
    throw new ForbiddenException('O membro não possui o cargo exigido.');
  if (
    rules.min_membership_days &&
    (!member.joined_at || now - Date.parse(member.joined_at) < rules.min_membership_days * 86400000)
  )
    throw new ForbiddenException('O membro ainda não possui o tempo mínimo no servidor.');
}
export function memberSnapshot(m: GuildMember): Omit<Nominee, 'id'> {
  return {
    discord_user_id: m.user.id,
    username: m.user.username,
    display_name: m.nick ?? m.user.global_name ?? m.user.username,
    avatar_url: m.user.avatar
      ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.webp?size=256`
      : null,
  };
}
@Injectable()
export class DiscordService {
  private cooldown = 0;
  private cache = new Map<string, { until: number; value: unknown }>();
  private async request(path: string): Promise<unknown> {
    if (Date.now() < this.cooldown)
      throw new ServiceUnavailableException('O Discord está ocupado. Aguarde alguns segundos.');
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${env().DISCORD_GUILD_ID}${path}`,
      {
        headers: { Authorization: `Bot ${env().DISCORD_BOT_TOKEN}` },
        signal: AbortSignal.timeout(8000),
      },
    ).catch(() => {
      throw new ServiceUnavailableException('Não foi possível consultar o Discord.');
    });
    if (response.status === 404)
      throw new ForbiddenException('O membro precisa fazer parte do servidor.');
    if (response.status === 429) {
      const body = (await response.json()) as { retry_after?: number };
      this.cooldown = Date.now() + Math.max(1, body.retry_after ?? 5) * 1000;
      throw new ServiceUnavailableException(
        'Limite de consultas do Discord. Tente novamente em instantes.',
      );
    }
    if (!response.ok)
      throw new ServiceUnavailableException('A consulta ao Discord está indisponível.');
    return response.json();
  }
  async member(id: string) {
    return MemberSchema.parse(await this.request(`/members/${snowflake.parse(id)}`));
  }
  async eligible(id: string, rules?: z.output<typeof RulesSchema>): Promise<GuildMember> {
    const m = await this.member(id);
    validateEligibility(m, RulesSchema.parse(rules ?? {}));
    return m;
  }
  async search(q: string) {
    const key = q.toLowerCase();
    const cached = this.cache.get(key);
    if (cached && cached.until > Date.now()) return cached.value as Omit<Nominee, 'id'>[];
    const members = z
      .array(MemberSchema)
      .parse(await this.request(`/members/search?query=${encodeURIComponent(q)}&limit=8`));
    const value = members.filter((m) => !m.user.bot && !m.pending).map(memberSnapshot);
    if (this.cache.size >= 100) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(key, { until: Date.now() + 15000, value });
    return value;
  }
}
@ApiTags('Discord')
@ApiBearerAuth()
@Controller('discord')
@UseGuards(AuthGuard)
class DiscordController {
  constructor(@Inject(DiscordService) private readonly discord: DiscordService) {}
  @Get('members/search') search(
    @Query('q', new ZodPipe(z.string().trim().min(2).max(32))) q: string,
  ) {
    return this.discord.search(q);
  }
}
@Module({
  providers: [DiscordService],
  controllers: [DiscordController],
  exports: [DiscordService],
})
export class DiscordModule {}
