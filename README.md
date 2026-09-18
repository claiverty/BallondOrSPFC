# Ballon d’Or SPFC Platform

Reconstrução full stack da premiação da comunidade SPFC no Discord. Edições, categorias, períodos e regras são dados configurados pela administração.

```text
frontend/             React, Vite, TypeScript e experiência pública/admin
backend/              NestJS, Fastify, autenticação e regras de domínio
packages/contracts/   Tipos, schemas Zod e state machine
supabase/             Migrations aditivas e seed fictício
legacy/               Código e assets originais preservados, fora do deploy
tests/               Domínio, SQL/PostgreSQL, HTTP e Playwright
docs/                Auditoria, arquitetura, migração, operação e validação
```

## Preview local

Node.js 22.18+ e dependências do workspace. Com as dependências disponíveis:

```sh
npm run dev
```

Abra a URL exibida. Sem variáveis Supabase, o modo de desenvolvimento usa dados demonstrativos e identifica o preview em todas as páginas. Nenhum voto, indicação ou ação administrativa real é gravado nesse modo. No build de produção o preview exige `VITE_DEMO_MODE=true` explícito; sem configuração a plataforma não simula autenticação.

## Conectar serviços reais

Copie `frontend/.env.example` para `frontend/.env` e `backend/.env.example` para `backend/.env`, preencha os valores e defina `VITE_DEMO_MODE=false`. Não publique secrets nem envie valores privados em mensagens.

```sh
npm run db:migrate
npm run db:seed        # Somente banco de desenvolvimento separado
npm run dev:backend   # Terminal 1: API em :3001
npm run dev           # Terminal 2: frontend com proxy /api
```

Configure Discord OAuth no Supabase, bot no servidor e primeiro super_admin conforme [operação](docs/04-operations.md). As migrations criam schema `awards` separado; não alteram `public.votos`. Banco existente não foi acessado ou modificado. Não executar migração/seed em produção sem seguir [plano de migração](docs/03-migration-plan.md).

## Fluxos implementados

- Home por fase/período, categorias, indicados, cerimônia e contagem regressiva.
- Supabase Auth/Discord OAuth, identidade verificada e autorização por roles privadas.
- Busca Discord server-side, debounce, oito resultados, cache curto e tratamento de rate limits.
- Indicações editáveis por categoria; fallback manual; revisão agrupada/paginada e associação de ID; candidatos oficiais com elegibilidade.
- Votação por etapas, seleção por teclado, rascunho por edição/pessoa, revisão e envio transacional/idempotente; uma cédula por edição.
- Administração de edições/categorias/regras/ordem, duplicação, ciclo de vida, usuários/funções e mídia no Supabase Storage.
- Analytics privados e agregados, apuração em snapshot, resolução de empate auditada e publicação explícita.
- Vencedores, histórico, Hall of Fame, perfis históricos e ranking de vitórias derivado do banco.
- Swagger em `/api/docs`; CI com PostgreSQL e Playwright.

## Verificação

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

A suíte local usa PostgreSQL em PGlite e mocks nas fronteiras externas de Auth/Discord. A suíte de concorrência com conexões PostgreSQL independentes roda no CI, ou localmente com `TEST_DATABASE_URL` apontando somente para o banco isolado `awards_test`. OAuth/bot reais e deploy precisam de smoke tests em staging. Veja [validação e limites](docs/05-validation.md).

O código segue os parâmetros de formatação do Prettier em `.prettierrc.json`; não é necessário instalar uma ferramenta para seguir esse padrão.

## Documentação

- [Auditoria do legado](docs/01-legacy-audit.md)
- [ADR e arquitetura](docs/02-architecture.md)
- [Plano de migração](docs/03-migration-plan.md)
- [Configuração, deploy e operação](docs/04-operations.md)
- [Validação e limites](docs/05-validation.md)
