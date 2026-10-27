import type { Tier } from "../crypto";

/**
 * T-107 / ADR-0019: pluggable identity adapters. An adapter outputs ONLY a tier (+ later: coarse buckets),
 * never an identity attribute. The voting core never learns which adapter was used.
 */
export interface IdentityContext { provider: string; accountId: string; flags: Record<string, boolean> }
export interface TierAdapter {
  tier: Tier;
  /** Is this adapter switched on in this deployment? */
  enabled(env: NodeJS.ProcessEnv): boolean;
  /** Does this account satisfy the tier? Must not return or log personal data. */
  satisfies(ctx: IdentityContext): Promise<boolean>;
}

/** T0: signed in with Google (demo login also maps to T0 and is labelled demo in the UI). */
export const T0Google: TierAdapter = {
  tier: "T0",
  enabled: () => true,
  satisfies: async (c) => c.provider === "google" || c.provider === "demo",
};

/**
 * T1: Google + Israeli ID number (keyed-hash dedupe). PLACEHOLDER — needs-lawyer (#40, lawyer-questions).
 * Off unless FEATURE_T1_ID=1, and even then only for flagged accounts; no ID number is collected yet.
 */
export const T1GoogleId: TierAdapter = {
  tier: "T1",
  enabled: (env) => env.FEATURE_T1_ID === "1",
  satisfies: async (c) => c.provider === "google" && c.flags.idNumberVerified === true,
};

/** T2 (document + liveness, ADR-0007) and T3 (ZK passport, ADR-0018): stubs, never satisfied yet. */
export const T2Document: TierAdapter = { tier: "T2", enabled: () => false, satisfies: async () => false };
export const T3Zk: TierAdapter = { tier: "T3", enabled: () => false, satisfies: async () => false };

export const ADAPTERS: TierAdapter[] = [T3Zk, T2Document, T1GoogleId, T0Google];

/** Highest enabled tier the account satisfies, or null (no token). */
export async function resolveTier(ctx: IdentityContext, env = process.env, adapters = ADAPTERS): Promise<Tier | null> {
  for (const a of adapters) if (a.enabled(env) && (await a.satisfies(ctx))) return a.tier;
  return null;
}

export const BASIC_TIERS: Tier[] = ["T0", "T1"];

/** Session account id is "<provider>:<providerAccountId>". */
export function tierForAccount(acct: string, env = process.env) {
  const [provider, ...rest] = acct.split(":");
  return resolveTier({ provider, accountId: rest.join(":"), flags: {} }, env);
}
