export default String.raw`
-- ADR-0024 (proposed): T2 verification result in ZONE A only. No images, no name, no document number:
-- only HMAC(T2_DEDUPE_KEY, document number) to prevent one document backing two accounts.
create table if not exists zone_a.t2_verifications (
  account_hash text primary key,
  doc_dedupe_hash text not null unique,
  provider text not null,
  verified_at timestamptz not null default now()
);
`;
