import { stores } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Public profile: name, bio, avatar and NON-anonymous posts only. */
export async function GET(_: Request, { params }: { params: Promise<{ pid: string }> }) {
  const pid = (await params).pid;
  if (!/^[A-Za-z0-9_-]{6,32}$/.test(pid)) return Response.json({ error: "not_found" }, { status: 404 });
  const r = await (await stores()).content.publicProfile(pid);
  return r ? Response.json(r) : Response.json({ error: "not_found" }, { status: 404 });
}
