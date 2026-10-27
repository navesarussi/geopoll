import { createHmac } from "node:crypto";
import { DEMO_POLL, optionIds } from "./poll";
import type { ContentStore } from "./store";

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

/** Default pseudonym; never derived from email or Google name. */
export function pseudonym(seed: string): string {
  const h = createHmac("sha256", "pseudonym").update(seed).digest();
  return `משתמש/ת ${(h.readUInt32BE(0) % 9000) + 1000}`;
}

export type PostError = "bad_request" | "too_long" | "profanity" | "rate_limited" | "duplicate_position" | "no_parent" | "bad_option";

export async function createPost(
  store: ContentStore,
  author: string,
  input: { pollId?: string; parentId?: number | null; displayName?: string; option?: string | null; body?: string },
): Promise<{ ok: true; id: number } | { ok: false; error: PostError }> {
  const pollId = input.pollId ?? DEMO_POLL.id;
  if (!optionIds(pollId).length) return { ok: false, error: "bad_request" };
  const body = (input.body ?? "").trim();
  const isReply = input.parentId != null;
  const displayName = (input.displayName ?? "").trim() || pseudonym(author);
  if (!body) return { ok: false, error: "bad_request" };
  if (displayName.length > LIMITS.name || body.length > (isReply ? LIMITS.reply : LIMITS.position)) return { ok: false, error: "too_long" };
  if (hasProfanity(body) || hasProfanity(displayName)) return { ok: false, error: "profanity" };
  if (!isReply && (!input.option || !optionIds(pollId).includes(input.option))) return { ok: false, error: "bad_option" };
  if ((await store.countRecent(author, LIMITS.windowSec)) >= LIMITS.perWindow) return { ok: false, error: "rate_limited" };
  if (isReply) {
    if (!(await store.parentExists(pollId, input.parentId!))) return { ok: false, error: "no_parent" };
  } else if (await store.hasPosition(pollId, author)) return { ok: false, error: "duplicate_position" };
  const id = await store.create({ pollId, parentId: isReply ? input.parentId! : null, authorHash: author,
    displayName, option: isReply ? null : input.option!, body });
  return { ok: true, id };
}
