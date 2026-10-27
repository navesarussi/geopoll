import { sessionAccount, sessionDisplayName } from "@/lib/auth";
import { AVATARS, authorHash, newPid, validateProfile } from "@/lib/content";
import { stores } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Zone C: my public profile. Keyed by the zone-C profile hash only; nothing from zone A/B; never the email. */
export async function GET() {
  const acct = await sessionAccount();
  if (!acct) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const p = await (await stores()).content.getProfile(authorHash(acct));
  if (p) return Response.json({ profile: { pid: p.pid, displayName: p.display_name, bio: p.bio, avatar: p.avatar, consented: p.consented }, avatars: AVATARS });
  const suggested = (await sessionDisplayName())?.slice(0, 40) ?? "";
  return Response.json({ profile: null, suggested: { displayName: suggested, bio: "", avatar: AVATARS[0] }, avatars: AVATARS });
}

export async function PUT(req: Request) {
  const acct = await sessionAccount();
  if (!acct) return Response.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  const v = validateProfile((await req.json().catch(() => ({}))) as Record<string, unknown>);
  if (!v.ok) return Response.json(v, { status: 400 });
  const { content } = await stores();
  const h = authorHash(acct);
  const existing = await content.getProfile(h);
  await content.upsertProfile(h, existing?.pid ?? newPid(), v.value);
  const p = await content.getProfile(h);
  return Response.json({ ok: true, pid: p!.pid });
}
