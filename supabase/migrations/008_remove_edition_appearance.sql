-- Edition appearance is fixed by the platform identity and is no longer configurable.
alter table awards.editions
  drop column if exists banner_url,
  drop column if exists logo_url,
  drop column if exists branding;
