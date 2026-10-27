/**
 * Ballot-token wallet (ADR-0019/0020), same protocol as apps/web/app/VoteClient.tsx:
 * RFC 9474 RSABSSA-SHA384-PSS-Randomized via @cloudflare/blindrsa-ts. The server signs a blinded message it
 * cannot read; we unblind on device. The token is kept in the KV port (= iOS Keychain / Android Keystore
 * via expo-secure-store) and never leaves the device except inside a ballot sent through the relay.
 */
import { RSABSSA } from "@cloudflare/blindrsa-ts";
import { b64, hex, unb64 } from "./b64";
import type { Http, KV, Token } from "./types";

export const TOKEN_KEY = "gp.token.v2";
const ALG = { name: "RSA-PSS", hash: "SHA-384" };
const subtle = () => globalThis.crypto.subtle;

export class TokenError extends Error {}

export async function loadToken(kv: KV): Promise<Token | null> {
  const s = await kv.get(TOKEN_KEY);
  if (!s) return null;
  try { return JSON.parse(s) as Token; } catch { return null; }
}

export async function getOrIssueToken(kv: KV, http: Http): Promise<Token> {
  const pk = await http("/api/identity/pubkey");
  const { keys, epoch } = pk.json as { keys: Record<string, string>; epoch: string };
  const saved = await loadToken(kv);
  if (saved && saved.epoch === epoch) return saved;
  const t = await http("/api/identity/tier", { auth: true });
  if (t.status === 401) throw new TokenError("unauthenticated");
  const tier = (t.json as { tier: string | null }).tier;
  if (!tier || !keys[tier]) throw new TokenError("no_tier");
  const key = await subtle().importKey("spki", unb64(keys[tier]) as BufferSource, ALG, true, ["verify"]);
  const suite = RSABSSA.SHA384.PSS.Randomized();
  const nonce = hex(globalThis.crypto.getRandomValues(new Uint8Array(32)));
  const prepared = suite.prepare(new TextEncoder().encode(`geopoll|v2|${epoch}|${tier}|${nonce}`));
  const { blindedMsg, inv } = await suite.blind(key, prepared);
  const res = await http("/api/identity/issue", { method: "POST", body: { blindedMsg: b64(blindedMsg), tier }, auth: true });
  if (res.status !== 200) throw new TokenError((res.json as { error?: string })?.error ?? "issue_failed");
  const { blindSig } = res.json as { blindSig: string };
  const sig = await suite.finalize(key, prepared, unb64(blindSig), inv);
  const tok: Token = { epoch, tier, preparedMsg: b64(prepared), signature: b64(sig) };
  await kv.set(TOKEN_KEY, JSON.stringify(tok));
  return tok;
}

/** Same derivation as server nullifier() (apps/web/lib/crypto.ts) – lets the device ask "was I counted?" without revealing the choice. */
export async function deviceNullifier(pollId: string, preparedMsgB64: string): Promise<string> {
  const head = new TextEncoder().encode(`geopoll-nullifier|${pollId}|`);
  const msg = unb64(preparedMsgB64);
  const buf = new Uint8Array(head.length + msg.length);
  buf.set(head); buf.set(msg, head.length);
  return hex(new Uint8Array(await subtle().digest("SHA-256", buf)));
}
