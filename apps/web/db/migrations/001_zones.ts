export default String.raw`
-- GeoPoll demo: three trust zones, separate schemas, NO foreign keys or shared ids between zones.
create schema if not exists zone_a;  -- identity
create schema if not exists zone_b;  -- secret ballot
create schema if not exists zone_c;  -- public content

-- Zone A: only a keyed hash of (provider account) + epoch. No email, no name.
create table if not exists zone_a.token_issuance (
  account_hash text not null,
  epoch text not null,
  primary key (account_hash, epoch)
);

-- Zone B: ingestion queue, flushed periodically into ballots (ADR-0020 batching).
create table if not exists zone_b.ballot_queue (
  seq bigserial primary key,
  nullifier text not null,
  poll_id text not null,
  option_id text not null,
  epoch text not null
);
-- One row per nullifier; last flushed choice wins. Only a coarse (day) time bucket.
create table if not exists zone_b.ballots (
  nullifier text primary key,
  poll_id text not null,
  option_id text not null,
  epoch text not null,
  day_bucket date not null
);
create table if not exists zone_b.snapshots (poll_id text primary key, body jsonb not null);
create table if not exists zone_b.meta (k text primary key, v text not null);

-- Zone C: opt-in public positions and replies. author_hash uses a DIFFERENT key than zone A.
create table if not exists zone_c.posts (
  id bigserial primary key,
  poll_id text not null,
  parent_id bigint references zone_c.posts(id),
  author_hash text not null,
  display_name text not null,
  option_id text,
  body text not null,
  created_at timestamptz not null default now(),
  deleted boolean not null default false,
  report_count int not null default 0
);
create index if not exists posts_poll_idx on zone_c.posts (poll_id, created_at desc);
create table if not exists zone_c.reports (
  post_id bigint not null references zone_c.posts(id),
  reporter_hash text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, reporter_hash)
);
`;
