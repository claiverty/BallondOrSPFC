import { ApiZodBody } from '../common/openapi';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { id } from '@awards/contracts';
import { AuthGuard, AdminGuard, AuthRequest } from '../auth/auth';
import { Database } from '../common/database';
import { audit, lockEdition } from '../common/domain';
import { env } from '../common/env';
import { ZodPipe } from '../common/validation';

const UploadSchema = z.object({
  edition_id: id,
  category_id: id,
  mime_type: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  base64: z
    .string()
    .min(8)
    .max(2800000)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/),
});

@ApiTags('Media')
@ApiBearerAuth()
@Controller('admin/media')
@UseGuards(AuthGuard, AdminGuard)
class MediaController {
  private readonly storage = createClient(env().SUPABASE_URL, env().SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage;

  constructor(@Inject(Database) private readonly db: Database) {}

  @Get(':edition')
  async hallOfFameImages(@Param('edition', ParseUUIDPipe) edition: string) {
    return this.db.query(
      `select e.id edition_id,e.name edition_name,e.year,e.slug edition_slug,c.id category_id,c.name category_name,c.slug category_slug,m.id nominee_id,m.display_name,m.username,m.avatar_url,media.url hall_of_fame_image_url from awards.editions e join awards.categories c on c.edition_id=e.id join awards.result_snapshots r on r.edition_id=e.id and r.category_id=c.id and r.rank=1 join awards.members m on m.id=r.nominee_id left join awards.media_assets media on media.edition_id=e.id and media.category_id=c.id where e.id=$1 and e.status in ('RESULTS_PUBLISHED','ARCHIVED') order by c.display_order,c.name`,
      [edition],
    );
  }

  @ApiZodBody(UploadSchema)
  @Post()
  async upload(
    @Req() r: AuthRequest,
    @Body(new ZodPipe(UploadSchema)) data: z.output<typeof UploadSchema>,
  ) {
    const bytes = Buffer.from(data.base64, 'base64');
    if (bytes.length > 2 * 1024 * 1024)
      throw new BadRequestException('A imagem deve ter até 2 MB.');

    const signatures = {
      'image/png': bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      'image/jpeg': bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
      'image/webp':
        bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP',
    };
    if (!signatures[data.mime_type])
      throw new BadRequestException('O conteúdo não corresponde ao formato informado.');

    const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[data.mime_type];
    const path = `${data.edition_id}/${data.category_id}/${randomUUID()}.${ext}`;
    let previousPath: string | null = null;
    let uploadedPath: string | null = null;

    let result: { url: string };
    try {
      result = await this.db.transaction(async (c) => {
        const edition = await lockEdition(c, data.edition_id, true);
        if (!['RESULTS_PUBLISHED', 'ARCHIVED'].includes(edition.status))
          throw new BadRequestException(
            'Publique os resultados antes de personalizar o Hall da Fama.',
          );

        const winner = await c.query(
          'select 1 from awards.result_snapshots where edition_id=$1 and category_id=$2 and rank=1 limit 1',
          [data.edition_id, data.category_id],
        );
        if (!winner.rowCount)
          throw new BadRequestException('Escolha uma categoria com vencedor publicado.');

        const current = await c.query<{ storage_path: string }>(
          'select storage_path from awards.media_assets where edition_id=$1 and category_id=$2 for update',
          [data.edition_id, data.category_id],
        );
        previousPath = current.rows[0]?.storage_path ?? null;

        const { error } = await this.storage
          .from('award-media')
          .upload(path, bytes, { contentType: data.mime_type, upsert: false });
        if (error) throw new BadRequestException('Não foi possível salvar a imagem no Storage.');
        uploadedPath = path;

        const { data: publicData } = this.storage.from('award-media').getPublicUrl(path);
        await c.query(
          `insert into awards.media_assets(edition_id,category_id,storage_path,url,created_by) values($1,$2,$3,$4,$5) on conflict(category_id) where category_id is not null do update set storage_path=excluded.storage_path,url=excluded.url,created_by=excluded.created_by,created_at=now()`,
          [data.edition_id, data.category_id, path, publicData.publicUrl, r.identity.id],
        );
        await audit(
          c,
          r.identity.id,
          data.edition_id,
          'hall_of_fame.image_updated',
          data.category_id,
          'Arte do vencedor atualizada',
          { mime_type: data.mime_type, replaced: !!previousPath },
        );
        return { url: publicData.publicUrl };
      });
    } catch (error) {
      if (uploadedPath) {
        try {
          await this.storage.from('award-media').remove([uploadedPath]);
        } catch {
          // Keep the original failure; an orphaned upload can be cleaned up later.
        }
      }
      throw error;
    }
    if (previousPath && previousPath !== uploadedPath) {
      try {
        await this.storage.from('award-media').remove([previousPath]);
      } catch {
        // The database already points at the new image; cleanup can be retried separately.
      }
    }
    return result;
  }

  @Delete(':edition/:category')
  async remove(
    @Req() r: AuthRequest,
    @Param('edition', ParseUUIDPipe) editionId: string,
    @Param('category', ParseUUIDPipe) categoryId: string,
  ) {
    const storagePath = await this.db.transaction(async (c) => {
      const edition = await lockEdition(c, editionId, true);
      if (!['RESULTS_PUBLISHED', 'ARCHIVED'].includes(edition.status))
        throw new BadRequestException('Só é possível remover artes de resultados publicados.');

      const winner = await c.query(
        'select 1 from awards.result_snapshots where edition_id=$1 and category_id=$2 and rank=1 limit 1',
        [editionId, categoryId],
      );
      if (!winner.rowCount)
        throw new BadRequestException('A arte só pode ser removida de um vencedor publicado.');

      const removed = await c.query<{ storage_path: string }>(
        'delete from awards.media_assets where edition_id=$1 and category_id=$2 returning storage_path',
        [editionId, categoryId],
      );
      if (!removed.rows[0])
        throw new NotFoundException('Esta categoria não tem arte personalizada.');

      await audit(
        c,
        r.identity.id,
        editionId,
        'hall_of_fame.image_removed',
        categoryId,
        'Arte personalizada removida',
      );
      return removed.rows[0].storage_path;
    });

    try {
      await this.storage.from('award-media').remove([storagePath]);
    } catch {
      // The override is gone from the database; cleanup can be retried separately.
    }
    return { removed: true };
  }
}

@Module({ controllers: [MediaController] })
export class MediaModule {}
