import { ApiZodBody } from '../common/openapi';
import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Module,
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
  @ApiZodBody(UploadSchema)
  @Post()
  async upload(
    @Req()
    r: AuthRequest,
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
    const path = `${data.edition_id}/${randomUUID()}.${ext}`;
    return this.db.transaction(async (c) => {
      const edition = await lockEdition(c, data.edition_id, true);
      if (['RESULTS_PUBLISHED', 'ARCHIVED'].includes(edition.status))
        throw new BadRequestException('A mídia desta edição está bloqueada.');
      const { error } = await this.storage
        .from('award-media')
        .upload(path, bytes, { contentType: data.mime_type, upsert: false });
      if (error) throw new BadRequestException('Não foi possível salvar a imagem no Storage.');
      const { data: publicData } = this.storage.from('award-media').getPublicUrl(path);
      try {
        await c.query(
          'insert into awards.media_assets(edition_id,storage_path,url,created_by) values($1,$2,$3,$4)',
          [data.edition_id, path, publicData.publicUrl, r.identity.id],
        );
        await audit(c, r.identity.id, data.edition_id, 'media.uploaded', path, 'Upload de imagem');
        return { url: publicData.publicUrl };
      } catch (e) {
        await this.storage.from('award-media').remove([path]);
        throw e;
      }
    });
  }
}
@Module({ controllers: [MediaController] })
export class MediaModule {}
