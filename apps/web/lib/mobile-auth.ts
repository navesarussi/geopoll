/**
 * Native-app sign-in (apps/mobile, ADR-0025). Reuses the web Google/NextAuth login; no new identity provider.
 * Flow (PKCE-style, stateless):
 *  1. App opens  GET /api/auth/mobile?cc=<base64url(SHA-256(verifier))>  in the system auth browser.
 *  2. After the normal web sign-in, the server redirects to  geopoll://auth?code=<handoff>  (2-minute JWE bound to cc).
 *  3. App POSTs {code, verifier} to /api/auth/mobile/exchange and receives a 30-day bearer session.
 * An app that intercepts the custom-scheme redirect cannot use the code without the verifier.
 * Salts keep the three token kinds (web cookie, handoff, mobile bearer) non-interchangeable.
 * Zone A only: the vote API never reads this token (mobile sends ballots with no Authorization header).
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { encode, decode } from "next-auth/jwt";

export const MOBILE_REDIRECT = "geopoll://auth";
export const HANDOFF_SALT = "geopoll-mobile-handoff-v1";
export const SESSION_SALT = "geopoll-mobile-session-v1";
export const HANDOFF_TTL = 120;
export const SESSION_TTL = 30 * 24 * 3600;
const CC = /^[A-Za-z0-9_-]{43}$/;
const VERIFIER = /^[A-Za-z0-9_-]{43,128}$/;

const secret = () => {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET missing");
  return s;
};
export const challengeOf = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");
export const validChallenge = (cc: string | null): cc is string => !!cc && CC.test(cc);

export async function mintHandoff(acct: string, name: string | null, cc: string): Promise<string> {
  return encode({ token: { acct, name, cc }, secret: secret(), salt: HANDOFF_SALT, maxAge: HANDOFF_TTL });
}

export async function exchangeHandoff(code: string, verifier: string): Promise<string | null> {
  if (!VERIFIER.test(verifier)) return null;
  const t = await decode({ token: code, secret: secret(), salt: HANDOFF_SALT }).catch(() => null);
  if (!t || typeof t.acct !== "string" || typeof t.cc !== "string") return null;
  const a = Buffer.from(challengeOf(verifier)), b = Buffer.from(t.cc);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return encode({ token: { acct: t.acct, name: (t.name as string | null) ?? null, mob: true }, secret: secret(), salt: SESSION_SALT, maxAge: SESSION_TTL });
}

/** Bearer → {acct,name}, or null. Only accepts tokens minted by exchangeHandoff (salt + mob claim). */
export async function bearerSession(authorization: string | null): Promise<{ acct: string; name: string | null } | null> {
  const m = /^Bearer ([A-Za-z0-9._~+/=-]+)$/.exec(authorization ?? "");
  if (!m || !process.env.NEXTAUTH_SECRET) return null;
  const t = await decode({ token: m[1], secret: secret(), salt: SESSION_SALT }).catch(() => null);
  if (!t || t.mob !== true || typeof t.acct !== "string") return null;
  return { acct: t.acct, name: (t.name as string | null) ?? null };
}
