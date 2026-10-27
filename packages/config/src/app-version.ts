/**
 * Force-update policy for native clients (docs/mobile/store-plan.md, ADR-0025 proposed).
 * Ship from day one so a broken/insecure client can be retired remotely. Served at GET /api/version.
 * Env overrides (deploy-level): GEOPOLL_MIN_SUPPORTED_VERSION, GEOPOLL_LATEST_VERSION.
 */
export type ClientPlatform = "ios" | "android" | "web";
export interface VersionPolicy {
  /** Clients below this MUST update (blocking screen). */
  minSupportedVersion: string;
  /** Clients below this SHOULD update (dismissible prompt). */
  latestVersion: string;
  storeUrls: Partial<Record<ClientPlatform, string>>;
}
export type UpdateStatus = "ok" | "update-available" | "force-update";

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
export function parseVersion(v: string): [number, number, number] {
  const m = SEMVER.exec(v.trim());
  if (!m) throw new Error(`invalid version "${v}" (expected MAJOR.MINOR.PATCH)`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}
export function compareVersions(a: string, b: string): number {
  const x = parseVersion(a), y = parseVersion(b);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}

/** No native app exists yet; store URLs are filled in once listings exist. */
export const DEFAULT_VERSION_POLICY: VersionPolicy = { minSupportedVersion: "0.0.0", latestVersion: "0.0.0", storeUrls: {} };

export function loadVersionPolicy(env: Record<string, string | undefined> = {}): VersionPolicy {
  const p: VersionPolicy = {
    ...DEFAULT_VERSION_POLICY,
    minSupportedVersion: env.GEOPOLL_MIN_SUPPORTED_VERSION || DEFAULT_VERSION_POLICY.minSupportedVersion,
    latestVersion: env.GEOPOLL_LATEST_VERSION || DEFAULT_VERSION_POLICY.latestVersion,
  };
  if (compareVersions(p.minSupportedVersion, p.latestVersion) > 0) throw new Error("minSupportedVersion must be <= latestVersion");
  return p;
}

/** Unparseable client versions are treated as force-update (fail closed). */
export function updateStatus(clientVersion: string | null | undefined, p: VersionPolicy): UpdateStatus {
  if (!clientVersion || !SEMVER.test(clientVersion.trim())) return "force-update";
  if (compareVersions(clientVersion, p.minSupportedVersion) < 0) return "force-update";
  if (compareVersions(clientVersion, p.latestVersion) < 0) return "update-available";
  return "ok";
}
