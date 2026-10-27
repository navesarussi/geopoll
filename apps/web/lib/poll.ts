import { IL_POLLS } from "@geopoll/config";
import { config } from "./config";

/** Default poll (referendum). Kept for backward compatibility; polls now come from packages/config (ADR-0022). */
export const DEMO_POLL = IL_POLLS.find((p) => p.kind === "referendum")!;
export const KNESSET_POLL = IL_POLLS.find((p) => p.kind === "knesset-election")!;
export const optionIds = (pollId: string) => config().polls.find((p) => p.id === pollId)?.options.map((o) => o.id) ?? [];
export const OPTION_IDS = DEMO_POLL.options.map((o) => o.id);

/** Shared epoch for all users (ADR-0019): calendar month, UTC. */
export function currentEpoch(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}
