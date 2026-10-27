import type { IdentityStore } from "../store";
import { docDedupeHash, MAX_IMAGE_BYTES, wipe, type T2Provider } from "./t2";

export type T2Outcome = { ok: true; tier: "T2"; effectiveFrom: "next_epoch" } | { ok: false; error: string };

/** Zone A only. Evidence is used once and wiped; only the keyed dedupe hash is stored. */
export async function completeT2(identity: IdentityStore, provider: T2Provider, accountHash: string,
  sessionId: string, ev: { document: Uint8Array; selfie: Uint8Array; docNumber: string }): Promise<T2Outcome> {
  if (ev.document.length > MAX_IMAGE_BYTES || ev.selfie.length > MAX_IMAGE_BYTES) { wipe(ev); return { ok: false, error: "too_large" }; }
  let res;
  try { res = await provider.complete(sessionId, ev); } finally { wipe(ev); }
  if (!res.passed || !res.docNumber) return { ok: false, error: res.reason ?? "failed" };
  const r = await identity.recordT2(accountHash, docDedupeHash(res.docNumber), provider.id);
  if (r === "duplicate") return { ok: false, error: "duplicate_document" };
  // ADR-0019: a tier change applies from the next epoch (this epoch's token may already be issued).
  return { ok: true, tier: "T2", effectiveFrom: "next_epoch" };
}
