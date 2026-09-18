import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategorySchema } from '@awards/contracts';
import { z } from 'zod';
import { Database } from '../common/database';
import { audit, lockEdition, requireDraft } from '../common/domain';
import { writeData } from './data-access';
@Injectable()
export class CategoryAdminService {
  constructor(@Inject(Database) private readonly db: Database) {}
  async categories(edition: string) {
    return this.db.query(
      `select c.*,coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'discord_user_id',m.discord_user_id,'display_name',m.display_name,'username',m.username,'avatar_url',m.avatar_url,'display_order',cn.display_order) order by cn.display_order) from awards.category_nominees cn join awards.members m on m.id=cn.nominee_id where cn.category_id=c.id),'[]'::jsonb) nominees from awards.categories c where c.edition_id=$1 order by c.display_order,c.name`,
      [edition],
    );
  }
  async saveCategory(
    actor: string,
    edition: string,
    data: z.output<typeof CreateCategorySchema>,
    id?: string,
  ) {
    return this.db.transaction(async (c) => {
      requireDraft(await lockEdition(c, edition, true));
      if (
        id &&
        !(
          await c.query('select id from awards.categories where id=$1 and edition_id=$2', [
            id,
            edition,
          ])
        ).rowCount
      )
        throw new NotFoundException('Categoria não encontrada.');
      const cat = await writeData(c, 'categories', data, id, edition);
      await audit(
        c,
        actor,
        edition,
        id ? 'category.updated' : 'category.created',
        cat.id,
        'Configuração de categoria',
      );
      return cat;
    });
  }
  async deleteCategory(actor: string, edition: string, id: string) {
    return this.db.transaction(async (c) => {
      requireDraft(await lockEdition(c, edition, true));
      await c.query('delete from awards.category_nominees where category_id=$1 and edition_id=$2', [
        id,
        edition,
      ]);
      const { rowCount } = await c.query(
        'delete from awards.categories where id=$1 and edition_id=$2',
        [id, edition],
      );
      if (!rowCount) throw new NotFoundException('Categoria não encontrada.');
      await audit(c, actor, edition, 'category.deleted', id, 'Exclusão antes da abertura');
      return { deleted: true };
    });
  }
}
