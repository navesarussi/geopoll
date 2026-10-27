/**
 * T-110 (#41): BETA relay between the device and zone B (vote API).
 * Forwards ONLY allow-listed paths, ONLY the JSON body and a fixed content-type. Everything that could
 * identify the sender — cookies, auth, IP / X-Forwarded-*, User-Agent, Referer, Accept-Language, client hints —
 * is dropped. The relay keeps no logs of bodies or addresses.
 * LIMITS (honest): when relay and vote API run on the same operator/infra (beta), the operator still sees IPs
 * at the edge. Production: OHTTP (RFC 9458) with an independent relay operator.
 */
import { timingSafeEqual } from "node:crypto";

export const RELAY_PATHS: Record<string, string> = { vote: "/api/vote", "vote-status": "/api/vote/status" };
export const MAX_BODY = 8 * 1024;
/** Shared secret header proving the request came through the relay (when vote API enforces RELAY_ONLY). */
export const RELAY_HEADER = "x-geopoll-relay";

export type RelayResult = { status: number; body: string };

export async function relay(
  path: string,
  req: { method: string; body: string },
  opts: { upstream: string; secret?: string; fetchImpl?: typeof fetch },
): Promise<RelayResult> {
  const target = RELAY_PATHS[path];
  if (!target) return { status: 404, body: JSON.stringify({ ok: false, error: "not_found" }) };
  if (req.method !== "POST") return { status: 405, body: JSON.stringify({ ok: false, error: "method" }) };
  if (Buffer.byteLength(req.body) > MAX_BODY) return { status: 413, body: JSON.stringify({ ok: false, error: "too_large" }) };
  try { JSON.parse(req.body); } catch { return { status: 400, body: JSON.stringify({ ok: false, error: "bad_request" }) }; }
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.secret) headers[RELAY_HEADER] = opts.secret;
  const f = opts.fetchImpl ?? fetch;
  try {
    const r = await f(new URL(target, opts.upstream), { method: "POST", headers, body: req.body, redirect: "error", cache: "no-store" });
    return { status: r.status, body: await r.text() };
  } catch {
    return { status: 502, body: JSON.stringify({ ok: false, error: "upstream" }) };
  }
}

/** Vote API side: with RELAY_ONLY=1, accept only requests carrying the relay secret. */
export function viaRelay(req: Request, env = process.env): boolean {
  if (env.RELAY_ONLY !== "1") return true;
  const s = env.RELAY_SECRET, got = req.headers.get(RELAY_HEADER);
  if (!s || !got) return false;
  const a = Buffer.from(got), b = Buffer.from(s);
  return a.length === b.length && timingSafeEqual(a, b);
}
