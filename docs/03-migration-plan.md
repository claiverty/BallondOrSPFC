# Migração incremental e cutover

1. Exportar schema/policies/functions/storage e backup de votos e auth identities do projeto existente. Registrar counts/checksums e período/ano de origem; legado não identifica edição.
2. Executar migrations versionadas primeiro em projeto Supabase de staging. Schema awards aditivo; não DROP/ALTER legado. Provisionar conexão backend, bot, OAuth, Storage e primeiro super_admin por operador SQL.
3. Construir mapa revisado de colunas para category slugs e nomes legados para Discord IDs. Nunca associar por username automaticamente. Ambiguidades ficam em relatório de quarentena.
4. Importar editions arquivadas, membros, candidatos e ballots numa ferramenta offline revisada. Duplicações/sessões ausentes inválidas não contam. Resultados editoriais 2024/2025 importados somente após confirmação; não inventar quantidades de votos.
5. Validar contagens por edição/categoria, unique por pessoa, FKs, empate/resultado e privacidade. Usar amostras reconciliadas e teste com anon/authenticated.
6. Janela de manutenção: fechar legado, delta backup, validar, apontar web/API para plataforma nova, smoke test OAuth/admin/voto. Rollback mantém snapshot e legado; não mesclar votos de janelas diferentes.
7. Após retenção e aprovação explícita, desativar escrita no legado. Remoção de tabelas antigas não faz parte destas migrations.

Não foi possível auditar dados reais porque não há export/credenciais disponíveis. Seed contém somente edição fictícia e nomes/IDs sintéticos. Preview visual usa retratos legados com indicação explícita de demonstração, sem votos reais.
