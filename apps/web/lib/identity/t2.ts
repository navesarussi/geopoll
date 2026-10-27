import { createHmac, randomUUID } from "node:crypto";

/**
 * ADR-0024 (proposed): provider-agnostic T2 (document photo + face match/liveness).
 * A provider returns ONLY pass/fail + the document number (used once, in memory, to build a keyed dedupe hash).
 * Images are never persisted or logged by us; callers must not keep references after complete().
 */
export interface T2Evidence { document: Uint8Array; selfie: Uint8Array; docNumber: string }
export interface T2Result { passed: boolean; reason?: "liveness_failed" | "face_mismatch" | "document_invalid"; docNumber?: string }
export interface T2Provider {
  id: string;
  start(): Promise<{ sessionId: string }>;
  complete(sessionId: string, ev: T2Evidence): Promise<T2Result>;
}

export const MAX_IMAGE_BYTES = 3_000_000;

/** DUMMY provider for tests/beta: passes only dummy documents ("DUMMY-…"). Never a real verification. */
export class MockT2Provider implements T2Provider {
  id = "mock";
  private sessions = new Set<string>();
  async start() { const sessionId = randomUUID(); this.sessions.add(sessionId); return { sessionId }; }
  async complete(sessionId: string, ev: T2Evidence): Promise<T2Result> {
    if (!this.sessions.delete(sessionId)) return { passed: false, reason: "document_invalid" };
    if (!ev.document.length || !ev.selfie.length) return { passed: false, reason: "document_invalid" };
    if (!/^DUMMY-[A-Z0-9]{4,20}$/.test(ev.docNumber)) return { passed: false, reason: "document_invalid" };
    if (ev.selfie[0] === 0) return { passed: false, reason: "liveness_failed" }; // test hook
    return { passed: true, docNumber: ev.docNumber };
  }
}

export const t2Enabled = (env = process.env) => env.FEATURE_T2_KYC === "1";

/** Mock is refused in production unless this is the demo deployment. Real vendors plug in here. */
export function t2Provider(env = process.env): T2Provider | null {
  if (!t2Enabled(env)) return null;
  const name = env.T2_PROVIDER ?? "mock";
  if (name === "mock") {
    if (env.NODE_ENV === "production" && env.DEMO_LOGIN !== "1") return null;
    const g = globalThis as { __t2mock?: MockT2Provider };
    return (g.__t2mock ??= new MockT2Provider());
  }
  return null; // no real vendor wired yet (needs Nave's decision + contract + lawyer K1–K5)
}

export function docDedupeHash(docNumber: string, env = process.env): string {
  const key = env.T2_DEDUPE_KEY ?? (env.NODE_ENV === "production" ? undefined : "dev-only-t2-dedupe-key");
  if (!key) throw new Error("T2_DEDUPE_KEY missing");
  return createHmac("sha256", key).update(`t2|${docNumber.trim().toUpperCase()}`).digest("hex");
}

/** Wipe evidence buffers once the provider answered (defence in depth; GC still owns memory). */
export const wipe = (ev: T2Evidence) => { ev.document.fill(0); ev.selfie.fill(0); };
