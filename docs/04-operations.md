# Configuração e operação

## Ambientes

Use projeto Supabase de staging separado. `backend/.env` é carregado localmente; no deploy variáveis são injetadas. URL/anon key podem ir para frontend. Service role, conexão PostgreSQL e bot token são privados do backend. Discord client ID/secret são configurados no provedor Supabase, não exigidos pelo processo Nest porque o OAuth é gerenciado pelo Supabase.

Para `DATABASE_URL`, use a conexão transaction pooler recomendada no dashboard Supabase, no formato e porta daquele projeto. Não imprimir a URL. SSL com validação de certificado habilitado por padrão; `DATABASE_SSL=false` somente em PostgreSQL local de testes. Cada instância Nest mantém até três conexões; validar limites do pooler e concorrência Vercel em staging.

## Auth e Discord

1. Criar aplicação Discord OAuth e bot no Developer Portal da comunidade.
2. Autorizar bot no guild correto. Verificar requisitos/permissões/intents aplicáveis a Search Guild Members; nenhuma paginação de todos os usuários é usada. Consultar [Discord Guild API](https://docs.discord.com/developers/resources/guild#search-guild-members).
3. Configurar provedor Discord em Supabase Authentication com client ID/secret e callback indicado pelo Supabase. Configurar Site URL e allowlist de redirects `https://WEB_DOMAIN/auth/callback` e localhost de desenvolvimento. Ver [Supabase Discord OAuth](https://supabase.com/docs/guides/auth/social-login/auth-discord).
4. No backend, configurar bot token e Guild ID. OAuth do usuário autentica; o bot verifica membership/roles independentemente.
5. Fazer primeiro login no frontend real. A API `/me` provisiona profile a partir da identidade Discord verificada; metadados editáveis não definem ID nem função.
6. Como operador SQL autorizado, promover o profile correto uma única vez, após verificar Discord ID e UUID. Depois, super_admin pode gerenciar outras funções no painel.

```sql
-- Substituir pelo UUID de auth.users já provisionado em awards.profiles.
insert into awards.user_roles(user_id,role)
values ('UUID_VERIFICADO','super_admin')
on conflict(user_id) do update set role=excluded.role;
```

Não conceder uso do schema awards a anon/authenticated e não adicioná-lo aos schemas expostos por PostgREST. A conexão do backend deve ter privilégios para os recursos awards; `postgres`/owner de projeto Supabase é o caminho inicial. Em evolução, usar role privada limitada com BYPASSRLS e privilégios específicos. Não usar essa credencial no navegador. RLS sem policies permissivas e revogação de grants protegem acesso direto; as regras de autorização na API continuam obrigatórias porque a conexão privada é privilegiada.

## Migrations e seed

Runner lê migrations em ordem, registra as aplicadas e usa lock e transação por arquivo. SQL 001 modela plataforma, 002 cria bucket, 003 reforça regras de submissão, 005 abre a exceção transacional usada pela exclusão explícita de uma edição e 006 reaplica o hardening de RLS. A 006 mantém RLS habilitada em todas as tabelas `awards`, revoga privilégios de `public`, `anon` e `authenticated` e instala políticas restritivas que negam acesso direto mesmo se um grant for reintroduzido por engano. O ledger `public.awards_migrations` também fica protegido. O backend continua sendo a única fronteira privilegiada; por isso, não usamos `FORCE ROW LEVEL SECURITY` com a role atual do pooler, pois isso bloquearia o próprio backend até existir uma role privada dedicada com configuração equivalente.

Seed é transacional, contém edição fictícia, seis categorias, vinte membros sintéticos, três auth fixtures sem credenciais usáveis, cédulas e histórico fictício. Seed não cria admin automaticamente e nunca deve ser aplicado no banco de produção.

Executar em staging após backup seguindo docs/03. Confirmar Storage bucket award-media público somente para leitura de imagens; sem policies de escrita para browser. API admin aceita PNG/JPEG/WebP com signature check e até 2 MB para manter payload base64 abaixo do limite de função. SVG não é aceito em uploads; o SVG de identidade é código original versionado.

## Vercel

Dois projetos do mesmo monorepo:

- Web: Root Directory `frontend`, framework Vite, incluir arquivos fora da raiz para workspace contracts. Build conforme frontend/vercel.json, saída `dist`. Preencher variáveis públicas em cada ambiente. Editar o domínio placeholder da rewrite /api para o domínio efetivo do backend antes do deploy.
- API: Root Directory `backend`, preset **Other** para o handler Node em `api/index.ts`, incluir arquivos fora da raiz. O handler inicializa Nest/Fastify uma vez por instância. backend/vercel.json roteia /api/* para esse handler. Secrets em ambiente privado; WEB_ORIGIN deve corresponder ao frontend. O handler é uma alternativa explícita ao [preset nativo NestJS](https://vercel.com/docs/frameworks/backend/nestjs); não misturar os dois modos de entrada.

API possui validação de startup, CORS origem exata, Helmet e rate limit por instância. Rate limit/cache/cooldown em memória não são globais entre instâncias serverless; integridade depende de transações/constraints, não deles. Aumentar proteção de borda somente após medir abuso. Swagger público documenta endpoints, sem expor dados de produção; operações continuam protegidas por token/roles.

Deploy real e configuração de domínios/OAuth não foram executados. Fazer smoke tests reais de OAuth, search e roles; validar transação no pooler, chamadas concorrentes, Storage e warm/cold invocations antes de lançar a edição. Custos/free tier dependem dos planos atuais e uso; nenhuma garantia de atendimento a milhares de requests simultâneos sem load test.

## Ciclo administrativo

Criar edição e categorias/regras na preparação. É possível exibir o pré-evento e selecionar qual edição ocupa a Home. Abrir indicações dentro do período configurado; ao revisar, associar sugestões manuais e rejeitar/mesclar correções. A revisão agrupada aplica decisões ao candidato por categoria; duplicações da mesma pessoa ao mesclar não geram indicações extras e autoindicações manuais são rejeitadas quando proibidas.

Adicionar/ordenar candidatos oficiais, de dois até o máximo configurado por categoria; anúncio revalida elegibilidade via Discord. Abrir votação; categorias/regras ficam congeladas. Antes de enviar, usuário revisa escolhas; depois da confirmação, não existe endpoint de alteração ou reabertura. Encerrar votação, apurar, resolver empates de primeiro lugar com motivo, ajustar visibilidade de resultados quando permitido, publicar e arquivar. Duplicação copia categorias/regras e branding enviados no formulário; não copia candidatos, indicações, cédulas ou resultados. Datas são redefinidas para impedir abertura acidental na temporada seguinte.

## Recuperação

Nunca editar cédulas confirmadas para corrigir operação. Revisar logs privados; erros retornam mensagens seguras. Requests incertos devem repetir mesma idempotency key e payload; API devolve o recibo existente mesmo após fechamento. Se novas escolhas forem enviadas com a mesma chave ou nova chave após submissão, conflito. Para produção, definir responsável pelo tratamento, política de retenção/exportação e contato antes do lançamento; o texto público inicial explicita o que é armazenado.
