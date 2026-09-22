# ADR 001 — Modular monolith e edições como dados

React/Vite/Router + TanStack Query para estado remoto; RHF/Zod em formulários. NestJS/Fastify com módulos de domínio; contratos Zod compartilhados. PostgreSQL no Supabase, schema `awards` isolado do legado. Supabase Auth Discord verifica token remotamente; Discord ID obtido da identidade do provedor, nunca de metadata editável. Roles privadas no banco e Guards. PostgreSQL acessado apenas pelo backend com conexão pooler e secrets. Schema não exposto no PostgREST; RLS habilitada em todas as tabelas, privilégios anon/authenticated revogados e políticas restritivas de negação reaplicadas pela migration 006. API pública retorna apenas DTOs permitidos. Não há escrita direta pelo browser.

Transações usam lock de edição para coordenar fechamento/configuração com submissão; unique edition/user e ballot/category e FKs compostas garantem integridade. Um Discord ID não pode ter perfis duplicados. Rascunho local não representa voto; chave por edição e usuário, e idempotency key preservada no retry. Ballot confirmado imutável, sem API de reabertura neste ciclo.

Nominations: array por usuário/categoria substituído atomicamente, limite configurável, advisory lock; membership e regras de Discord role/blacklist/tempo mínimo validados no backend. Manual recebe pending_review e só vira nominee após resolução do Discord ID. Official nominees revisados, limite e elegibilidade antes de anúncio. Não promover automaticamente ranking.

Resultados são apurados no servidor em snapshot privado em RESULTS_READY. Empates exigem decisão administrativa explícita e auditada. Páginas de vencedores exibem o Top 3 com percentuais; o Hall da Fama exibe apenas os vencedores, sem quantidades ou percentuais. Nenhum voto individual sai pela API. Analytics agregados privados. Histórico/Hall/records derivados de snapshots publicados e memberships oficiais, identificados por category slug. Perfis históricos via Discord ID.

State machine sequencial em contracts, verificada no backend e novamente em SQL trigger. Status não avança sozinho por relógio: admin controla reveal/publicação. Períodos UTC limitam escrita; frontend usa state copy centralizado. Datas são exibidas em America/Sao_Paulo. Nenhum scheduler externo necessário.

## Topologia

frontend: deploy Vercel estático; backend: segundo projeto Vercel função Node com Nest/Fastify inicializado uma vez por instância; local porta 3001. Web /api proxy via rewrite para domínio API. Auth callback no domínio web configurado no Supabase. Discord OAuth secret somente no dashboard Supabase; bot token/Guild ID somente backend. API usa CORS origem exata e rate limit em memória por instância (limitação serverless documentada; integridade não depende disso). Discord retry_after/global cooldown, cache curto bounded; sem listar todos os membros.

## Fronteiras e evolução

Módulos: common, auth, discord, editions, nominations, ballots, admin, results. Não criar módulo vazio para cada substantivo. UI compartilhada no próprio web; pacote UI só quando houver segundo consumidor. Media via bucket Supabase administrado por API. Fan zone fora do MVP. Regras customizadas arbitrárias não executadas: evolução por schema/versionamento e validators explícitos.

## Operação

CI lint/typecheck/domain+Postgres tests/build/e2e. Logging JSON sem tokens/ballot escolhas. DB erro mapeado para mensagem segura. Startup valida env. Deploy/migração em produção depende de credenciais e backup; não executado automaticamente. Conexão de baixa concorrência com pooler, sem prepared statements. Free tiers são objetivo de custo, não SLA ou capacidade garantidos.
