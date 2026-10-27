/** @type {import('next').NextConfig} */
// externalDir: apps/web compiles the dependency-free TS sources of packages/config + packages/design-tokens (ADR-0022).
import { withSentryConfig } from "@sentry/nextjs/config";
const config = { serverExternalPackages: ["@electric-sql/pglite", "postgres"], experimental: { externalDir: true } };
// Source maps are uploaded only when SENTRY_AUTH_TOKEN is set (Vercel env); otherwise the build is unchanged and token-free.
export default withSentryConfig(config, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT || "geopoll-web",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN, deleteSourcemapsAfterUpload: true },
  silent: true,
  telemetry: false,
  disableLogger: true,
});
