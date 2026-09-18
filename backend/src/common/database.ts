import { Global, Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResultRow } from 'pg';
import { databaseSsl } from './database-ssl';
import { env } from './env';
@Injectable()
export class Database implements OnModuleDestroy {
  readonly pool = new Pool({
    connectionString: env().DATABASE_URL,
    max: 3,
    ssl: databaseSsl(env().DATABASE_SSL === 'true'),
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
  });
  async query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) {
    return (await this.pool.query<T>(sql, params)).rows;
  }
  async transaction<T>(action: (client: PoolClient) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try {
      await c.query('begin');
      const result = await action(c);
      await c.query('commit');
      return result;
    } catch (e) {
      await c.query('rollback');
      throw e;
    } finally {
      c.release();
    }
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
@Global()
@Module({ providers: [Database], exports: [Database] })
export class DatabaseModule {}
