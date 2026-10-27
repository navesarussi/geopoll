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
export const polls = (): PollDef[] => config().polls;
export const getPoll = (id: string) => pollById(config(), id);
export const blackoutFor = (p: PollDef, now = new Date()) => isBlackout(config().jurisdiction, p.kind, now);
