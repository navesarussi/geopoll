import { sessionAccount } from "@/lib/auth";
import { tierForAccount } from "@/lib/identity";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Zone A: tells the signed-in client which tier key to blind against. Tier only, no attributes. */
export async function GET() {
  const acct = await sessionAccount();
  if (!acct) return Response.json({ error: "unauthenticated" }, { status: 401 });
  return Response.json({ tier: await tierForAccount(acct) });
}
