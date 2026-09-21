import { ApiZodBody } from '../common/openapi';
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import {
  CreateEditionSchema,
  CreateCategorySchema,
  OfficialNomineeSchema,
  ReviewNominationSchema,
  TransitionSchema,
  id,
  snowflake,
} from '@awards/contracts';
import { EditionAdminService } from './edition-admin.service';
import { CategoryAdminService } from './category-admin.service';
import { NomineeAdminService } from './nominee-admin.service';
import { AnalyticsAdminService } from './analytics-admin.service';
import { UserAdminService } from './user-admin.service';
import { MemberAdminService } from './member-admin.service';
import { AuthGuard, AdminGuard, AuthRequest } from '../auth/auth';
import { DiscordModule } from '../discord/discord';
import { ZodPipe } from '../common/validation';
const ReasonSchema = z.object({ reason: z.string().min(3).max(500) });
const LinkMemberSchema = ReasonSchema.extend({ discord_user_id: snowflake });
const ReorderCategoriesSchema = z.object({
  category_ids: z
    .array(id)
    .min(1)
    .max(100)
    .refine((ids) => new Set(ids).size === ids.length),
});
const ReorderNomineesSchema = z.object({
  nominee_ids: z
    .array(id)
    .min(1)
    .max(20)
    .refine((ids) => new Set(ids).size === ids.length),
  reason: z.string().trim().min(3).max(500),
});
@ApiTags('Administration')
@ApiBearerAuth()
@UseGuards(AuthGuard, AdminGuard)
@Controller('admin')
class AdminController {
  constructor(
    @Inject(EditionAdminService) private readonly editionsService: EditionAdminService,
    @Inject(CategoryAdminService) private readonly categoriesService: CategoryAdminService,
    @Inject(NomineeAdminService) private readonly nomineesService: NomineeAdminService,
    @Inject(AnalyticsAdminService) private readonly analyticsService: AnalyticsAdminService,
    @Inject(UserAdminService) private readonly usersService: UserAdminService,
    @Inject(MemberAdminService) private readonly membersService: MemberAdminService,
  ) {}
  @Get('editions') editions() {
    return this.editionsService.editions();
  }
  @ApiZodBody(CreateEditionSchema)
  @Post('editions')
  create(
    @Req() r: AuthRequest,
    @Body(new ZodPipe(CreateEditionSchema)) b: z.output<typeof CreateEditionSchema>,
  ) {
    return this.editionsService.saveEdition(r.identity.id, b);
  }
  @ApiZodBody(CreateEditionSchema)
  @Patch('editions/:edition')
  update(
    @Req() r: AuthRequest,
    @Param('edition', ParseUUIDPipe) e: string,
    @Body(new ZodPipe(CreateEditionSchema)) b: z.output<typeof CreateEditionSchema>,
  ) {
    return this.editionsService.saveEdition(r.identity.id, b, e);
  }
  @Delete('editions/:edition') deleteEdition(
    @Req() r: AuthRequest,
    @Param('edition', ParseUUIDPipe) e: string,
  ) {
    return this.editionsService.deleteEdition(r.identity.id, e);
  }
  @ApiZodBody(CreateEditionSchema)
  @Post('editions/:edition/duplicate')
  duplicate(
    @Req() r: AuthRequest,
    @Param('edition', ParseUUIDPipe) e: string,
    @Body(new ZodPipe(CreateEditionSchema)) b: z.output<typeof CreateEditionSchema>,
  ) {
    return this.editionsService.duplicate(r.identity.id, e, b);
  }
  @ApiZodBody(TransitionSchema)
  @Post('editions/:edition/transition')
  transition(
    @Req() r: AuthRequest,
    @Param('edition', ParseUUIDPipe) e: string,
    @Body(new ZodPipe(TransitionSchema)) b: z.output<typeof TransitionSchema>,
  ) {
    return this.editionsService.transition(r.identity.id, e, b);
  }
  @Get('editions/:edition/categories') categories(@Param('edition', ParseUUIDPipe) e: string) {
    return this.categoriesService.categories(e);
  }
  @ApiZodBody(CreateCategorySchema)
  @Post('editions/:edition/categories')
  category(
    @Req() r: AuthRequest,
    @Param('edition', ParseUUIDPipe) e: string,
    @Body(new ZodPipe(CreateCategorySchema)) b: z.output<typeof CreateCategorySchema>,
  ) {
    return this.categoriesService.saveCategory(r.identity.id, e, b);
  }
  @ApiZodBody(CreateCategorySchema)
  @Patch('editions/:edition/categories/:category')
  updateCategory(
    @Req() r: AuthRequest,
    @Param('edition', ParseUUIDPipe) e: string,
    @Param('category', ParseUUIDPipe) c: string,
    @Body(new ZodPipe(CreateCategorySchema)) b: z.output<typeof CreateCategorySchema>,
  ) {
    return this.categoriesService.saveCategory(r.identity.id, e, b, c);
  }
  @ApiZodBody(ReorderCategoriesSchema)
  @Patch('editions/:edition/categories/reorder')
  reorderCategories(
    @Req() r: AuthRequest,
    @Param('edition', ParseUUIDPipe) e: string,
    @Body(new ZodPipe(ReorderCategoriesSchema)) b: z.output<typeof ReorderCategoriesSchema>,
  ) {
    return this.categoriesService.reorderCategories(r.identity.id, e, b.category_ids);
  }
  @Delete('editions/:edition/categories/:category') deleteCategory(
    @Req() r: AuthRequest,
    @Param('edition', ParseUUIDPipe) e: string,
    @Param('category', ParseUUIDPipe) c: string,
  ) {
    return this.categoriesService.deleteCategory(r.identity.id, e, c);
  }
  @Get('editions/:edition/nominations') nominations(
    @Param('edition', ParseUUIDPipe) e: string,
    @Query('offset', new ZodPipe(z.coerce.number().int().min(0).max(100000).default(0)))
    offset: number,
    @Query('category_id', new ZodPipe(id.optional())) categoryId?: string,
  ) {
    return this.nomineesService.nominations(e, offset, categoryId);
  }
  @ApiZodBody(ReviewNominationSchema)
  @Patch('editions/:edition/nominations/:nomination')
  review(
    @Req() r: AuthRequest,
    @Param('edition', ParseUUIDPipe) e: string,
    @Param('nomination', ParseUUIDPipe) n: string,
    @Body(new ZodPipe(ReviewNominationSchema)) b: z.output<typeof ReviewNominationSchema>,
  ) {
    return this.nomineesService.review(r.identity.id, e, n, b);
  }
  @ApiZodBody(OfficialNomineeSchema)
  @Post('editions/:edition/categories/:category/nominees')
  official(
    @Req() r: AuthRequest,
    @Param('edition', ParseUUIDPipe) e: string,
    @Param('category', ParseUUIDPipe) c: string,
    @Body(new ZodPipe(OfficialNomineeSchema)) b: z.output<typeof OfficialNomineeSchema>,
  ) {
    return this.nomineesService.official(r.identity.id, e, c, b);
  }
  @ApiZodBody(ReorderNomineesSchema)
  @Patch('editions/:edition/categories/:category/nominees/reorder')
  reorderOfficial(
    @Req() r: AuthRequest,
    @Param('edition', ParseUUIDPipe) e: string,
    @Param('category', ParseUUIDPipe) c: string,
    @Body(new ZodPipe(ReorderNomineesSchema)) b: z.output<typeof ReorderNomineesSchema>,
  ) {
    return this.nomineesService.reorderOfficial(r.identity.id, e, c, b.nominee_ids, b.reason);
  }
  @ApiZodBody(ReasonSchema)
  @Delete('editions/:edition/categories/:category/nominees/:nominee')
  removeOfficial(
    @Req() r: AuthRequest,
    @Param('edition', ParseUUIDPipe) e: string,
    @Param('category', ParseUUIDPipe) c: string,
    @Param('nominee', ParseUUIDPipe) n: string,
    @Body(new ZodPipe(ReasonSchema)) b: z.output<typeof ReasonSchema>,
  ) {
    return this.nomineesService.removeOfficial(r.identity.id, e, c, n, b.reason);
  }
  @Get('editions/:edition/analytics') analytics(@Param('edition', ParseUUIDPipe) e: string) {
    return this.analyticsService.analytics(e);
  }
  @Get('editions/:edition/results') results(@Param('edition', ParseUUIDPipe) e: string) {
    return this.analyticsService.results(e);
  }
  @ApiZodBody(ReasonSchema.extend({ category_id: id, nominee_id: id }))
  @Post('editions/:edition/ties')
  ties(
    @Req() r: AuthRequest,
    @Param('edition', ParseUUIDPipe) e: string,
    @Body(new ZodPipe(ReasonSchema.extend({ category_id: id, nominee_id: id })))
    b: { category_id: string; nominee_id: string; reason: string },
  ) {
    return this.analyticsService.resolveTie(
      r.identity.id,
      e,
      b.category_id,
      b.nominee_id,
      b.reason,
    );
  }
  @Get('editions/:edition/audit') logs(@Param('edition', ParseUUIDPipe) e: string) {
    return this.analyticsService.logs(e);
  }
  @Get('users') users() {
    return this.usersService.users();
  }
  @Get('members') members() {
    return this.membersService.members();
  }
  @ApiZodBody(LinkMemberSchema)
  @Patch('members/:member/link')
  linkMember(
    @Req() r: AuthRequest,
    @Param('member', ParseUUIDPipe) member: string,
    @Body(new ZodPipe(LinkMemberSchema)) b: z.output<typeof LinkMemberSchema>,
  ) {
    return this.membersService.link(r.identity, member, b.discord_user_id, b.reason);
  }
  @ApiZodBody(z.object({ role: z.enum(['user', 'admin', 'super_admin']) }))
  @Patch('users/:user/role')
  role(
    @Req() r: AuthRequest,
    @Param('user', ParseUUIDPipe) u: string,
    @Body(new ZodPipe(z.object({ role: z.enum(['user', 'admin', 'super_admin']) })))
    b: { role: string },
  ) {
    return this.usersService.setRole(r.identity, u, b.role);
  }
}
@Module({
  imports: [DiscordModule],
  providers: [
    EditionAdminService,
    CategoryAdminService,
    NomineeAdminService,
    AnalyticsAdminService,
    UserAdminService,
    MemberAdminService,
  ],
  controllers: [AdminController],
})
export class AdminModule {}
