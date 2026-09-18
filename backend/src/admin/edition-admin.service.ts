import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { Category, CreateEditionSchema, TransitionSchema, canTransition } from '@awards/contracts';
import { z } from 'zod';
import { Database } from '../common/database';
import { audit, lockEdition } from '../common/domain';
import { DiscordService, validateEligibility } from '../discord/discord';
import { writeData } from './data-access';
@Injectable()
export class EditionAdminService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(DiscordService) private readonly discord: DiscordService,
  ) {}
  async editions() {
    return this.db.query('select * from awards.editions order by year desc,created_at desc');
  }
  async saveEdition(actor: string, data: z.output<typeof CreateEditionSchema>, id?: string) {
    return this.db.transaction(async (c) => {
      await c.query('select pg_advisory_xact_lock(9872026)');
      if (id) {
        const e = await lockEdition(c, id, true);
        if (['RESULTS_PUBLISHED', 'ARCHIVED'].includes(e.status))
          throw new ConflictException('Esta edição já foi publicada.');
        if (e.status !== 'DRAFT' && e.status !== 'VOTING_CLOSED' && e.status !== 'RESULTS_READY')
          throw new ConflictException('As configurações estão bloqueadas durante o processo.');
      }
      if (data.is_current)
        await c.query('update awards.editions set is_current=false where is_current');
      const e = await writeData(c, 'editions', data, id);
      await audit(
        c,
        actor,
        e.id,
        id ? 'edition.updated' : 'edition.created',
        e.id,
        'Configuração administrativa',
      );
      return e;
    });
  }
  async duplicate(actor: string, source: string, data: z.output<typeof CreateEditionSchema>) {
    return this.db.transaction(async (c) => {
      await lockEdition(c, source);
      const e = await writeData(c, 'editions', { ...data, is_current: false });
      await c.query(
        `insert into awards.categories(edition_id,slug,name,description,image_url,display_order,max_nominees,max_nominations,vote_required,allow_self_nomination,archived,rules) select $1,slug,name,description,image_url,display_order,max_nominees,max_nominations,vote_required,allow_self_nomination,archived,rules from awards.categories where edition_id=$2`,
        [e.id, source],
      );
      await audit(
        c,
        actor,
        e.id,
        'edition.duplicated',
        source,
        'Duplicação sem participantes ou votos',
      );
      return e;
    });
  }
  async transition(actor: string, id: string, data: z.output<typeof TransitionSchema>) {
    return this.db.transaction(async (c) => {
      const e = await lockEdition(c, id, true);
      if (!canTransition(e.status, data.status))
        throw new ConflictException('Transição de fase inválida.');
      if (data.status === 'NOMINATIONS_OPEN' || data.status === 'VOTING_OPEN') {
        const phase = data.status === 'VOTING_OPEN' ? 'voting' : 'nominations';
        if (
          !e[`${phase}_open_at`] ||
          !e[`${phase}_close_at`] ||
          Date.parse(e[`${phase}_close_at`]!) <= Date.now()
        )
          throw new BadRequestException('Configure um período válido antes de abrir a fase.');
        const { rows } = await c.query(
          'select id from awards.categories where edition_id=$1 and not archived',
          [id],
        );
        if (!rows.length) throw new BadRequestException('Crie categorias antes de abrir a edição.');
      }
      if (data.status === 'NOMINEES_ANNOUNCED') {
        const cats = (
          await c.query<Category>(
            'select * from awards.categories where edition_id=$1 and not archived',
            [id],
          )
        ).rows;
        if (!cats.length) throw new BadRequestException('A edição precisa de categorias.');
        for (const cat of cats) {
          const nominees = (
            await c.query<{ discord_user_id: string }>(
              'select m.discord_user_id from awards.category_nominees cn join awards.members m on m.id=cn.nominee_id where cn.category_id=$1',
              [cat.id],
            )
          ).rows;
          if (nominees.length < 2 || nominees.length > cat.max_nominees)
            throw new BadRequestException(
              `${cat.name}: defina entre 2 e ${cat.max_nominees} indicados.`,
            );
          for (const n of nominees)
            validateEligibility(await this.discord.member(n.discord_user_id), cat.rules);
        }
      }
      if (data.status === 'RESULTS_READY') {
        const count = (
          await c.query<{ count: number }>(
            'select count(*)::int count from awards.ballots where edition_id=$1',
            [id],
          )
        ).rows[0].count;
        if (!count) throw new ConflictException('Não existem votos para apurar.');
        await c.query('delete from awards.result_snapshots where edition_id=$1', [id]);
        await c.query(
          `insert into awards.result_snapshots(edition_id,category_id,nominee_id,votes_count,percentage,rank) select $1,category_id,nominee_id,total,case when sum(total) over(partition by category_id)=0 then 0 else total*100.0/sum(total) over(partition by category_id) end,rank() over(partition by category_id order by total desc) from (select cn.category_id,cn.nominee_id,count(bi.ballot_id)::int total from awards.category_nominees cn join awards.categories cat on cat.id=cn.category_id left join awards.ballot_items bi on bi.category_id=cn.category_id and bi.nominee_id=cn.nominee_id where cn.edition_id=$1 and not cat.archived group by cn.category_id,cn.nominee_id) counts`,
          [id],
        );
      }
      if (data.status === 'RESULTS_PUBLISHED') {
        const ties = (
          await c.query(
            'select category_id from awards.result_snapshots where edition_id=$1 and rank=1 group by category_id having count(*)>1',
            [id],
          )
        ).rows;
        if (ties.length)
          throw new ConflictException('Resolva os empates antes de publicar os vencedores.');
      }
      await c.query('update awards.editions set status=$1 where id=$2', [data.status, id]);
      await audit(c, actor, id, 'edition.transition', id, data.reason, {
        from: e.status,
        to: data.status,
      });
      return { ...e, status: data.status };
    });
  }
}
