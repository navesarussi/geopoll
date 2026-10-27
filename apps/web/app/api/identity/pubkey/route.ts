import { publicKeySpki } from "@/lib/crypto";
import { currentEpoch } from "@/lib/poll";
export const runtime = "nodejs";
export async function GET() {
  return Response.json({ spki: await publicKeySpki(), epoch: currentEpoch() });
}
