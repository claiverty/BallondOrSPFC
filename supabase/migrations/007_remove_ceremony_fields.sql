-- Ceremony logistics are announced externally and are no longer part of an edition.
alter table awards.editions
  drop column if exists ceremony_at,
  drop column if exists ceremony_url,
  drop column if exists ceremony_description;
