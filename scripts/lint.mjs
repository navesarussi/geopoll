// Lightweight dependency-free lint (ESLint not yet adopted — see docs/engineering/ci-cd.md).
// Checks: merge-conflict markers, focused tests (.only), `debugger`, private key blocks.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
const files = execSync("git ls-files", { encoding: "utf8" }).split("\n")
  .filter((f) => /\.(ts|tsx|mjs|js|cjs|json|ya?ml|md|sql)$/.test(f) && !f.endsWith("package-lock.json") && f !== "scripts/lint.mjs");
const rules = [
  [/^(<{7}|>{7}|={7})( |$)/m, "merge conflict marker"],
  [/\b(it|describe|test)\.only\(/, "focused test (.only)"],
  [/^\s*debugger;?\s*$/m, "debugger statement"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key material"],
];
let bad = 0;
for (const f of files) {
  let src; try { src = readFileSync(f, "utf8"); } catch { continue; }
  for (const [re, msg] of rules) if (re.test(src)) { console.error(`::error file=${f}::${msg}`); bad++; }
}
console.log(bad ? `${bad} lint problem(s)` : `lint ok (${files.length} files)`);
process.exit(bad ? 1 : 0);
