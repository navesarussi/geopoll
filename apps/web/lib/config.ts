import { loadConfig, pollById, isBlackout, type PollDef } from "@geopoll/config";

/** The app's single view of the global config (ADR-0022). Env is read literally so Next inlines NEXT_PUBLIC_*. */
export const config = () => loadConfig(process.env.GEOPOLL_COUNTRY ?? "IL", {
  GEOPOLL_ELECTIONS: process.env.GEOPOLL_ELECTIONS,
  BATCH_INTERVAL_SECONDS: process.env.BATCH_INTERVAL_SECONDS,
  SNAPSHOT_INTERVAL_SECONDS: process.env.SNAPSHOT_INTERVAL_SECONDS,
  NEXT_PUBLIC_BETA_INCLUSION_CHECK: process.env.NEXT_PUBLIC_BETA_INCLUSION_CHECK,
  NEXT_PUBLIC_RELAY_URL: process.env.NEXT_PUBLIC_RELAY_URL,
  DEMO_LOGIN: process.env.DEMO_LOGIN,
});
/** Admin-created polls (DB, zone B), cached per instance and refreshed by syncPolls() in lib/polls. Config polls win on id. */
const g = globalThis as { __gpDbPolls?: PollDef[] };
export const setDbPolls = (ps: PollDef[]) => { g.__gpDbPolls = ps; };
export const polls = (): PollDef[] => {
  const base = config().polls;
  return [...base, ...(g.__gpDbPolls ?? []).filter((p) => !base.some((b) => b.id === p.id))];
};
export const getPoll = (id: string) => polls().find((p) => p.id === id) ?? pollById(config(), id);
export const blackoutFor = (p: PollDef, now = new Date()) => isBlackout(config().jurisdiction, p.kind, now);
