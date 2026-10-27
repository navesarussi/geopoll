import { describe, expect, it } from "vitest";
import { compareVersions, loadVersionPolicy, updateStatus } from "@geopoll/config";
import { GET } from "@/app/api/version/route";

describe("force-update / minSupportedVersion", () => {
  const p = loadVersionPolicy({ GEOPOLL_MIN_SUPPORTED_VERSION: "1.2.0", GEOPOLL_LATEST_VERSION: "1.4.1" });
  it("compares semver numerically", () => {
    expect(compareVersions("1.10.0", "1.9.9")).toBe(1);
    expect(compareVersions("2.0.0", "2.0.0")).toBe(0);
  });
  it("classifies client versions", () => {
    expect(updateStatus("1.1.9", p)).toBe("force-update");
    expect(updateStatus("1.2.0", p)).toBe("update-available");
    expect(updateStatus("1.4.1", p)).toBe("ok");
    expect(updateStatus("garbage", p)).toBe("force-update");
    expect(updateStatus(undefined, p)).toBe("force-update");
  });
  it("rejects min > latest and bad versions", () => {
    expect(() => loadVersionPolicy({ GEOPOLL_MIN_SUPPORTED_VERSION: "2.0.0", GEOPOLL_LATEST_VERSION: "1.0.0" })).toThrow();
    expect(() => loadVersionPolicy({ GEOPOLL_MIN_SUPPORTED_VERSION: "x" })).toThrow();
  });
  it("defaults allow everything until a native app ships", () => {
    expect(updateStatus("0.0.1", loadVersionPolicy({}))).toBe("ok");
  });
  it("GET /api/version returns policy and status", async () => {
    process.env.GEOPOLL_MIN_SUPPORTED_VERSION = "1.0.0"; process.env.GEOPOLL_LATEST_VERSION = "1.0.0";
    const r = await GET(new Request("http://x/api/version?v=0.9.0&platform=ios"));
    expect(await r.json()).toMatchObject({ minSupportedVersion: "1.0.0", status: "force-update", storeUrl: null });
    delete process.env.GEOPOLL_MIN_SUPPORTED_VERSION; delete process.env.GEOPOLL_LATEST_VERSION;
  });
});
