import { describe, expect, it } from "vitest";
import { DICTS } from "@geopoll/i18n";
import { checkVersion } from "../src/core/version";
import { codeFromRedirect, makePkce } from "../src/core/pkce";
import { makeHttp, SESSION_KEY } from "../src/core/http";
import { fakeHttp, memKV } from "./helpers";
import appJson from "../app.json";

describe("force update", () => {
  const v = (min: string, latest: string) => fakeHttp(() => ({ status: 200, json: { minSupportedVersion: min, latestVersion: latest, storeUrl: "https://x" } }));
  it("classifies", async () => {
    expect((await checkVersion(v("1.0.0", "1.0.0"), "1.0.0", "ios")).status).toBe("ok");
    expect((await checkVersion(v("0.9.0", "1.1.0"), "1.0.0", "ios")).status).toBe("update-available");
    expect((await checkVersion(v("1.2.0", "1.2.0"), "1.0.0", "ios"))).toEqual({ status: "force-update", storeUrl: "https://x" });
  });
  it("fails open offline", async () => {
    expect((await checkVersion(fakeHttp(() => { throw new TypeError("offline"); }), "1.0.0", "android")).status).toBe("ok");
  });
});

describe("sign-in handoff", () => {
  it("makes a 43-char base64url challenge and parses the redirect", async () => {
    const { verifier, challenge } = await makePkce();
    expect(challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(codeFromRedirect("geopoll://auth?code=a.b%2Bc")).toBe("a.b+c");
    expect(codeFromRedirect("evil://auth?code=x")).toBeNull();
  });
});

describe("http port isolation", () => {
  it("adds bearer only for auth:true and never sends cookies", async () => {
    const kv = memKV(); await kv.set(SESSION_KEY, "tok");
    const seen: RequestInit[] = [];
    const http = makeHttp("https://h", kv, (async (_u: string, i: RequestInit) => { seen.push(i); return new Response("{}"); }) as typeof fetch);
    await http("/api/identity/tier", { auth: true });
    await http("/api/relay/vote", { method: "POST", body: {}, auth: false });
    expect((seen[0].headers as Record<string, string>).authorization).toBe("Bearer tok");
    expect((seen[1].headers as Record<string, string>).authorization).toBeUndefined();
    expect(seen.every((i) => i.credentials === "omit")).toBe(true);
  });
});

describe("app config + i18n", () => {
  it("mobile strings exist in he and en; he is default", () => {
    expect(DICTS.he.m_unlock).toBeTruthy();
    expect(DICTS.en.m_unlock).not.toBe(DICTS.he.m_unlock);
  });
  it("app.json: bundle ids, no tracking, RTL", () => {
    const e = appJson.expo;
    expect(e.ios.bundleIdentifier).toBe("app.geopoll");
    expect(e.android.package).toBe("app.geopoll");
    expect(e.ios.privacyManifests.NSPrivacyTracking).toBe(false);
    expect(e.extra.supportsRTL).toBe(true);
    expect(JSON.stringify(appJson)).not.toMatch(/admob|google-mobile-ads|posthog|sentry|facebook|ATTrackingManager/i);
  });
});
