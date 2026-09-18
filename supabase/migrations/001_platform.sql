-- Additive migration. Never touches legacy public.votos.
create schema if not exists awards;
create table awards.profiles (
 id uuid primary key references auth.users(id), discord_user_id text not null unique check(discord_user_id ~ '^\d{17,20}$'),
 username text not null, display_name text not null, avatar_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table awards.user_roles (user_id uuid primary key references awards.profiles(id), role text not null check(role in ('admin','super_admin')));
create table awards.editions (
 id uuid primary key default gen_random_uuid(), is_public boolean not null default false, is_current boolean not null default false, name text not null, slug text not null unique, year integer not null check(year between 2024 and 2100), description text not null default '', tagline text not null default '',
 status text not null default 'DRAFT' check(status in ('DRAFT','NOMINATIONS_OPEN','NOMINATIONS_REVIEW','NOMINEES_ANNOUNCED','VOTING_OPEN','VOTING_CLOSED','RESULTS_READY','RESULTS_PUBLISHED','ARCHIVED')),
 nominations_open_at timestamptz, nominations_close_at timestamptz, voting_open_at timestamptz, voting_close_at timestamptz, nominees_reveal_at timestamptz, ceremony_at timestamptz, publish_at timestamptz,
 ceremony_url text, ceremony_description text not null default '', banner_url text, logo_url text, branding jsonb not null default '{"accent":"#d6b77a"}', result_visibility text not null default 'winner' check(result_visibility in ('winner','top3')), publish_counts boolean not null default false, publish_percentages boolean not null default false, eligible_count integer check(eligible_count >= 0), created_at timestamptz not null default now(),
 check(nominations_open_at < nominations_close_at), check(voting_open_at < voting_close_at)
);
create unique index single_current_edition on awards.editions(is_current) where is_current;
create table awards.categories (
 id uuid primary key default gen_random_uuid(), edition_id uuid not null references awards.editions(id), slug text not null, name text not null, description text not null default '', image_url text,
 display_order integer not null default 0, max_nominees integer not null default 5 check(max_nominees between 2 and 20), max_nominations integer not null default 1 check(max_nominations between 1 and 10), vote_required boolean not null default true, allow_self_nomination boolean not null default false, archived boolean not null default false,
 rules jsonb not null default '{"required_role_ids":[],"min_membership_days":0,"blacklisted_discord_ids":[]}', unique(edition_id,slug), unique(id,edition_id)
);
create table awards.members (
 id uuid primary key default gen_random_uuid(), discord_user_id text not null unique check(discord_user_id ~ '^\d{17,20}$'), username text not null, display_name text not null, avatar_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table awards.category_nominees (
 category_id uuid not null, edition_id uuid not null, nominee_id uuid not null references awards.members(id), display_order integer not null default 0,
 primary key(category_id,nominee_id), unique(category_id,edition_id,nominee_id), foreign key(category_id,edition_id) references awards.categories(id,edition_id)
);
create table awards.nomination_items (
 id uuid primary key default gen_random_uuid(), edition_id uuid not null, category_id uuid not null, nominator_user_id uuid not null references awards.profiles(id), slot integer not null check(slot between 0 and 9), member_id uuid references awards.members(id), manual_name text,
 status text not null default 'pending_review' check(status in ('pending_review','approved','rejected')), created_at timestamptz not null default now(),
 foreign key(category_id,edition_id) references awards.categories(id,edition_id), unique(edition_id,category_id,nominator_user_id,slot), check((member_id is null) <> (manual_name is null))
);
create unique index nominations_distinct_member on awards.nomination_items(category_id,nominator_user_id,member_id) where member_id is not null;
create table awards.ballots (
 id uuid primary key default gen_random_uuid(), edition_id uuid not null references awards.editions(id), user_id uuid not null references awards.profiles(id), idempotency_key uuid not null, payload_hash text not null, submitted_at timestamptz not null default now(), unique(edition_id,user_id), unique(id,edition_id), unique(user_id,idempotency_key)
);
create table awards.ballot_items (
 ballot_id uuid not null, edition_id uuid not null, category_id uuid not null, nominee_id uuid not null,
 primary key(ballot_id,category_id), foreign key(ballot_id,edition_id) references awards.ballots(id,edition_id), foreign key(category_id,edition_id,nominee_id) references awards.category_nominees(category_id,edition_id,nominee_id)
);
create index ballot_items_results on awards.ballot_items(edition_id,category_id,nominee_id);
create index ballots_timeline on awards.ballots(edition_id,submitted_at);
create index nominations_review on awards.nomination_items(edition_id,category_id,status);
create table awards.result_snapshots (
 edition_id uuid not null, category_id uuid not null, nominee_id uuid not null, votes_count integer not null check(votes_count>=0), percentage numeric not null check(percentage between 0 and 100), rank integer not null check(rank>0),
 primary key(edition_id,category_id,nominee_id), foreign key(category_id,edition_id,nominee_id) references awards.category_nominees(category_id,edition_id,nominee_id)
);
create table awards.audit_logs (id uuid primary key default gen_random_uuid(),actor_id uuid references awards.profiles(id),edition_id uuid references awards.editions(id),action text not null,entity_id text,reason text,details jsonb not null default '{}',created_at timestamptz not null default now());
create table awards.media_assets (id uuid primary key default gen_random_uuid(),edition_id uuid references awards.editions(id),storage_path text not null unique,url text not null,created_by uuid not null references awards.profiles(id),created_at timestamptz not null default now());

-- Defense in depth: editions can only advance by one phase.
create function awards.check_transition() returns trigger language plpgsql set search_path = '' as $$
declare states text[] := array['DRAFT','NOMINATIONS_OPEN','NOMINATIONS_REVIEW','NOMINEES_ANNOUNCED','VOTING_OPEN','VOTING_CLOSED','RESULTS_READY','RESULTS_PUBLISHED','ARCHIVED'];
begin
 if new.status <> old.status and array_position(states,new.status) <> array_position(states,old.status)+1 then raise exception 'Invalid edition transition' using errcode='23514'; end if;
 return new;
end $$;
create trigger edition_state before update on awards.editions for each row execute function awards.check_transition();

-- A confirmed ballot is immutable, including through SQL accidental updates.
create function awards.immutable_ballot() returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'Submitted ballots are immutable' using errcode='23514'; end $$;
create trigger immutable_ballots before update or delete on awards.ballots for each row execute function awards.immutable_ballot();
create trigger immutable_ballot_items before update or delete on awards.ballot_items for each row execute function awards.immutable_ballot();

-- Constraint trigger checks entire ballot at COMMIT, rejecting partial required ballots.
create function awards.check_ballot_complete() returns trigger language plpgsql set search_path = '' as $$
begin
 if exists(select 1 from awards.categories c where c.edition_id=new.edition_id and not c.archived and c.vote_required and not exists(select 1 from awards.ballot_items i where i.ballot_id=new.id and i.category_id=c.id)) then
 raise exception 'Incomplete ballot' using errcode='23514'; end if;
 if not exists(select 1 from awards.ballot_items i where i.ballot_id=new.id) then raise exception 'Empty ballot' using errcode='23514'; end if;
 return new;
end $$;
create constraint trigger complete_ballot after insert on awards.ballots deferrable initially deferred for each row execute function awards.check_ballot_complete();

-- No browser role can access schema or mutate data. Nest is the privileged boundary.
do $$ declare t text; begin
 for t in select tablename from pg_tables where schemaname='awards' loop
 execute format('alter table awards.%I enable row level security',t);
 end loop;
end $$;
revoke all on schema awards from public, anon, authenticated;
revoke all on all tables in schema awards from public, anon, authenticated;
revoke all on all functions in schema awards from public, anon, authenticated;
alter default privileges in schema awards revoke all on tables from public, anon, authenticated;
-- Backend uses private PostgreSQL credentials, never anon/authenticated.
