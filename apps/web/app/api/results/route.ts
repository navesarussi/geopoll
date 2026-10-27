import { results, seedDummy } from "@/lib/service";
import { stores } from "@/lib/store";
import { DEMO_POLL } from "@/lib/poll";
import { getPoll, polls } from "@/lib/config";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const g = globalThis as { __gpSeeded?: boolean };
export async function GET(req: Request) {
  const pollId = new URL(req.url).searchParams.get("poll") ?? DEMO_POLL.id;
  if (!getPoll(pollId)) return Response.json({ error: "unknown_poll" }, { status: 404 });
  const s = await stores();
  const n = Number(process.env.SEED_DUMMY_VOTES ?? 0);
  if (n > 0 && !g.__gpSeeded) { g.__gpSeeded = true; for (const p of polls()) await seedDummy(s.ballots, n, p.id); }
  return Response.json(await results(s.ballots, new Date(), pollId));
}
