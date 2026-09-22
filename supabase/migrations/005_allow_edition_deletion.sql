-- Administrative edition deletion is an explicit destructive operation. Keep
-- ballots immutable for all normal operations, but allow the deletion service
-- to remove the complete edition graph inside its transaction.
create or replace function awards.immutable_ballot() returns trigger
language plpgsql set search_path = '' as $$
begin
 if tg_op = 'DELETE' and current_setting('awards.allow_edition_delete', true) = 'on' then
   return old;
 end if;
 raise exception 'Submitted ballots are immutable' using errcode='23514';
end $$;
