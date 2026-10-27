import { RSABSSA } from "@cloudflare/blindrsa-ts";
import { createHash, createHmac, webcrypto } from "node:crypto";

// RFC 9474 RSABSSA-SHA384-PSS-Randomized. No home-made primitives (AGENTS.md §2.4).
export const suite = () => RSABSSA.SHA384.PSS.Randomized();
const subtle = webcrypto.subtle as unknown as SubtleCrypto;
const ALG = { name: "RSA-PSS", hash: "SHA-384" };

export const TOKEN_PREFIX = "geopoll|v2|";
/** Randomized variant prepends 32 random bytes in prepare(). */
export const PREPARE_RANDOM_LEN = 32;

export const TIERS = ["T0", "T1", "T2", "T3"] as const;
export type Tier = (typeof TIERS)[number];
type KeyPair = { privateKey: CryptoKey; publicKey: CryptoKey };
const keyCache = new Map<Tier, Promise<KeyPair>>();

/**
 * One issuer key PER TIER (ADR-0019 §2): the tier is bound by WHICH key signed the token, so a client
 * cannot claim a higher tier. Keys: ISSUER_PRIVATE_JWK_<TIER> (T0 falls back to ISSUER_PRIVATE_JWK);
 * if missing, an ephemeral key is generated (dev/tests only).
 */
export function issuerKeys(tier: Tier = "T0"): Promise<KeyPair> {
  let p = keyCache.get(tier);
  if (!p) {
    p = (async () => {
      const jwk = process.env[`ISSUER_PRIVATE_JWK_${tier}`] ?? (tier === "T0" ? process.env.ISSUER_PRIVATE_JWK : undefined);
      if (jwk) {
        const priv = JSON.parse(jwk) as JsonWebKey;
        const privateKey = await subtle.importKey("jwk", priv, ALG, true, ["sign"]);
        const { kty, n, e } = priv;
        const publicKey = await subtle.importKey("jwk", { kty, n, e }, ALG, true, ["verify"]);
        return { privateKey, publicKey };
      }
      return (await suite().generateKey({ publicExponent: Uint8Array.from([1, 0, 1]), modulusLength: 2048 })) as KeyPair;
    })();
    keyCache.set(tier, p);
  }
  return p;
}

export async function publicKeySpki(tier: Tier = "T0"): Promise<string> {
  const { publicKey } = await issuerKeys(tier);
  return Buffer.from(await subtle.exportKey("spki", publicKey)).toString("base64");
}

export async function blindSign(blindedMsg: Uint8Array, tier: Tier = "T0"): Promise<Uint8Array> {
  const { privateKey } = await issuerKeys(tier);
  return suite().blindSign(privateKey, blindedMsg);
}

/** Verifies against the key of the tier named in the token; returns that tier only if the signature matches. */
export async function verifyToken(preparedMsg: Uint8Array, sig: Uint8Array): Promise<Tier | null> {
  const parsed = parseToken(preparedMsg);
  if (!parsed) return null;
  const { publicKey } = await issuerKeys(parsed.tier);
  try {
    return (await suite().verify(publicKey, sig, preparedMsg)) ? parsed.tier : null;
  } catch {
    return null;
  }
}

/** Token text after the 32 random prepare() bytes: geopoll|v2|<epoch>|<tier>|<hex nonce>. */
export function parseToken(preparedMsg: Uint8Array): { epoch: string; tier: Tier } | null {
  const text = new TextDecoder().decode(preparedMsg.slice(PREPARE_RANDOM_LEN));
  const m = /^geopoll\|v2\|(\d{4}-\d{2})\|(T[0-3])\|[0-9a-f]{64}$/.exec(text);
  return m ? { epoch: m[1], tier: m[2] as Tier } : null;
}

export const tokenEpoch = (m: Uint8Array) => parseToken(m)?.epoch ?? null;

/** Per-poll nullifier: stable for the same token+poll (revote replaces), unlinkable to identity. */
export function nullifier(preparedMsg: Uint8Array, pollId: string): string {
  return createHash("sha256").update("geopoll-nullifier|").update(pollId).update("|").update(preparedMsg).digest("hex");
}

/** Identity-zone pseudonym for "one token per account per epoch". Raw email is never stored. */
export function accountHash(accountId: string): string {
  const key = process.env.IDENTITY_HMAC_KEY ?? "dev-only-insecure-key";
  return createHmac("sha256", key).update(accountId).digest("hex");
}
