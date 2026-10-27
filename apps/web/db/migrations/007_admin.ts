export default String.raw`
-- T-323 admin portal. Zone C: moderation (hide flag, bans by author key) + admin audit log.
-- Zone B: poll open/closed state ONLY (no link to any ballot or person).
alter table zone_c.posts add column if not exists hidden boolean not null default false;
create table if not exists zone_c.bans (
  author_hash text primary key,              -- zone-C author key (profile hash, or per-poll anon hash)
  reason text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists zone_c.admin_audit (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor text not null,                       -- admin email (staff, allowlisted)
  action text not null,
  target text not null default '',
  detail text not null default ''
);
create table if not exists zone_b.poll_state (
  poll_id text primary key,
  status text not null check (status in ('open','closed')),
  updated_at timestamptz not null default now()
);
`;
