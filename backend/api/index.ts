import type { IncomingMessage, ServerResponse } from 'node:http';
import { bootstrap } from '../src/bootstrap';
let instance: ReturnType<typeof bootstrap> | undefined;
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    instance ??= bootstrap().catch((error) => {
      instance = undefined;
      throw error;
    });
    const app = await instance;
    app.getHttpAdapter().getInstance().server.emit('request', req, res);
  } catch {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'A plataforma está temporariamente indisponível.' }));
  }
}
