import { sessionAccount } from "@/lib/auth";
import { accountHash, blindSign } from "@/lib/crypto";
import { tierForAccount } from "@/lib/identity";
import { currentEpoch } from "@/lib/poll";
import { stores } from "@/lib/store";
export const runtime = "nodejs";

/** Zone A: sees who you are, signs a blinded message it cannot read. Never sees votes. */
export async function POST(req: Request) {
  const acct = await sessionAccount();
  if (!acct) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { blindedMsg?: string; tier?: string } | null;
  // Tier is decided HERE (server), never by the client; the client learns it to pick the matching key.
  if (!body?.blindedMsg) return Response.json({ error: "bad_request" }, { status: 400 });
  const tier = await tierForAccount(acct);
  if (!tier) return Response.json({ error: "no_tier" }, { status: 403 });
  // A mismatch would only yield an unverifiable token; fail early with a clear error instead.
  if (body.tier !== tier) return Response.json({ error: "tier_mismatch", tier }, { status: 409 });
  const first = await (await stores()).identity.claimIssuance(accountHash(acct), currentEpoch());
  if (!first) return Response.json({ error: "already_issued" }, { status: 409 });
  const sig = await blindSign(new Uint8Array(Buffer.from(body.blindedMsg, "base64")), tier);
  return Response.json({ blindSig: Buffer.from(sig).toString("base64"), epoch: currentEpoch(), tier });
}
