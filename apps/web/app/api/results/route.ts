import { results, seedDummy } from "@/lib/service";
import { stores } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const g = globalThis as { __gpSeeded?: boolean };
export async function GET() {
  const s = await stores();
  const n = Number(process.env.SEED_DUMMY_VOTES ?? 0);
  if (n > 0 && !g.__gpSeeded) { g.__gpSeeded = true; await seedDummy(s.ballots, n); }
  return Response.json(await results(s.ballots));
}
