import { Controller, Get, Inject, Injectable, Module, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Database } from '../common/database';
@Injectable()
export class ResultsService {
  constructor(@Inject(Database) private readonly db: Database) {}
  async winners(slug?: string) {
    return this.db.query(
      `select e.id edition_id,e.name edition_name,e.year,e.slug edition_slug,c.id category_id,c.name category_name,c.slug category_slug,m.id nominee_id,m.display_name,m.username,m.discord_user_id,m.avatar_url,r.rank,case when e.publish_counts then r.votes_count end votes_count,case when e.publish_percentages then r.percentage::float end percentage from awards.result_snapshots r join awards.editions e on e.id=r.edition_id join awards.categories c on c.id=r.category_id join awards.members m on m.id=r.nominee_id where e.status in ('RESULTS_PUBLISHED','ARCHIVED') and ($1::text is null or e.slug=$1) and r.rank<=case when e.result_visibility='top3' then 3 else 1 end order by e.year desc,c.display_order,r.rank`,
      [slug ?? null],
    );
  }
  async member(discord: string) {
    const rows = await this.db.query(
      'select id,discord_user_id,display_name,username,avatar_url from awards.members where discord_user_id=$1',
      [discord],
    );
    if (!rows[0]) return null;
    const nominations = await this.db.query(
      `select e.year,e.slug edition_slug,c.name category_name,c.slug category_slug,coalesce(r.rank,0) rank from awards.category_nominees cn join awards.editions e on e.id=cn.edition_id join awards.categories c on c.id=cn.category_id left join awards.result_snapshots r on r.category_id=cn.category_id and r.nominee_id=cn.nominee_id and e.status in ('RESULTS_PUBLISHED','ARCHIVED') where cn.nominee_id=$1 and e.status in ('NOMINEES_ANNOUNCED','VOTING_OPEN','VOTING_CLOSED','RESULTS_READY','RESULTS_PUBLISHED','ARCHIVED') order by e.year desc,c.display_order`,
      [rows[0].id],
    );
    return { ...rows[0], history: nominations };
  }
  async records() {
    return this.db.query(
      `select m.discord_user_id,m.display_name,m.avatar_url,count(*)::int wins from awards.result_snapshots r join awards.editions e on e.id=r.edition_id join awards.members m on m.id=r.nominee_id where e.status in ('RESULTS_PUBLISHED','ARCHIVED') and r.rank=1 group by m.id order by wins desc,m.display_name limit 20`,
    );
  }
}
@ApiTags('Results')
@Controller()
class ResultsController {
  constructor(@Inject(ResultsService) private readonly service: ResultsService) {}
  @Get('winners/:slug') winners(@Param('slug') s: string) {
    return this.service.winners(s);
  }
  @Get('hall-of-fame') hall() {
    return this.service.winners();
  }
  @Get('records') records() {
    return this.service.records();
  }
  @Get('members/:discordId') member(@Param('discordId') s: string) {
    return this.service.member(s);
  }
}
@Module({ providers: [ResultsService], controllers: [ResultsController] })
export class ResultsModule {}
