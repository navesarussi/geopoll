export default String.raw`
-- Optional per-zone roles (production: one login role per zone service). Skipped if not permitted.
do $$
declare z text;
begin
  foreach z in array array['zone_a','zone_b','zone_c'] loop
    begin
      if not exists (select 1 from pg_roles where rolname = 'gp_' || z) then
        execute format('create role %I nologin', 'gp_' || z);
      end if;
      execute format('grant usage on schema %I to %I', z, 'gp_' || z);
      execute format('grant select, insert, update, delete on all tables in schema %I to %I', z, 'gp_' || z);
      execute format('grant usage on all sequences in schema %I to %I', z, 'gp_' || z);
    exception when insufficient_privilege then
      raise notice 'skipping role setup for %', z;
    end;
  end loop;
end $$;
`;
