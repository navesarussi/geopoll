import { RSABSSA } from "@cloudflare/blindrsa-ts";
import { createHash, createHmac, webcrypto } from "node:crypto";

// RFC 9474 RSABSSA-SHA384-PSS-Randomized. No home-made primitives (AGENTS.md §2.4).
export const suite = () => RSABSSA.SHA384.PSS.Randomized();
const subtle = webcrypto.subtle as unknown as SubtleCrypto;
const ALG = { name: "RSA-PSS", hash: "SHA-384" };

export const TOKEN_PREFIX = "geopoll|v1|";
/** Randomized variant prepends 32 random bytes in prepare(). */
export const PREPARE_RANDOM_LEN = 32;

let keyPromise: Promise<{ privateKey: CryptoKey; publicKey: CryptoKey }> | null = null;

/** Issuer key: from ISSUER_PRIVATE_JWK env (prod/preview) or ephemeral (dev/tests). */
export function issuerKeys() {
  if (!keyPromise) {
    keyPromise = (async () => {
      const jwk = process.env.ISSUER_PRIVATE_JWK;
      if (jwk) {
        const priv = JSON.parse(jwk) as JsonWebKey;
        const privateKey = await subtle.importKey("jwk", priv, ALG, true, ["sign"]);
        const { kty, n, e } = priv;
        const publicKey = await subtle.importKey("jwk", { kty, n, e }, ALG, true, ["verify"]);
        return { privateKey, publicKey };
      }
      return (await suite().generateKey({
        publicExponent: Uint8Array.from([1, 0, 1]),
        modulusLength: 2048,
      })) as { privateKey: CryptoKey; publicKey: CryptoKey };
    })();
  }
  return keyPromise;
}

export async function publicKeySpki(): Promise<string> {
  const { publicKey } = await issuerKeys();
  return Buffer.from(await subtle.exportKey("spki", publicKey)).toString("base64");
}

export async function blindSign(blindedMsg: Uint8Array): Promise<Uint8Array> {
  const { privateKey } = await issuerKeys();
  return suite().blindSign(privateKey, blindedMsg);
}

export async function verifyToken(preparedMsg: Uint8Array, sig: Uint8Array): Promise<boolean> {
  const { publicKey } = await issuerKeys();
  try {
    return await suite().verify(publicKey, sig, preparedMsg);
  } catch {
    return false;
  }
}

/** Extract epoch from prepared token message: [32 random][geopoll|v1|<epoch>|<hex nonce>]. */
export function tokenEpoch(preparedMsg: Uint8Array): string | null {
  const text = new TextDecoder().decode(preparedMsg.slice(PREPARE_RANDOM_LEN));
  const m = /^geopoll\|v1\|(\d{4}-\d{2})\|[0-9a-f]{64}$/.exec(text);
  return m ? m[1] : null;
}

/** Per-poll nullifier: stable for the same token+poll (revote replaces), unlinkable to identity. */
export function nullifier(preparedMsg: Uint8Array, pollId: string): string {
  return createHash("sha256").update("geopoll-nullifier|").update(pollId).update("|").update(preparedMsg).digest("hex");
}

/** Identity-zone pseudonym for "one token per account per epoch". Raw email is never stored. */
export function accountHash(accountId: string): string {
  const key = process.env.IDENTITY_HMAC_KEY ?? "dev-only-insecure-key";
  return createHmac("sha256", key).update(accountId).digest("hex");
}
