import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
import { nullifier } from "@/lib/crypto";
import { deviceNullifier } from "@/lib/nullifier-client";
import { freshStores } from "./helpers";

describe("device-side inclusion check (T-207)", () => {
  it("device nullifier equals server nullifier", async () => {
    (globalThis as { crypto?: unknown }).crypto ??= webcrypto;
    const msg = webcrypto.getRandomValues(new Uint8Array(140));
    expect(await deviceNullifier("poll-x", msg)).toBe(nullifier(msg, "poll-x"));
  });
  it("reports queued → counted, and never the option", async () => {
    const { ballots } = await freshStores();
    const n = "a".repeat(64);
    expect(await ballots.status(n)).toBe("not_found");
    await ballots.enqueue("p", n, "yes", "2026-10");
    expect(await ballots.status(n)).toBe("queued");
    await ballots.flush();
    const st = await ballots.status(n);
    expect(st).toBe("counted");
    expect(JSON.stringify(st)).not.toContain("yes");
  });
});
