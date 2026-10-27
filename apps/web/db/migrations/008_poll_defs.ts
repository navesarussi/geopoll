export default String.raw`
-- Admin-created polls (DB-backed). Zone B: poll definitions only (public metadata, no link to any ballot or person).
-- Config polls (packages/config) always win on id; admins can't shadow them.
create table if not exists zone_b.poll_defs (
  id text primary key,
  def jsonb not null,                        -- PollDef, validated against the config schema before write
  version int not null default 1,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
`;
