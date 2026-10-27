import { sessionAccount } from "@/lib/auth";
import { authorHash, authorKeys, createPost } from "@/lib/content";
import { config } from "@/lib/config";
import { DEMO_POLL } from "@/lib/poll";
import { getPoll } from "@/lib/config";
import { stores } from "@/lib/store";
import { syncPolls } from "@/lib/polls";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Zone C: public positions & replies. Separate from the secret ballot; never joined with it. */
export async function GET(req: Request) {
  await syncPolls((await stores()).ballots);
  const pollId = new URL(req.url).searchParams.get("poll") ?? DEMO_POLL.id;
  if (!getPoll(pollId)) return Response.json({ error: "unknown_poll" }, { status: 404 });
  const acct = await sessionAccount();
  const { content } = await stores();
  const [posts, counts] = await Promise.all([
    content.list(pollId, acct ? authorKeys(acct, pollId) : []),
    content.positionCounts(pollId),
  ]);
  const me = acct ? await content.getProfile(authorHash(acct)) : null;
  return Response.json({ label: "עמדות פומביות - לא התוצאה הרשמית", counts, posts,
    me: acct ? { hasProfile: !!me, consented: !!me?.consented, defaultAnonymous: me?.is_minor && config().features.teenDefaultAnonymous ? true : config().features.publicIdentityDefault === "anonymous" } : null });
}

export async function POST(req: Request) {
  await syncPolls((await stores()).ballots);
  const acct = await sessionAccount();
  if (!acct) return Response.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  const r = await createPost((await stores()).content, acct, {
    pollId: typeof b.pollId === "string" ? b.pollId : undefined,
    parentId: typeof b.parentId === "number" ? b.parentId : null,
    option: typeof b.option === "string" ? b.option : null,
    body: typeof b.body === "string" ? b.body : "",
    anonymous: typeof b.anonymous === "boolean" ? b.anonymous : undefined,
    consent: b.consent === true,
  });
  return Response.json(r, { status: r.ok ? 200 : r.error === "rate_limited" ? 429 : 400 });
}
