import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Database } from '../common/database';
@Injectable()
export class UserAdminService {
  constructor(@Inject(Database) private readonly db: Database) {}
  async users() {
    return this.db.query(
      `select p.id,p.display_name,p.discord_user_id,coalesce(r.role,'user') role from awards.profiles p left join awards.user_roles r on r.user_id=p.id order by p.created_at desc limit 100`,
    );
  }
  async setRole(actor: { id: string; role: string }, user: string, role: string) {
    if (actor.role !== 'super_admin')
      throw new ForbiddenException('Somente super_admin pode gerenciar funções.');
    if (actor.id === user) throw new ForbiddenException('Não altere sua própria função.');
    return this.db.transaction(async (c) => {
      if (role === 'user') await c.query('delete from awards.user_roles where user_id=$1', [user]);
      else
        await c.query(
          'insert into awards.user_roles(user_id,role) values($1,$2) on conflict(user_id) do update set role=$2',
          [user, role],
        );
      await c.query(
        'insert into awards.audit_logs(actor_id,action,entity_id,reason,details) values($1,$2,$3,$4,$5)',
        [actor.id, 'user.role_updated', user, 'Gestão de acesso', JSON.stringify({ role })],
      );
      return { saved: true };
    });
  }
}
