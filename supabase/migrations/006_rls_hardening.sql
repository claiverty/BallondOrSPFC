-- Defense in depth for the private awards schema.
--
-- The browser never talks to awards directly: the Nest API is the privileged
-- boundary. Keep that model explicit by denying every direct client role,
-- even if a grant is accidentally reintroduced later.
do $$
declare
  table_name text;
begin
  for table_name in
    select tablename
    from pg_tables
    where schemaname = 'awards'
  loop
    execute format('alter table awards.%I enable row level security', table_name);
    execute format(
      'revoke all on table awards.%I from public, anon, authenticated',
      table_name
    );
    execute format(
      'drop policy if exists awards_client_deny on awards.%I',
      table_name
    );
    execute format(
      'create policy awards_client_deny on awards.%I as restrictive for all to anon, authenticated using (false) with check (false)',
      table_name
    );
  end loop;

  -- The migration ledger is operational metadata and must not be queryable
  -- through the public API either.
  if to_regclass('public.awards_migrations') is not null then
    alter table public.awards_migrations enable row level security;
    revoke all on table public.awards_migrations from public, anon, authenticated;
    drop policy if exists awards_migrations_client_deny on public.awards_migrations;
    create policy awards_migrations_client_deny
      on public.awards_migrations
      as restrictive
      for all
      to anon, authenticated
      using (false)
      with check (false);
  end if;
end $$;

revoke all on schema awards from public, anon, authenticated;
revoke all on all tables in schema awards from public, anon, authenticated;
revoke all on all sequences in schema awards from public, anon, authenticated;
revoke all on all functions in schema awards from public, anon, authenticated;

alter default privileges in schema awards revoke all on tables from public, anon, authenticated;
alter default privileges in schema awards revoke all on sequences from public, anon, authenticated;
alter default privileges in schema awards revoke all on functions from public, anon, authenticated;
