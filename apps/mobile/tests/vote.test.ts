import { describe, expect, it } from "vitest";
import { castOrQueue, CHOICE_KEY, flushQueue, readQueue } from "../src/core/vote";
import { fakeHttp, memKV } from "./helpers";

const tok = { epoch: "2026-10", tier: "T0", preparedMsg: "AAA=", signature: "BBB=" };
let online = true;
const relay = (answer: { ok: boolean; status?: string; error?: string } = { ok: true, status: "created" }) => fakeHttp(async () => {
  if (!online) throw new TypeError("Network request failed");
  return { status: answer.ok ? 200 : 400, json: answer };
});

describe("secret ballot + offline queue", () => {
  it("sends without auth to the relay and confirms", async () => {
    online = true;
    const kv = memKV(), http = relay();
    expect(await castOrQueue(kv, http, "/api/relay", "p1", "yes", tok, true)).toEqual({ kind: "created" });
    expect(http.calls[0]).toMatchObject({ path: "/api/relay/vote", auth: false });
    expect(JSON.stringify(http.calls[0].body)).not.toMatch(/acct|email|session/);
    expect(await kv.get(CHOICE_KEY("p1"))).toBe("yes");
  });
  it("reports replaced on revote", async () => {
    online = true;
    expect(await castOrQueue(memKV(), relay({ ok: true, status: "replaced" }), "/api/relay", "p1", "no", tok, true)).toEqual({ kind: "replaced" });
  });
  it("surfaces definitive errors and flags token drop", async () => {
    online = true;
    expect(await castOrQueue(memKV(), relay({ ok: false, error: "wrong_epoch" }), "/api/relay", "p1", "no", tok, true)).toEqual({ kind: "error", code: "wrong_epoch", dropToken: true });
    expect(await castOrQueue(memKV(), relay({ ok: false, error: "blackout" }), "/api/relay", "p1", "no", tok, true)).toMatchObject({ code: "blackout", dropToken: false });
  });
  it("queues offline (explicitly or on network error), keeps only the last choice per poll, flushes later", async () => {
    const kv = memKV(), http = relay();
    online = false;
    expect(await castOrQueue(kv, http, "/api/relay", "p1", "yes", tok, false)).toEqual({ kind: "queued" });
    expect(await castOrQueue(kv, http, "/api/relay", "p1", "no", tok, true)).toEqual({ kind: "queued" }); // network error
    expect(await castOrQueue(kv, http, "/api/relay", "p2", "a", tok, false)).toEqual({ kind: "queued" });
    expect((await readQueue(kv)).map((b) => `${b.pollId}:${b.option}`)).toEqual(["p1:no", "p2:a"]);
    expect(await flushQueue(kv, http, "/api/relay")).toEqual({ sent: 0, failed: [], remaining: 2 });
    online = true;
    expect(await flushQueue(kv, http, "/api/relay")).toEqual({ sent: 2, failed: [], remaining: 0 });
    expect(await readQueue(kv)).toEqual([]);
  });
  it("drops queued ballots the server definitively rejects", async () => {
    online = false; const kv = memKV();
    await castOrQueue(kv, relay(), "/api/relay", "p1", "yes", tok, false);
    online = true;
    expect(await flushQueue(kv, relay({ ok: false, error: "closed" }), "/api/relay")).toEqual({ sent: 0, failed: [{ pollId: "p1", code: "closed" }], remaining: 0 });
  });
});
