import { compareVersions, type UpdateStatus } from "@geopoll/config";
import type { Http } from "./types";

export type VersionCheck = { status: UpdateStatus; storeUrl: string | null };
/** GET /api/version (packages/config/app-version.ts). Fails OPEN on network error so offline voting still works. */
export async function checkVersion(http: Http, appVersion: string, platform: "ios" | "android"): Promise<VersionCheck> {
  try {
    const r = await http(`/api/version?v=${encodeURIComponent(appVersion)}&platform=${platform}`);
    const j = r.json as { minSupportedVersion: string; latestVersion: string; storeUrl: string | null };
    const status: UpdateStatus = compareVersions(appVersion, j.minSupportedVersion) < 0 ? "force-update"
      : compareVersions(appVersion, j.latestVersion) < 0 ? "update-available" : "ok";
    return { status, storeUrl: j.storeUrl ?? null };
  } catch {
    return { status: "ok", storeUrl: null };
  }
}
