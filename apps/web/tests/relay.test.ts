import { describe, it, expect } from "vitest";
import { relay, viaRelay, RELAY_HEADER, MAX_BODY } from "@/lib/relay";

function capture() {
  const calls: { url: string; init: RequestInit }[] = [];
  const f = (async (url: URL, init: RequestInit) => { calls.push({ url: String(url), init }); return new Response('{"ok":true}', { status: 200 }); }) as unknown as typeof fetch;
  return { calls, f };
}

describe("relay (T-110)", () => {
  it("forwards only body + content-type (+ relay secret) to the allow-listed path", async () => {
    const { calls, f } = capture();
    const r = await relay("vote", { method: "POST", body: '{"a":1}' }, { upstream: "http://vote.internal", secret: "s", fetchImpl: f });
    expect(r.status).toBe(200);
    expect(calls[0].url).toBe("http://vote.internal/api/vote");
    expect(calls[0].init.headers).toEqual({ "content-type": "application/json", [RELAY_HEADER]: "s" });
    expect(calls[0].init.body).toBe('{"a":1}');
  });
  it("rejects unknown paths, non-POST, oversized and non-JSON bodies without forwarding", async () => {
    const { calls, f } = capture();
    const o = { upstream: "http://vote.internal", fetchImpl: f };
    expect((await relay("../admin", { method: "POST", body: "{}" }, o)).status).toBe(404);
    expect((await relay("vote", { method: "GET", body: "{}" }, o)).status).toBe(405);
    expect((await relay("vote", { method: "POST", body: "x".repeat(MAX_BODY + 1) }, o)).status).toBe(413);
    expect((await relay("vote", { method: "POST", body: "not json" }, o)).status).toBe(400);
    expect(calls).toHaveLength(0);
  });
  it("upstream failure → 502 without leaking details", async () => {
    const f = (async () => { throw new Error("ECONNREFUSED 10.0.0.1"); }) as unknown as typeof fetch;
    const r = await relay("vote", { method: "POST", body: "{}" }, { upstream: "http://x", fetchImpl: f });
    expect(r).toEqual({ status: 502, body: '{"ok":false,"error":"upstream"}' });
  });
  it("vote API enforces relay-only when RELAY_ONLY=1", () => {
    const env = { RELAY_ONLY: "1", RELAY_SECRET: "topsecret" } as unknown as NodeJS.ProcessEnv;
    expect(viaRelay(new Request("http://x"), env)).toBe(false);
    expect(viaRelay(new Request("http://x", { headers: { [RELAY_HEADER]: "wrong-val" } }), env)).toBe(false);
    expect(viaRelay(new Request("http://x", { headers: { [RELAY_HEADER]: "topsecret" } }), env)).toBe(true);
    expect(viaRelay(new Request("http://x"), {} as NodeJS.ProcessEnv)).toBe(true);
  });
});
