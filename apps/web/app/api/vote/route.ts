import { castVote } from "@/lib/service";
import { stores } from "@/lib/store";
export const runtime = "nodejs";

/** Zone B: deliberately does NOT read cookies/session/headers. Client sends with credentials:"omit". */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as Record<string, string> | null;
  if (!b?.pollId || !b.option || !b.preparedMsg || !b.signature) return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  const s = await stores();
  const r = await castVote(s.ballots, {
    pollId: b.pollId,
    option: b.option,
    preparedMsg: new Uint8Array(Buffer.from(b.preparedMsg, "base64")),
    signature: new Uint8Array(Buffer.from(b.signature, "base64")),
  });
  return Response.json(r, { status: r.ok ? 200 : 400 });
}
