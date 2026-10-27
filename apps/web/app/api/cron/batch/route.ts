import { timingSafeEqual } from "node:crypto";
import { runBatch } from "@/lib/service";
import { stores } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Scheduled batch trigger (Vercel Cron / external scheduler). Requires `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || got.length !== want.length || !timingSafeEqual(got, want)) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await runBatch((await stores()).ballots));
}
