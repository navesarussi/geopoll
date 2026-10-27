export default String.raw`
-- Future tables/sequences in each zone schema are granted to that zone's role only; PUBLIC gets nothing.
do $$
declare z text;
begin
  foreach z in array array['zone_a','zone_b','zone_c'] loop
    begin
      execute format('revoke all on schema %I from public', z);
      execute format('alter default privileges in schema %I grant select, insert, update, delete on tables to %I', z, 'gp_' || z);
      execute format('alter default privileges in schema %I grant usage on sequences to %I', z, 'gp_' || z);
    exception when insufficient_privilege or undefined_object then
      raise notice 'skipping default privileges for %', z;
    end;
  end loop;
end $$;
`;
