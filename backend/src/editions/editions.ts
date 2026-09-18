import {
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Database } from '../common/database';
import { Edition } from '@awards/contracts';
@Injectable()
export class EditionsService {
  constructor(@Inject(Database) private readonly db: Database) {}
  async list() {
    return this.db.query<Edition>(
      "select * from awards.editions where (status<>'DRAFT' or is_public) order by year desc,created_at desc",
    );
  }
  async get(slug: string) {
    const rows = await this.db.query<Edition>(
      "select * from awards.editions where slug=$1 and (status<>'DRAFT' or is_public)",
      [slug],
    );
    if (!rows[0]) throw new NotFoundException('Edição não encontrada.');
    return rows[0];
  }
  async current() {
    const rows = await this.list();
    if (!rows[0]) throw new NotFoundException('A próxima edição está em preparação.');
    return rows.find((e) => e.is_current) ?? rows.find((e) => e.status !== 'ARCHIVED') ?? rows[0];
  }
  async categories(id: string) {
    const e = (
      await this.db.query<Edition>(
        "select * from awards.editions where id=$1 and (status<>'DRAFT' or is_public)",
        [id],
      )
    )[0];
    if (!e) throw new NotFoundException('Edição não encontrada.');
    const reveal = [
      'NOMINEES_ANNOUNCED',
      'VOTING_OPEN',
      'VOTING_CLOSED',
      'RESULTS_READY',
      'RESULTS_PUBLISHED',
      'ARCHIVED',
    ].includes(e.status);
    return this.db.query(
      `select c.id,c.edition_id,c.name,c.slug,c.description,c.image_url,c.display_order,c.max_nominees,c.max_nominations,c.vote_required,c.allow_self_nomination,c.archived, case when $2 then coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'discord_user_id',m.discord_user_id,'display_name',m.display_name,'username',m.username,'avatar_url',m.avatar_url) order by cn.display_order) from awards.category_nominees cn join awards.members m on m.id=cn.nominee_id where cn.category_id=c.id),'[]'::jsonb) else '[]'::jsonb end as nominees from awards.categories c where c.edition_id=$1 and not c.archived order by c.display_order,c.name`,
      [id, reveal],
    );
  }
}
@ApiTags('Editions')
@Controller('editions')
class EditionsController {
  constructor(@Inject(EditionsService) private readonly editions: EditionsService) {}
  @Get() list() {
    return this.editions.list();
  }
  @Get('current') current() {
    return this.editions.current();
  }
  @Get(':id/categories') categories(@Param('id', ParseUUIDPipe) id: string) {
    return this.editions.categories(id);
  }
  @Get(':slug') get(@Param('slug') slug: string) {
    return this.editions.get(slug);
  }
}
@Module({
  providers: [EditionsService],
  controllers: [EditionsController],
  exports: [EditionsService],
})
export class EditionsModule {}
