import { publicKeySpki, TIERS } from "@/lib/crypto";
import { currentEpoch } from "@/lib/poll";
export const runtime = "nodejs";
export async function GET() {
  const keys = Object.fromEntries(await Promise.all(TIERS.map(async (t) => [t, await publicKeySpki(t)] as const)));
  return Response.json({ keys, epoch: currentEpoch() });
}
