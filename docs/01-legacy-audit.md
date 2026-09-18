# Auditoria do legado — 17/09/2026

Inspeção de todos os HTML, scripts, estilos, README e inventário de assets locais; conferido repositório remoto. Checkout limpo antes das alterações. Não há schema SQL, migrations, policies, testes ou configuração de deploy versionados. Nenhuma conexão ao banco de produção foi realizada. A auditoria do schema/dados/RLS ao vivo depende de acesso autorizado e exportação; não se pode deduzir proteção pela interface.

## Regras recuperadas

Discord OAuth via Supabase; uma participação por usuário; seis categorias em 2025: O mais querido, Staff do Ano, Membro do Ano, Membro mais ativo, Rei da resenha, O mais chato. Cinco candidatos por categoria, nomes como valores. Arquivo 2024 tem O mais querido, Fabuloso, Terror do Morumbi. Winners 2025: Claiverty (querido/staff), Theus (membro), Thais (ativo), Sukita (resenha), Bambinox (chato). Histórico é conteúdo editorial, não apuração verificável.

## Achados

- Crítico condicional: resultados.js busca `votos.select('*')`; autorização só compara UUID no cliente. Se RLS permitir leitura, qualquer usuário consulta votos brutos. Policies não disponíveis para confirmar exploração.
- Alto: prazo de votação validado só no relógio do navegador. Deadline 26/09 difere do countdown 27/09/2025.
- Alto: consulta antes de insert não resolve requests simultâneas; constraint unique desconhecida.
- Alto: valores de candidatos e colunas aceitos sem validação de domínio no servidor. Membership/roles não verificados.
- Alto: user_metadata interpolado em innerHTML é risco de DOM XSS. `user.id` pode ser acessado sem user em submit após sessão expirada.
- Médio: categorias/nominees/winners/ano/datas/admin hardcoded; novas edições exigem edição de código/schema.
- Médio: radio display:none remove teclado; foco não explícito, seleção depende de cor, imagens com alt genérico/copypaste, dourado/branco com contraste insuficiente.
- Médio: CSS repete container/categoria-bloco, estilos globais e header fixo; mobile reduz links para alvos pequenos. Nenhum reduced-motion.
- Médio: vercel.js contém import de pacote, carregado como script clássico sem bundler.
- Informação: anon key pública não é service role secret; segurança depende de RLS. Não reutilizar configuração do projeto legado.

## Decisões

Reutilizar identidade preto/dourado/vermelho, nomes/categorias e retratos existentes; verificar direitos antes de publicação. Não reutilizar logo Ballon d’Or oficial. Novo símbolo SVG original. Preservar original em legacy/ (excluído do deploy). Descartar arquitetura/formulário/controle cliente de privilégios. Não inventar Discord IDs para os membros reais: assets só no preview demonstrativo. Histórico deve ser importado e revisado por admin.

## Referências

[Streamer Awards](https://thestreamerawards.com/home): resposta indexada exige JavaScript; usar princípios de UX descritos pelo briefing, sem alegar inspeção pixel a pixel. [Ballon d’Or](https://ballondor.com/pt): navegação editorial, nominees, winners e cerimônia; interpretação original, sem assets externos.
