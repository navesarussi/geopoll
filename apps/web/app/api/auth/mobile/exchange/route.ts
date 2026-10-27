import { exchangeHandoff } from "@/lib/mobile-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Step 3: {code, verifier} → bearer session for the native app. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { code?: unknown; verifier?: unknown } | null;
  if (typeof b?.code !== "string" || typeof b.verifier !== "string") return Response.json({ error: "bad_request" }, { status: 400 });
  const token = await exchangeHandoff(b.code, b.verifier);
  if (!token) return Response.json({ error: "invalid_code" }, { status: 401 });
  return Response.json({ token }, { headers: { "cache-control": "no-store" } });
}
