import { base } from "./base";
import { il } from "./il";
import { merge, validate, type Deep, type GlobalConfig, type PollDef } from "./schema";
export * from "./schema";
export * from "./blackout";
export { IL_POLLS } from "./il";
export * from "./app-version";

const COUNTRIES: Record<string, Deep<GlobalConfig>> = { IL: il };

type Env = Record<string, string | undefined>;
const num = (v: string | undefined) => (v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined);
const flag = (v: string | undefined) => (v == null || v === "" ? undefined : v !== "0" && v !== "false");

/** Build the effective config: base ← country ← env (deploy-level knobs only). Throws ConfigError if invalid. */
export function loadConfig(country = "IL", env: Env = {}): GlobalConfig {
  const c = COUNTRIES[country];
  if (!c) throw new Error(`unknown country ${country}`);
  const merged = merge(base, c);
  const elections = env.GEOPOLL_ELECTIONS?.split(",").map((s) => s.trim()).filter(Boolean).map((date) => ({ type: "knesset" as const, date }));
  return validate(merge(merged, {
    jurisdiction: {
      publication: { batchIntervalSeconds: num(env.BATCH_INTERVAL_SECONDS), snapshotIntervalSeconds: num(env.SNAPSHOT_INTERVAL_SECONDS) },
      ...(elections ? { elections } : {}),
    },
    features: { inclusionCheck: flag(env.NEXT_PUBLIC_BETA_INCLUSION_CHECK), demoLogin: env.DEMO_LOGIN === "1" ? true : undefined },
    services: { relayUrl: env.NEXT_PUBLIC_RELAY_URL || undefined },
  }));
}

export const pollById = (c: GlobalConfig, id: string): PollDef | undefined => c.polls.find((p) => p.id === id);
export { base } from "./base";
