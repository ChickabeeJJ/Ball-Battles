-- Ball Vs Ball matchmaking (async squad pool). Run once in the Supabase SQL editor.
-- Then put the project URL and the anon public key into js/config.js.

create table if not exists squads (
  id bigint generated always as identity primary key,
  owner text not null check (char_length(owner) between 4 and 40),
  name text not null default 'Player' check (char_length(name) <= 16),
  ids text not null check (ids ~ '^[a-z0-9]+\.[a-z0-9]+\.[a-z0-9]+$'),
  maps text not null check (maps ~ '^[a-z]+\.[a-z]+\.[a-z]+$'),
  seed integer not null,
  rating integer not null check (rating between 0 and 5000),
  created_at timestamptz not null default now()
);
create index if not exists squads_rating_idx on squads (rating, created_at desc);
create index if not exists squads_owner_idx on squads (owner);

create table if not exists results (
  id bigint generated always as identity primary key,
  squad_id bigint not null references squads(id) on delete cascade,
  challenger text not null check (char_length(challenger) between 4 and 40),
  challenger_name text not null default 'Player' check (char_length(challenger_name) <= 16),
  results text not null check (results ~ '^-?[01]\.-?[01]\.-?[01]$'),
  challenger_rating integer not null check (challenger_rating between 0 and 5000),
  created_at timestamptz not null default now()
);
create index if not exists results_squad_idx on results (squad_id);

-- public game client (anon key): may add squads/results and read them, nothing else
alter table squads enable row level security;
alter table results enable row level security;
create policy "read squads" on squads for select using (true);
create policy "add squads" on squads for insert with check (true);
create policy "read results" on results for select using (true);
create policy "add results" on results for insert with check (true);

-- optional housekeeping: keep the pool fresh (run daily via Supabase cron, or by hand)
-- delete from squads where created_at < now() - interval '14 days';
