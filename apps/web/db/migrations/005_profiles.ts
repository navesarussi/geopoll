export default String.raw`
-- ADR-0023 (proposed): zone C public profiles. Keyed by the zone-C profile HMAC; never linked to zone A/B.
create table if not exists zone_c.profiles (
  profile_hash text primary key,
  pid text not null unique,                 -- random public id used in URLs (not derived from any identifier)
  display_name text not null,
  bio text not null default '',
  avatar text not null default '',          -- one of a fixed set of built-in avatars (no external URLs)
  is_minor boolean,                         -- null = unknown (no age verification yet)
  consented_at timestamptz,                 -- explicit consent to public political posting under profile
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Anonymous posts: author_hash uses a SEPARATE key (ANON_HMAC_KEY, per poll), so it can't be joined to profiles.
alter table zone_c.posts add column if not exists anon boolean not null default false;
-- Optional sealed moderation envelope: profile hash encrypted to an offline moderation public key (RSA-OAEP).
alter table zone_c.posts add column if not exists mod_seal text;
`;
