import { describe, expect, it } from "vitest";
import { scrubBreadcrumb, scrubEvent } from "../src/core/scrub";

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
