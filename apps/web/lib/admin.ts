import { config, blackoutFor, polls } from "./config";
import { bucket, kThreshold } from "./results";
import type { Stores } from "./store";

/**
 * T-323 admin portal. Access = Google sign-in + email in ADMIN_EMAILS (comma-separated) + role "admin".
 * Empty/unset ADMIN_EMAILS => nobody is admin (fail closed). Demo logins are never admins.
 * ZONE RULE: the portal only reads aggregates; it never reads nullifiers, options per voter, or joins zones.
 */
export const adminEmails = (env = process.env) =>
  (env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter((e) => /^[^@\s]+@[^@\s]+$/.test(e));

export function adminRole(acct: string | null | undefined, email: string | null | undefined, env = process.env): "admin" | null {
  if (!acct || !email || !acct.startsWith("google:")) return null;
  return adminEmails(env).includes(email.trim().toLowerCase()) ? "admin" : null;
}

export async function sessionAdmin(): Promise<{ email: string } | null> {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("./auth");
  const s = (await getServerSession(authOptions)) as ({ acct?: string; user?: { email?: string | null } } | null);
  const email = s?.user?.email ?? null;
  return adminRole(s?.acct, email) ? { email: email!.toLowerCase() } : null;
}

/** Aggregate-only dashboard. Counts are shown as k-gated buckets, never exact below k. */
export async function dashboard(s: Stores, now = new Date()) {
  const k = kThreshold();
  const lastFlush = await s.ballots.lastFlush();
  const rows = [];
  for (const p of polls()) {
    const t = await s.ballots.totals(p.id);
    const snap = await s.ballots.getSnapshot(p.id);
    rows.push({
      id: p.id, kind: p.kind, dummy: !!p.dummy, question: p.question.he,
      status: await s.ballots.pollStatus(p.id),
      turnout: bucket(t.counted), passesK: t.counted >= k,
      queued: t.queued >= k ? bucket(t.queued) : t.queued > 0 ? `פחות מ-${k}` : "0",
      snapshotAt: snap?.snapshotAt ?? null, published: snap?.published ?? false,
      blackout: blackoutFor(p, now).active,
    });
  }
  const c = config();
  const env = process.env;
  return {
    k, kSmall: c.jurisdiction.thresholds.kSmallLocality, lastFlush: lastFlush?.toISOString() ?? null, polls: rows,
    content: await s.content.stats(), t2Verified: bucket(await s.identity.t2Count()),
    health: {
      db: s.kind, zonesIsolated: !!s.isolated, batchMode: env.BATCH_MODE ?? "request",
      elections: c.jurisdiction.elections.map((e) => e.date), locales: c.jurisdiction.locales,
      flags: { T1: env.FEATURE_T1_ID === "1", T2: env.FEATURE_T2_KYC === "1", demoLogin: env.DEMO_LOGIN === "1", relayOnly: env.RELAY_ONLY === "1" },
      // presence only, never values
      secrets: Object.fromEntries(["NEXTAUTH_SECRET", "IDENTITY_HMAC_KEY", "CONTENT_HMAC_KEY", "ANON_HMAC_KEY", "ISSUER_PRIVATE_JWK_T0", "ISSUER_PRIVATE_JWK_T2", "T2_DEDUPE_KEY", "CRON_SECRET"].map((n) => [n, !!env[n]])),
    },
  };
}

export type AdminAction =
  | { action: "poll_open" | "poll_close"; pollId: string }
  | { action: "hide" | "unhide" | "delete" | "clear" | "ban" | "unban"; postId: number; reason?: string };

export async function runAdminAction(s: Stores, actor: string, a: AdminAction): Promise<boolean> {
  let ok = false;
  if ("pollId" in a) {
    if (!polls().some((p) => p.id === a.pollId)) return false;
    await s.ballots.setPollStatus(a.pollId, a.action === "poll_open" ? "open" : "closed"); ok = true;
    await s.content.audit(actor, a.action, a.pollId);
    return ok;
  }
  if (!Number.isInteger(a.postId)) return false;
  if (a.action === "ban") ok = await s.content.banAuthorOf(a.postId, a.reason ?? "");
  else if (a.action === "unban") ok = await s.content.unbanAuthorOf(a.postId);
  else ok = await s.content.moderate(a.postId, a.action);
  await s.content.audit(actor, a.action, `post:${a.postId}`, `${ok ? "ok" : "noop"}${a.reason ? ` · ${a.reason}` : ""}`);
  return ok;
}
