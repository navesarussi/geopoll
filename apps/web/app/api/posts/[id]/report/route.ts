import { sessionAccount } from "@/lib/auth";
import { authorHash } from "@/lib/content";
import { stores } from "@/lib/store";
export const runtime = "nodejs";
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const acct = await sessionAccount();
  if (!acct) return Response.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  const ok = await (await stores()).content.report(Number((await params).id), authorHash(acct));
  return Response.json({ ok });
}
