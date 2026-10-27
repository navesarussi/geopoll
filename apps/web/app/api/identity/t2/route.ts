import { sessionAccount } from "@/lib/auth";
import { accountHash } from "@/lib/crypto";
import { t2Provider } from "@/lib/identity/t2";
import { completeT2 } from "@/lib/identity/t2-service";
import { stores } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Zone A, ADR-0024 (proposed), behind FEATURE_T2_KYC. Request bodies are never logged or stored. */
export async function POST(req: Request) {
  const provider = t2Provider();
  if (!provider) return Response.json({ error: "not_enabled" }, { status: 404 });
  const acct = await sessionAccount();
  if (!acct) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { action?: string; sessionId?: string; document?: string; selfie?: string; docNumber?: string } | null;
  if (b?.action === "start") return Response.json(await provider.start());
  if (b?.action !== "complete" || !b.sessionId || !b.document || !b.selfie || !b.docNumber) return Response.json({ error: "bad_request" }, { status: 400 });
  const out = await completeT2((await stores()).identity, provider, accountHash(acct), b.sessionId, {
    document: new Uint8Array(Buffer.from(b.document, "base64")), selfie: new Uint8Array(Buffer.from(b.selfie, "base64")), docNumber: b.docNumber,
  });
  b.document = b.selfie = b.docNumber = undefined;
  return Response.json(out, { status: out.ok ? 200 : 422 });
}
