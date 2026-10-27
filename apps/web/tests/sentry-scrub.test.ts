import { describe, expect, it } from "vitest";
import { scrubBreadcrumb, scrubEvent } from "../lib/sentry-scrub";

describe("sentry scrubber (secret ballot)", () => {
  it("removes user, request, ip and ballot data", () => {
    const e = scrubEvent({
      user: { id: "u1", ip_address: "1.2.3.4" }, request: { data: { choice: "likud" } }, server_name: "x",
      extra: { pollId: "p1", choice: "A", nullifier: "abc", token: { sig: "s" }, nested: { voteOption: 2 } },
      message: "failed with eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.sig",
      exception: { values: [{ value: "bad token AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", stacktrace: { frames: [{ vars: { choice: "A" } }] } }] },
      breadcrumbs: [{ category: "console", message: "choice=A" }, { category: "fetch", data: { url: "/api/vote" } }, { category: "navigation", data: { to: "polls" } }],
    });
    expect(e.user).toBeUndefined(); expect(e.request).toBeUndefined(); expect(e.server_name).toBeUndefined();
    expect(e.extra).toEqual({ pollId: "p1", choice: "[scrubbed]", nullifier: "[scrubbed]", token: "[scrubbed]", nested: { voteOption: "[scrubbed]" } });
    expect(JSON.stringify(e)).not.toMatch(/likud|1\.2\.3\.4|AAAAAAAAAAAAAAAAAAAAAAAA|eyJhbGci/);
    expect(e.exception.values[0].stacktrace.frames[0].vars).toBeUndefined();
    expect(e.breadcrumbs).toEqual([{ category: "navigation", data: { to: "polls" } }]);
  });
  it("drops http breadcrumbs", () => { expect(scrubBreadcrumb({ type: "http", data: { body: "x" } })).toBeNull(); });
});

describe("sentry options (web)", () => {
  it("is privacy-first and off without DSN", async () => {
    const { sentryOptions: o } = await import("../lib/sentry-options");
    expect(o.sendDefaultPii).toBe(false); expect(o.tracesSampleRate).toBe(0);
    expect(o.enabled).toBe(!!process.env.NEXT_PUBLIC_SENTRY_DSN);
    expect(o.beforeSend({ user: { id: 1 }, extra: { nullifier: "n" } })).toEqual({ extra: { nullifier: "[scrubbed]" } });
    expect(o.beforeBreadcrumb({ category: "console" })).toBeNull();
    expect(o.beforeBreadcrumb(null)).toBeNull();
  });
  it("keeps primitives and deep structures bounded", async () => {
    const { scrubValue } = await import("../lib/sentry-scrub");
    expect(scrubValue(5)).toBe(5); expect(scrubValue(null)).toBeNull();
    expect(scrubValue([{ token: "x" }, "ok"])).toEqual([{ token: "[scrubbed]" }, "ok"]);
    let deep: Record<string, unknown> = { v: 1 }; for (let i = 0; i < 10; i++) deep = { d: deep };
    expect(scrubValue(deep)).toBeTruthy();
    expect(scrubEvent({ message: "m", tags: { a: "b" }, contexts: { state: {}, os: { version: "18" } }, exception: { values: [{}] } }))
      .toEqual({ message: "m", tags: { a: "b" }, contexts: { os: { version: "18" } }, exception: { values: [{}] } });
  });
});
