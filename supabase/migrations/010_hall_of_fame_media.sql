-- A published winner can have one custom artwork for the Hall of Fame.
-- Keep the asset attached to its category and edition so public pages can
-- resolve it from the immutable result snapshot.
alter table awards.media_assets
  add column category_id uuid;

alter table awards.media_assets
  add constraint media_assets_category_edition_fk
  foreign key (category_id, edition_id)
  references awards.categories(id, edition_id)
  on delete cascade;

alter table awards.media_assets
  add constraint media_assets_category_requires_edition
  check (category_id is null or edition_id is not null);

create unique index media_assets_one_hall_art_per_category
  on awards.media_assets(category_id)
  where category_id is not null;

-- Continue denying direct access through Supabase client roles.
alter table awards.media_assets enable row level security;
revoke all on table awards.media_assets from public, anon, authenticated;
drop policy if exists awards_client_deny on awards.media_assets;
create policy awards_client_deny
  on awards.media_assets
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);
