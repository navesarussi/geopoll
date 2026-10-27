import { relay } from "@/lib/relay";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Same-deployment relay (beta). Reads only the body; never reads cookies, IP or other headers.
 * Upstream = RELAY_UPSTREAM (e.g. a separate vote service) or this deployment's own origin.
 */
export async function POST(req: Request, { params }: { params: Promise<{ path: string }> }) {
  const upstream = process.env.RELAY_UPSTREAM ?? new URL(req.url).origin;
  const r = await relay((await params).path, { method: "POST", body: await req.text() }, { upstream, secret: process.env.RELAY_SECRET });
  return new Response(r.body, { status: r.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
