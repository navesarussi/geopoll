import { stores } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Zone B, T-207: the device asks whether ITS ballot is queued/counted. Input: nullifier only (computed on device).
 * Never returns the chosen option, so the answer can't prove to a coercer HOW you voted; you can still revote.
 * Like /api/vote: no session/cookies read.
 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { nullifier?: string } | null;
  if (!b?.nullifier || !/^[0-9a-f]{64}$/.test(b.nullifier)) return Response.json({ error: "bad_request" }, { status: 400 });
  const { ballots } = await stores();
  return Response.json({ status: await ballots.status(b.nullifier), lastBatch: (await ballots.lastFlush())?.toISOString() ?? null });
}
