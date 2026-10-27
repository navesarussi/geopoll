import { sessionAccount } from "@/lib/auth";
import { authorHash, createPost } from "@/lib/content";
import { DEMO_POLL } from "@/lib/poll";
import { stores } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Zone C: public positions & replies. Separate from the secret ballot; never joined with it. */
export async function GET() {
  const acct = await sessionAccount();
  const { content } = await stores();
  const [posts, counts] = await Promise.all([
    content.list(DEMO_POLL.id, acct ? authorHash(acct) : null),
    content.positionCounts(DEMO_POLL.id),
  ]);
  return Response.json({ label: "עמדות פומביות - לא התוצאה הרשמית", counts, posts });
}

export async function POST(req: Request) {
  const acct = await sessionAccount();
  if (!acct) return Response.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  const r = await createPost((await stores()).content, authorHash(acct), {
    parentId: typeof b.parentId === "number" ? b.parentId : null,
    displayName: typeof b.displayName === "string" ? b.displayName : "",
    option: typeof b.option === "string" ? b.option : null,
    body: typeof b.body === "string" ? b.body : "",
  });
  return Response.json(r, { status: r.ok ? 200 : r.error === "rate_limited" ? 429 : 400 });
}
