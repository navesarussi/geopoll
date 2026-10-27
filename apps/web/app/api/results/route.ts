import { results, seedDummy } from "@/lib/service";
import { stores } from "@/lib/store";
import { DEMO_POLL } from "@/lib/poll";
import { config, getPoll } from "@/lib/config";
import { syncPolls } from "@/lib/polls";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const g = globalThis as { __gpSeeded?: boolean };
export async function GET(req: Request) {
  const pollId = new URL(req.url).searchParams.get("poll") ?? DEMO_POLL.id;
  const s = await stores();
  await syncPolls(s.ballots);
  if (!getPoll(pollId)) return Response.json({ error: "unknown_poll" }, { status: 404 });
  const n = Number(process.env.SEED_DUMMY_VOTES ?? 0);
  if (n > 0 && !g.__gpSeeded) { g.__gpSeeded = true; for (const p of config().polls.filter((x) => x.dummy)) await seedDummy(s.ballots, n, p.id); }
  return Response.json(await results(s.ballots, new Date(), pollId));
}
