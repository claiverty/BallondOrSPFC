import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Database } from '../common/database';
import { audit, lockEdition } from '../common/domain';
@Injectable()
export class AnalyticsAdminService {
  constructor(@Inject(Database) private readonly db: Database) {}
  async resolveTie(actor: string, edition: string, cat: string, nominee: string, reason: string) {
    return this.db.transaction(async (c) => {
      const e = await lockEdition(c, edition, true);
      if (e.status !== 'RESULTS_READY')
        throw new ConflictException('A apuração não está em revisão.');
      const rows = (
        await c.query<{ nominee_id: string }>(
          'select nominee_id from awards.result_snapshots where edition_id=$1 and category_id=$2 and rank=1',
          [edition, cat],
        )
      ).rows;
      if (rows.length < 2 || !rows.some((r) => r.nominee_id === nominee))
        throw new BadRequestException('Selecione um candidato empatado em primeiro lugar.');
      await c.query(
        'update awards.result_snapshots set rank=case when nominee_id=$3 then 1 when rank=1 then 2 else rank end where edition_id=$1 and category_id=$2',
        [edition, cat, nominee],
      );
      await audit(c, actor, edition, 'result.tie_resolved', cat, reason, { nominee_id: nominee });
      return { resolved: true };
    });
  }
  async analytics(id: string) {
    const [ballots, edition, categories, timeline] = await Promise.all([
      this.db.query<{ count: number }>(
        'select count(*)::int count from awards.ballots where edition_id=$1',
        [id],
      ),
      this.db.query<{ eligible_count: number | null }>(
        'select eligible_count from awards.editions where id=$1',
        [id],
      ),
      this.db.query(
        `select c.id category_id,c.name category_name,m.id nominee_id,m.display_name,count(bi.ballot_id)::int votes_count,case when sum(count(bi.ballot_id)) over(partition by c.id)=0 then 0 else count(bi.ballot_id)*100.0/sum(count(bi.ballot_id)) over(partition by c.id) end::float percentage from awards.category_nominees cn join awards.categories c on c.id=cn.category_id join awards.members m on m.id=cn.nominee_id left join awards.ballot_items bi on bi.category_id=c.id and bi.nominee_id=m.id where c.edition_id=$1 group by c.id,m.id order by c.display_order,votes_count desc`,
        [id],
      ),
      this.db.query(
        `select to_char(submitted_at at time zone 'America/Sao_Paulo','YYYY-MM-DD') day,count(*)::int count from awards.ballots where edition_id=$1 group by day order by day`,
        [id],
      ),
    ]);
    if (!edition[0]) throw new NotFoundException('Edição não encontrada.');
    const count = ballots[0].count;
    const eligible = edition[0].eligible_count;
    return {
      ballots: count,
      eligible_count: eligible,
      participation: eligible ? (count / eligible) * 100 : null,
      categories,
      timeline,
    };
  }
  async results(id: string) {
    return this.db.query(
      `select r.*,m.display_name,c.name category_name from awards.result_snapshots r join awards.members m on m.id=r.nominee_id join awards.categories c on c.id=r.category_id where r.edition_id=$1 order by c.display_order,r.rank`,
      [id],
    );
  }
  async logs(id: string) {
    return this.db.query(
      'select id,action,entity_id,reason,details,created_at,actor_id from awards.audit_logs where edition_id=$1 or edition_id is null order by created_at desc limit 100',
      [id],
    );
  }
}
