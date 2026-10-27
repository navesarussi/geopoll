import { results, seedDummy } from "@/lib/service";
import { stores } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const s = stores() as ReturnType<typeof stores> & { seeded?: boolean };
  const n = Number(process.env.SEED_DUMMY_VOTES ?? 0);
  if (n > 0 && !s.seeded) { s.seeded = true; await seedDummy(s.ballots, n); }
  return Response.json(await results(s.ballots));
}
