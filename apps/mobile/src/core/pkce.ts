import { b64url } from "./b64";
/** Verifier/challenge for the native sign-in handoff (apps/web/lib/mobile-auth.ts). */
export async function makePkce(): Promise<{ verifier: string; challenge: string }> {
  const verifier = b64url(globalThis.crypto.getRandomValues(new Uint8Array(32)));
  const d = new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  return { verifier, challenge: b64url(d) };
}
export function codeFromRedirect(url: string): string | null {
  const m = /^geopoll:\/\/auth\?(.*)$/.exec(url);
  if (!m) return null;
  for (const kv of m[1].split("&")) { const [k, v] = kv.split("="); if (k === "code" && v) return decodeURIComponent(v); }
  return null;
}
