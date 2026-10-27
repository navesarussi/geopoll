// #79: docs/content/question-bank.md → lib/question-bank.generated.json (raw material, admin-only, behind features.questionBankImport).
import { readFileSync, writeFileSync } from "node:fs";
const md = readFileSync(new URL("../../../docs/content/question-bank.md", import.meta.url), "utf8").split("\n");
const out = []; let source = "";
for (let i = 0; i < md.length; i++) {
  const s = /^מקור: \[[^\]]+\]\(([^)]+)\)/.exec(md[i]); if (s) source = s[1];
  const q = /^- \*\*([^:*\s]+):\*\* (.+)$/.exec(md[i]);
  if (!q) continue;
  const o = /^\s+- אפשרויות: (.+)$/.exec(md[i + 1] ?? "");
  out.push({ id: q[1], q: q[2].trim(), options: o ? o[1].split(" / ").map((x) => x.trim()).filter(Boolean) : [], source });
}
writeFileSync(new URL("../lib/question-bank.generated.json", import.meta.url), JSON.stringify(out));
console.log(out.length, "questions");
