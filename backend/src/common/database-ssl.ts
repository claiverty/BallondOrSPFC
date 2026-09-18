import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const certificateFile = 'supabase-prod-ca-2021.crt';

function certificatePath() {
  const candidates = [
    resolve(process.cwd(), 'certs', certificateFile),
    resolve(process.cwd(), 'backend', 'certs', certificateFile),
  ];

  const path = candidates.find(existsSync);

  if (!path) throw new Error('Certificado TLS do Supabase não encontrado.');

  return path;
}

export function databaseSsl(enabled: boolean) {
  if (!enabled) return false;

  return {
    ca: readFileSync(certificatePath(), 'utf8'),
    rejectUnauthorized: true,
  };
}
