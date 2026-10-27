// Seeds the configured DB with a DUMMY scenario through the real protocol. Usage: npm run seed -- [users] [seed]
import { generate } from "../lib/dummy/generator";
import { runScenario } from "../lib/dummy/run";
import { DEMO_POLL, OPTION_IDS } from "../lib/poll";
import { connectStores } from "../lib/store";
import { readFileSync, existsSync } from "node:fs";

async function main() {
  if (existsSync(".env.local")) for (const l of readFileSync(".env.local", "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(l); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
  const users = Number(process.argv[2] ?? 300), seed = Number(process.argv[3] ?? Date.now() % 100000);
  const stores = await connectStores();
  const stats = await runScenario(stores, generate({ seed, users, options: OPTION_IDS, optionWeights: [46, 31, 15, 8] }));
  await stores.ballots.flush();
  console.log(JSON.stringify({ poll: DEMO_POLL.id, seed, users, ...stats }, null, 1));
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
