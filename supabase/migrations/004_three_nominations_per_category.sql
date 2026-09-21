-- Keep the nomination rule consistent for active and future editions.
alter table awards.categories drop constraint if exists categories_max_nominations_check;
update awards.categories set max_nominations = least(max_nominations, 3);
alter table awards.categories
  add constraint categories_max_nominations_check check (max_nominations between 1 and 3);
alter table awards.categories alter column max_nominations set default 3;
