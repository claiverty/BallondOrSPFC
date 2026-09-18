import {
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  Global,
  Inject,
  Injectable,
  Module,
  UnauthorizedException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import type { FastifyRequest } from 'fastify';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Identity, snowflake } from '@awards/contracts';
import { Database } from '../common/database';
import { env } from '../common/env';
export type AuthRequest = FastifyRequest & { identity: Identity };
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly supabase = createClient(env().SUPABASE_URL, env().SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  constructor(@Inject(Database) private readonly db: Database) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new UnauthorizedException('Entre com o Discord para continuar.');
    const { data, error } = await this.supabase.auth.getUser(token);
    if (error || !data.user)
      throw new UnauthorizedException('Sua sessão expirou. Entre novamente.');
    const identity = data.user.identities?.find((i) => i.provider === 'discord');
    const raw = identity?.identity_data;
    const discordId = raw?.sub ?? raw?.provider_id ?? identity?.id;
    if (!snowflake.safeParse(discordId).success)
      throw new ForbiddenException('É necessário entrar com uma conta Discord.');
    const display = String(raw?.full_name ?? raw?.name ?? 'Membro').slice(0, 100);
    const username = String(raw?.custom_claims?.global_name ?? raw?.name ?? display).slice(0, 100);
    const avatar =
      typeof raw?.avatar_url === 'string' &&
      raw.avatar_url.startsWith('https://cdn.discordapp.com/')
        ? raw.avatar_url
        : null;
    const stored = await this.db.query<{ discord_user_id: string }>(
      `insert into awards.profiles(id,discord_user_id,username,display_name,avatar_url) values($1,$2,$3,$4,$5) on conflict(id) do update set username=$3,display_name=$4,avatar_url=$5,updated_at=now() returning discord_user_id`,
      [data.user.id, discordId, username, display, avatar],
    );
    if (stored[0]?.discord_user_id !== discordId)
      throw new ForbiddenException('A identidade Discord não corresponde ao perfil cadastrado.');
    const roles = await this.db.query<{ role: Identity['role'] }>(
      'select role from awards.user_roles where user_id=$1',
      [data.user.id],
    );
    req.identity = {
      id: data.user.id,
      discord_user_id: String(discordId),
      display_name: display,
      avatar_url: avatar,
      role: roles[0]?.role ?? 'user',
    };
    return true;
  }
}
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(c: ExecutionContext) {
    if (
      !['admin', 'super_admin'].includes(c.switchToHttp().getRequest<AuthRequest>().identity?.role)
    )
      throw new ForbiddenException('Acesso restrito à administração.');
    return true;
  }
}
import { Req } from '@nestjs/common';
@ApiTags('Identity')
@ApiBearerAuth()
@Controller('me')
@UseGuards(AuthGuard)
class IdentityController {
  @Get() me(@Req() r: AuthRequest) {
    return r.identity;
  }
}
@Global()
@Module({
  providers: [AuthGuard, AdminGuard],
  controllers: [IdentityController],
  exports: [AuthGuard, AdminGuard],
})
export class AuthModule {}
