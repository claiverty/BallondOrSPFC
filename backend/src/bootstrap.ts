import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { AppModule } from './app';
import { env } from './common/env';
import { ErrorFilter } from './common/errors';
export async function bootstrap() {
  env();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: { level: 'info', redact: ['req.headers.authorization', 'req.body'] },
      bodyLimit: 3 * 1024 * 1024,
    }),
  );
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new ErrorFilter());
  app.enableCors({
    origin: env().WEB_ORIGIN,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  });
  await app.register(helmet);
  await app.register(rateLimit, { max: 60, timeWindow: '1 minute' });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}
