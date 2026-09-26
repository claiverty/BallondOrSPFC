import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly log = new Logger('HTTP');
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<FastifyReply>();
    let status = 500;
    let message = 'Não foi possível concluir a operação. Tente novamente.';
    let memberDiscordUserId: string | undefined;
    if (error instanceof HttpException) {
      status = error.getStatus();
      const body = error.getResponse();
      message =
        typeof body === 'string' ? body : ((body as { message?: string }).message ?? error.message);
      if (typeof body === 'object' && body !== null && 'member_discord_user_id' in body) {
        const id = body.member_discord_user_id;
        if (typeof id === 'string' && /^\d{17,20}$/.test(id)) memberDiscordUserId = id;
      }
    } else if (error && typeof error === 'object' && 'code' in error) {
      const code = String(error.code);
      if (code === '23505') {
        status = 409;
        message = 'Este registro já existe ou sua participação já foi confirmada.';
      } else if (['23503', '23514', '22P02'].includes(code)) {
        status = 400;
        message = 'Os dados não atendem às regras desta edição.';
      }
    }
    if (status === 401) this.log.warn(JSON.stringify({ event: 'auth_rejected' }));
    if (status >= 500)
      this.log.error(
        JSON.stringify({
          event: 'request_failed',
          type: error instanceof Error ? error.name : 'unknown',
        }),
      );
    response.status(status).send({
      statusCode: status,
      message,
      ...(memberDiscordUserId ? { member_discord_user_id: memberDiscordUserId } : {}),
    });
  }
}
