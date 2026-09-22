-- Fictional data only. Run on a separate development database.
insert into awards.editions (id,name,slug,year,status,description,tagline,nominations_open_at,nominations_close_at,voting_open_at,voting_close_at)
values ('10000000-0000-4000-8000-000000000001','Ballon d’Or SPFC — Desenvolvimento','2027',2027,'DRAFT','Edição fictícia para desenvolvimento.','A comunidade faz história.','2027-01-01T00:00:00Z','2027-02-01T00:00:00Z','2027-03-01T00:00:00Z','2027-12-01T00:00:00Z');
insert into awards.categories (edition_id,slug,name,description,display_order)
select '10000000-0000-4000-8000-000000000001',slug,name,'Categoria fictícia de desenvolvimento.',ord from (values ('membro-do-ano','Membro do Ano',0),('staff-do-ano','Staff do Ano',1),('rei-da-resenha','Rei da resenha',2),('mais-querido','O mais querido',3),('membro-mais-ativo','Membro mais ativo',4),('o-mais-chato','O mais chato',5)) as c(slug,name,ord);
insert into awards.members (discord_user_id,username,display_name) select (900000000000000000+i)::text,'dev-member-'||i,'Participante de teste '||i from generate_series(1,20) i;
insert into awards.category_nominees (category_id,edition_id,nominee_id,display_order) select c.id,c.edition_id,m.id,row_number() over(partition by c.id order by m.discord_user_id)-1 from awards.categories c cross join (select * from awards.members order by discord_user_id limit 5) m;
-- Synthetic auth identities: SQL fixtures only, not usable Discord login accounts.
insert into auth.users(id,aud,role,email,created_at,updated_at)
select ('20000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'authenticated','authenticated','fixture-'||i||'@example.invalid',now(),now() from generate_series(1,3) i;
insert into awards.profiles(id,discord_user_id,username,display_name)
select ('20000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,(910000000000000000+i)::text,'fixture-'||i,'Usuário fictício '||i from generate_series(1,3) i;
-- A separate historical fixture exercises ballots/analytics/publication without touching live data.
insert into awards.editions(id,name,slug,year,status,voting_open_at,voting_close_at)
values('10000000-0000-4000-8000-000000000002','Histórico fictício de desenvolvimento','dev-history',2026,'VOTING_OPEN',now()-interval '1 day',now()+interval '1 day');
insert into awards.categories(edition_id,name,slug,display_order)
select '10000000-0000-4000-8000-000000000002',name,slug,display_order from awards.categories where edition_id='10000000-0000-4000-8000-000000000001';
insert into awards.category_nominees(category_id,edition_id,nominee_id,display_order)
select c.id,c.edition_id,m.id,row_number() over(partition by c.id order by m.discord_user_id)-1 from awards.categories c cross join(select * from awards.members order by discord_user_id limit 5)m where c.edition_id='10000000-0000-4000-8000-000000000002';
insert into awards.ballots(edition_id,user_id,idempotency_key,payload_hash)
select '10000000-0000-4000-8000-000000000002',id,gen_random_uuid(),'development-fixture-only' from awards.profiles where discord_user_id like '910%';
insert into awards.ballot_items(ballot_id,edition_id,category_id,nominee_id)
select b.id,b.edition_id,cn.category_id,cn.nominee_id from awards.ballots b join awards.category_nominees cn on cn.edition_id=b.edition_id and cn.display_order=0 where b.edition_id='10000000-0000-4000-8000-000000000002';
update awards.editions set status='VOTING_CLOSED' where slug='dev-history';
insert into awards.result_snapshots(edition_id,category_id,nominee_id,votes_count,percentage,rank)
select cn.edition_id,cn.category_id,cn.nominee_id,case when cn.display_order=0 then 3 else 0 end,case when cn.display_order=0 then 100 else 0 end,case when cn.display_order=0 then 1 else 2 end from awards.category_nominees cn where cn.edition_id='10000000-0000-4000-8000-000000000002';
update awards.editions set status='RESULTS_READY' where slug='dev-history';
update awards.editions set status='RESULTS_PUBLISHED' where slug='dev-history';
update awards.editions set status='ARCHIVED' where slug='dev-history';
