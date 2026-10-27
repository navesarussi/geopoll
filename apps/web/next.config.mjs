/** @type {import('next').NextConfig} */
// externalDir: apps/web compiles the dependency-free TS sources of packages/config + packages/design-tokens (ADR-0022).
export default { serverExternalPackages: ["@electric-sql/pglite", "postgres"], experimental: { externalDir: true } };
