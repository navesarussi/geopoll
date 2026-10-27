import { blackoutFor, config, polls } from "@/lib/config";
import { effectiveStatus, syncPolls } from "@/lib/polls";
import { stores } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public poll list for web + mobile (TestFlight). Definitions only (all locales), effective status and §16ה flag.
 * No counts, no ballots, no identity. Clients fall back to the compiled-in config polls if this fails.
 */
export async function GET() {
  const s = await stores();
  await syncPolls(s.ballots);
  const now = new Date();
  const out = [];
  for (const p of polls()) {
    out.push({ ...p, status: await effectiveStatus(s.ballots, p, now), blackout: blackoutFor(p, now).active });
  }
  return Response.json({ polls: out, kThreshold: config().jurisdiction.thresholds.kNational, at: now.toISOString() },
    { headers: { "cache-control": "public, max-age=30" } });
}
