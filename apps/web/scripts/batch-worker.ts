// Local/server batch worker: flush queue + publish snapshot every BATCH_INTERVAL_SECONDS (use with BATCH_MODE=scheduled).
import { readFileSync, existsSync } from "node:fs";
import { runBatch } from "../lib/service";
import { connectStores } from "../lib/store";

async function main() {
  if (existsSync(".env.local")) for (const l of readFileSync(".env.local", "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(l); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
  const every = Number(process.env.BATCH_INTERVAL_SECONDS ?? 3600) * 1000;
  const { ballots } = await connectStores();
  for (;;) {
    try { const r = await runBatch(ballots); console.log(new Date().toISOString(), "batch", r.flushed); }
    catch (e) { console.error("batch failed", e); }
    await new Promise((res) => setTimeout(res, every));
  }
}
main();
