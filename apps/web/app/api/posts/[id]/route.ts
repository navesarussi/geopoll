import { sessionAccount } from "@/lib/auth";
import { authorKeys } from "@/lib/content";
import { stores } from "@/lib/store";
export const runtime = "nodejs";
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const acct = await sessionAccount();
  if (!acct) return Response.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  const id = Number((await params).id);
  const { content } = await stores();
  const poll = await content.pollOf(id);
  const ok = poll != null && (await content.deleteOwn(id, authorKeys(acct, poll)));
  return Response.json({ ok }, { status: ok ? 200 : 404 });
}
