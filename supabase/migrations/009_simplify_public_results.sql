-- Public result presentation is fixed: edition pages show a Top 3 and the Hall of Fame shows winners.
alter table awards.editions
  drop column if exists result_visibility,
  drop column if exists publish_counts,
  drop column if exists publish_percentages,
  drop column if exists eligible_count;
