import { loadVersionPolicy, updateStatus, type ClientPlatform } from "@geopoll/config";
export const dynamic = "force-dynamic";

/** GET /api/version?v=1.2.3&platform=ios → force-update policy for native clients. No auth, no user data. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const policy = loadVersionPolicy(process.env);
  const v = u.searchParams.get("v");
  const platform = (u.searchParams.get("platform") ?? "web") as ClientPlatform;
  return Response.json(
    { ...policy, storeUrl: policy.storeUrls[platform] ?? null, status: v == null ? null : updateStatus(v, policy) },
    { headers: { "cache-control": "public, max-age=300" } },
  );
}
