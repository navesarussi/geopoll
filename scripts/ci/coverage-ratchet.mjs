// Coverage ratchet: fail if any total metric drops more than 0.5pt below baseline.
// Raise the baseline (never lower) with: UPDATE_COVERAGE_BASELINE=1 node scripts/ci/coverage-ratchet.mjs ...
import { readFileSync, writeFileSync } from "node:fs";
const [summaryPath, baselinePath] = process.argv.slice(2);
const total = JSON.parse(readFileSync(summaryPath, "utf8")).total;
const base = JSON.parse(readFileSync(baselinePath, "utf8"));
const TOL = 0.5;
let fail = false;
const next = { ...base };
for (const m of ["lines", "statements", "functions", "branches"]) {
  const cur = total[m].pct, min = base[m] ?? 0;
  if (cur + TOL < min) { console.error(`::error::coverage ${m} ${cur}% < baseline ${min}%`); fail = true; }
  else console.log(`✓ coverage ${m} ${cur}% (baseline ${min}%)`);
  next[m] = Math.max(min, Math.floor(cur));
}
if (process.env.UPDATE_COVERAGE_BASELINE === "1") writeFileSync(baselinePath, JSON.stringify(next, null, 2) + "\n");
process.exit(fail ? 1 : 0);
