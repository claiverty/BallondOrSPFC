-- Supplement API validations with database lifecycle and immutability checks.
alter table awards.ballots alter column submitted_at set default clock_timestamp();
alter table awards.ballots add column created_xid bigint not null default txid_current();
create function awards.check_ballot_window() returns trigger language plpgsql set search_path = '' as $$
declare e awards.editions;
begin
 select * into e from awards.editions where id=new.edition_id for share;
 if e.status <> 'VOTING_OPEN' or e.voting_open_at is null or e.voting_close_at is null or clock_timestamp()<e.voting_open_at or clock_timestamp()>=e.voting_close_at then
 raise exception 'Voting is not open' using errcode='23514'; end if;
 return new;
end $$;
create trigger ballot_window before insert on awards.ballots for each row execute function awards.check_ballot_window();
create function awards.check_ballot_item_transaction() returns trigger language plpgsql set search_path = '' as $$
begin
 if not exists(select 1 from awards.ballots b where b.id=new.ballot_id and b.created_xid=txid_current()) then raise exception 'Submitted ballots are immutable' using errcode='23514'; end if;
 if exists(select 1 from awards.categories c where c.id=new.category_id and c.archived) then raise exception 'Archived category' using errcode='23514'; end if;
 return new;
end $$;
create trigger ballot_item_transaction before insert on awards.ballot_items for each row execute function awards.check_ballot_item_transaction();
create function awards.check_nomination() returns trigger language plpgsql set search_path = '' as $$
declare e awards.editions; c awards.categories;
begin
 select * into e from awards.editions where id=new.edition_id for share;
 select * into c from awards.categories where id=new.category_id and edition_id=new.edition_id;
 if c.id is null or c.archived or new.slot>=c.max_nominations then raise exception 'Nomination limit or category invalid' using errcode='23514'; end if;
 if tg_op='INSERT' then
  if e.status <> 'NOMINATIONS_OPEN' or e.nominations_open_at is null or e.nominations_close_at is null or clock_timestamp()<e.nominations_open_at or clock_timestamp()>=e.nominations_close_at or new.status <> 'pending_review' then raise exception 'Nominations are not open' using errcode='23514'; end if;
 else
  if e.status <> 'NOMINATIONS_REVIEW' or new.nominator_user_id <> old.nominator_user_id or new.category_id <> old.category_id or new.edition_id <> old.edition_id then raise exception 'Nomination review is not open' using errcode='23514'; end if;
 end if;
 if not c.allow_self_nomination and new.member_id is not null and new.status <> 'rejected' and exists(select 1 from awards.profiles p join awards.members m on m.discord_user_id=p.discord_user_id where p.id=new.nominator_user_id and m.id=new.member_id) then raise exception 'Self nomination forbidden' using errcode='23514'; end if;
 return new;
end $$;
create trigger nomination_rules before insert or update on awards.nomination_items for each row execute function awards.check_nomination();
revoke all on all functions in schema awards from public,anon,authenticated;
