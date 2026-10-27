// Bundle-size budget: total client JS under .next/static/chunks (gzip) must stay under budget.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
const [nextDir, budgetPath] = process.argv.slice(2);
const budget = JSON.parse(readFileSync(budgetPath, "utf8"));
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(join(nextDir, "static", "chunks")).filter((f) => f.endsWith(".js"));
let total = 0, largest = 0;
for (const f of files) { const s = gzipSync(readFileSync(f)).length; total += s; largest = Math.max(largest, s); }
const kb = (n) => (n / 1024).toFixed(1);
console.log(`client JS gzip total ${kb(total)} KB (budget ${budget.totalGzipKB}), largest chunk ${kb(largest)} KB (budget ${budget.maxChunkGzipKB})`);
let fail = false;
if (total / 1024 > budget.totalGzipKB) { console.error("::error::total client JS over budget"); fail = true; }
if (largest / 1024 > budget.maxChunkGzipKB) { console.error("::error::largest chunk over budget"); fail = true; }
process.exit(fail ? 1 : 0);
