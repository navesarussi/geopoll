export default String.raw`
-- ADR-0019: the tier (from the signing key) travels with the ballot so results can be labelled. No identity.
alter table zone_b.ballot_queue add column if not exists tier text not null default 'T0';
alter table zone_b.ballots add column if not exists tier text not null default 'T0';
`;
