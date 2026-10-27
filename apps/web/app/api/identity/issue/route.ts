import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { accountHash, blindSign } from "@/lib/crypto";
import { currentEpoch } from "@/lib/poll";
import { stores } from "@/lib/store";
export const runtime = "nodejs";

/** Zone A: sees who you are, signs a blinded message it cannot read. Never sees votes. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const acct = (session as { acct?: string } | null)?.acct;
  if (!acct) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { blindedMsg?: string } | null;
  if (!body?.blindedMsg) return Response.json({ error: "bad_request" }, { status: 400 });
  const first = await stores().identity.claimIssuance(accountHash(acct), currentEpoch());
  if (!first) return Response.json({ error: "already_issued" }, { status: 409 });
  const sig = await blindSign(new Uint8Array(Buffer.from(body.blindedMsg, "base64")));
  return Response.json({ blindSig: Buffer.from(sig).toString("base64"), epoch: currentEpoch() });
}
