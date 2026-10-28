#!/usr/bin/env node
/**
 * T-103: ensure docs/architecture/threat-model.md lists every inventoried service
 * with all six STRIDE rows (S/T/R/I/D/E) in its per-service table.
 */
import { readFileSync } from "node:fs";

const DOC = "docs/architecture/threat-model.md";
const SERVICES = [
  "kyc-external",
  "identity-service",
  "identity-adapters",
  "blind-issuer",
  "client-wallet",
  "ohttp-relay",
  "group-builder",
  "voting-service",
  "results-service",
  "api-gateway",
  "content-service",
  "moderation-service",
  "config-cfg",
  "data-importers",
  "admin-portal",
  "observability-sentry",
  "product-analytics",
  "ci-supply-chain",
  "mobile-client",
  "web-client",
];
const STRIDE = ["S", "T", "R", "I", "D", "E"];

const src = readFileSync(DOC, "utf8");
let bad = 0;

for (const slug of SERVICES) {
  const marker = `<!-- service:${slug} -->`;
  if (!src.includes(marker)) {
    console.error(`::error file=${DOC}::missing service marker ${marker}`);
    bad++;
    continue;
  }
  const start = src.indexOf(marker);
  const next = src.indexOf("<!-- service:", start + marker.length);
  const block = next === -1 ? src.slice(start) : src.slice(start, next);
  for (const letter of STRIDE) {
    const re = new RegExp(`\\| \\*\\*${letter}\\*\\* \\|`);
    if (!re.test(block)) {
      console.error(`::error file=${DOC}::service ${slug} missing STRIDE row **${letter}**`);
      bad++;
    }
  }
}

if (bad) {
  console.error(`${bad} threat-model STRIDE check(s) failed`);
  process.exit(1);
}
console.log(`threat-model STRIDE ok (${SERVICES.length} services)`);
