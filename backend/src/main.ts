import { bootstrap } from './bootstrap';
import { env } from './common/env';
bootstrap()
  .then((app) => app.listen(env().PORT, '0.0.0.0'))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : 'Falha na inicialização');
    process.exit(1);
  });
