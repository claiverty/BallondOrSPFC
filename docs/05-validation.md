# Validação — 17/09/2026

## Executado localmente

- Lint ESLint e TypeScript strict para frontend, backend, handler Vercel e contratos.
- Build Vite e compilação NestJS.
- 40 testes de domínio, HTTP/Nest e PostgreSQL/PGlite passaram. Migrations 001/003 e seed executados em banco efêmero, sem contato com produção.
- 12 testes Playwright passaram em Chromium desktop e viewport iPhone: navegação, overflow, seleção por teclado, categorias obrigatórias, rascunho, review, isolamento do preview, histórico, perfis, reduced motion, busca com debounce, manual fallback e persistência entre categorias de indicação.
- Ciclo administrativo completo por HTTP: nova edição/categorias → abertura → indicação manual → associação/revisão → candidatos oficiais → anúncio → votação → encerramento → apuração privada → publicação → arquivo. Fronteiras Auth/Discord usam mocks, não contas reais.
- Banco rejeita voto duplicado, cédula parcial no COMMIT, FKs de outra edição, atualização/exclusão de cédula, escrita fora da fase/período e acesso de anon/authenticated. Apenas a transação original pode inserir itens da cédula.
- HTTP concorrente com adaptador PGlite serializado aceita uma participação e rejeita as restantes; retries idempotentes retornam recibo igual. Não equivale a teste com conexões PostgreSQL independentes.
- Revisão visual por screenshots em 1440 px e 375 px. Troféu SVG original, tokens, alvos de toque e estados acessíveis. Retratos otimizados de aproximadamente 31 MB para 524 KB, fontes Latin locais e lazy loading de fluxos/admin. Nenhum logo/asset das referências externas foi utilizado na interface nova.

## Preparado, mas não executado localmente

Três testes de concorrência em PostgreSQL com conexões independentes foram ignorados por ausência de TEST_DATABASE_URL. CI configura postgres:17 e executa esses testes: submissões simultâneas, idempotência simultânea e fechamento concorrente. CI não foi disparado remotamente, porque não houve push/PR.

Bucket Storage 002 e credenciais/configuração reais precisam ser validados em staging Supabase. Login OAuth real, permissões/intents e rate limit do bot, deploy Vercel e cold invocations não foram verificados em contas externas. Não houve migração, importação de votos históricos ou alteração em produção.

## Limites de escopo/operação

- Categorias e regras congelam ao abrir o processo; configurar tudo na preparação. Correção pós-abertura/reabertura não existe nesta versão e requer domínio/auditoria próprios.
- Sem cron: status avança por ação admin explícita. Datas fecham efetivamente escrita e mudam a apresentação pública por regras centralizadas; consultas de edição atualizam a cada minuto. Revelação/publicação não ocorre sozinha.
- Cache/rate limit/cooldown em memória têm escopo de instância serverless, não global. Sem Redis ou filas. Respostas 429 não são repetidas imediatamente.
- Acompanhamento administrativo usa agregados por candidato/categoria e linha temporal; não expõe votos individuais. Detecção sofisticada de fraude/anomalias e gráficos históricos adicionais dependem de dados reais e requisitos específicos.
- Records implementa ranking de vitórias derivado; demais estatísticas propostas têm dados relacionais disponíveis, mas não páginas próprias neste ciclo.
- Review suporta grupos/paginação e associação de ID; não executa regras customizadas arbitrárias. Roles, blacklist e tenure já possuem validators.
- Media é limitada a 2 MB por imagem no envio à API; Storage público é para assets revisados. Compensação de upload falho cobre erro de persistência na operação; limpeza de objetos órfãos por falha de commit/rede requer rotina operacional posterior.
- Conteúdo histórico 2024/2025 e Discord IDs reais devem ser reconciliados antes de importação. Seed é fictício. Preview usa retratos do legado e IDs sintéticos; não atribui votos reais a essas pessoas.
- Auditoria de acessibilidade automatizada completa, carga de milhares de usuários, autorização de direitos dos assets e política de retenção definida pela organização ficam para validação de lançamento.

O legado completo permanece em legacy/. O repositório antigo já versionava alguns arquivos de node_modules/dist; eles não foram incluídos nos builds da plataforma e a nova configuração os ignora. Não foi alterado o index do Git nem criado commit.
