import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { DatabaseModule } from './common/database';
import { AuthModule } from './auth/auth';
import { EditionsModule } from './editions/editions';
import { DiscordModule } from './discord/discord';
import { NominationsModule } from './nominations/nominations';
import { BallotsModule } from './ballots/ballots';
import { AdminModule } from './admin/admin.controller';
import { MediaModule } from './admin/media';
import { ResultsModule } from './results/results';
@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    EditionsModule,
    DiscordModule,
    NominationsModule,
    BallotsModule,
    AdminModule,
    ResultsModule,
    MediaModule,
  ],
})
export class AppModule {}
