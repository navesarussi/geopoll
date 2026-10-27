import { createHmac, constants, publicEncrypt, randomBytes } from "node:crypto";
import { config } from "./config";
import { DEMO_POLL, optionIds } from "./poll";
import type { ContentStore, Profile } from "./store";

/** Zone C pseudonymous author key — DIFFERENT HMAC key than zone A, so the two hashes can't be joined. */
export function authorHash(accountId: string): string {
  return createHmac("sha256", process.env.CONTENT_HMAC_KEY ?? "dev-only-content-key").update(accountId).digest("hex");
}

export const LIMITS = { name: 40, position: 500, reply: 300, perWindow: 5, windowSec: 600 };

// Minimal demo list (Hebrew/English slurs & obscenities). Production: proper moderation service (backlog).
const BLOCKED = ["זונה", "שרמוטה", "מניאק", "בן זונה", "כוס אמק", "קוקסינל", "fuck", "shit", "nigger", "cunt"];
export const hasProfanity = (s: string) => {
  const t = s.toLowerCase();
  return BLOCKED.some((w) => t.includes(w));
};

/**
 * ADR-0023: anonymous-post key. SEPARATE secret from CONTENT_HMAC_KEY and scoped per poll, so a reader of zone C
 * (even with DB access) cannot join anonymous posts to a profile, nor anonymous posts across polls.
 */
export function anonHash(accountId: string, pollId: string): string {
  return createHmac("sha256", process.env.ANON_HMAC_KEY ?? "dev-only-anon-key").update(`${accountId}|${pollId}`).digest("hex");
}
/** All author keys a signed-in account owns for a poll (for "mine", delete, rate limit, one-position rule). */
export const authorKeys = (accountId: string, pollId: string) => [authorHash(accountId), anonHash(accountId, pollId)];

/** Stable per-poll anonymous display name, derived from the anon hash only. */
export const anonName = (h: string) => `אנונימי/ת ${(parseInt(h.slice(0, 8), 16) % 9000) + 1000}`;

/**
 * Sealed moderation envelope (optional): profile hash encrypted to MOD_SEAL_PUBLIC_KEY (RSA-OAEP-SHA256).
 * The private key is kept OFFLINE; opening it is a deliberate, logged, legally-gated act (ADR-0023). Without the
 * env key, nothing is stored and anonymous posts cannot be de-anonymized by anyone (only removed).
 */
export function modSeal(profileHash: string): string | null {
  const pem = process.env.MOD_SEAL_PUBLIC_KEY;
  if (!pem) return null;
  return publicEncrypt({ key: pem, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, Buffer.from(profileHash)).toString("base64");
}

/** Effective anonymity: explicit user choice wins; else teen hook; else config default (ADR-0023). */
export function resolveAnonymous(requested: boolean | undefined, profile: Profile | null, features = config().features): boolean {
  if (typeof requested === "boolean") return requested;
  if (profile?.is_minor === true && features.teenDefaultAnonymous) return true;
  return features.publicIdentityDefault === "anonymous";
}

export const PROFILE_LIMITS = { name: 40, bio: 160 };
export const AVATARS = ["🗳️", "🦉", "🌱", "🌊", "⭐", "🧭", "🌻", "🐢", "🔥", "🏔️"];
export const newPid = () => randomBytes(9).toString("base64url");

export type ProfileError = "too_long" | "profanity" | "bad_request";
export function validateProfile(p: { displayName?: unknown; bio?: unknown; avatar?: unknown }):
  { ok: true; value: { displayName: string; bio: string; avatar: string } } | { ok: false; error: ProfileError } {
  const displayName = typeof p.displayName === "string" ? p.displayName.trim() : "";
  const bio = typeof p.bio === "string" ? p.bio.trim() : "";
  const avatar = typeof p.avatar === "string" && AVATARS.includes(p.avatar) ? p.avatar : AVATARS[0];
  if (!displayName) return { ok: false, error: "bad_request" };
  if (displayName.length > PROFILE_LIMITS.name || bio.length > PROFILE_LIMITS.bio) return { ok: false, error: "too_long" };
  if (hasProfanity(displayName) || hasProfanity(bio)) return { ok: false, error: "profanity" };
  return { ok: true, value: { displayName, bio, avatar } };
}

/** Default pseudonym; never derived from email or Google name. */
export function pseudonym(seed: string): string {
  const h = createHmac("sha256", "pseudonym").update(seed).digest();
  return `משתמש/ת ${(h.readUInt32BE(0) % 9000) + 1000}`;
}

export type PostError = "bad_request" | "too_long" | "profanity" | "rate_limited" | "duplicate_position" | "no_parent" | "bad_option" | "no_profile" | "consent_required";

export async function createPost(
  store: ContentStore,
  accountId: string,
  input: { pollId?: string; parentId?: number | null; option?: string | null; body?: string; anonymous?: boolean; consent?: boolean },
): Promise<{ ok: true; id: number; anonymous: boolean } | { ok: false; error: PostError }> {
  const pollId = input.pollId ?? DEMO_POLL.id;
  if (!optionIds(pollId).length) return { ok: false, error: "bad_request" };
  const body = (input.body ?? "").trim();
  const isReply = input.parentId != null;
  if (!body) return { ok: false, error: "bad_request" };
  if (body.length > (isReply ? LIMITS.reply : LIMITS.position)) return { ok: false, error: "too_long" };
  if (hasProfanity(body)) return { ok: false, error: "profanity" };
  if (!isReply && (!input.option || !optionIds(pollId).includes(input.option))) return { ok: false, error: "bad_option" };
  const profileHash = authorHash(accountId);
  const keys = authorKeys(accountId, pollId);
  const profile = await store.getProfile(profileHash);
  const anonymous = resolveAnonymous(input.anonymous, profile);
  if (!anonymous) {
    if (!profile) return { ok: false, error: "no_profile" };
    if (!profile.consented) {
      if (input.consent !== true) return { ok: false, error: "consent_required" };
      await store.consent(profileHash);
    }
  }
  if ((await store.countRecent(keys, LIMITS.windowSec)) >= LIMITS.perWindow) return { ok: false, error: "rate_limited" };
  if (isReply) {
    if (!(await store.parentExists(pollId, input.parentId!))) return { ok: false, error: "no_parent" };
  } else if (await store.hasPosition(pollId, keys)) return { ok: false, error: "duplicate_position" };
  const aHash = anonymous ? anonHash(accountId, pollId) : profileHash;
  const id = await store.create({
    pollId, parentId: isReply ? input.parentId! : null, authorHash: aHash,
    displayName: anonymous ? anonName(aHash) : profile!.display_name,
    option: isReply ? null : input.option!, body, anon: anonymous, modSeal: anonymous ? modSeal(profileHash) : null,
  });
  return { ok: true, id, anonymous };
}
