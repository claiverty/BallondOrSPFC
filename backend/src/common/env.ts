import { loadEnvFile } from 'node:process';
try {
  loadEnvFile();
} catch {
  /* Environment is provided directly in deployment. */
}
import { z } from 'zod';
export const EnvSchema = z.object({
  DATABASE_URL: z.string().startsWith('postgres'),
  DATABASE_SSL: z.enum(['true', 'false']).default('true'),
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  DISCORD_BOT_TOKEN: z.string().min(10),
  DISCORD_GUILD_ID: z.string().regex(/^\d{17,20}$/),
  WEB_ORIGIN: z.url(),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
});
export function env() {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success)
    throw new Error(
      `Configuração ausente ou inválida: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`,
    );
  return parsed.data;
}
