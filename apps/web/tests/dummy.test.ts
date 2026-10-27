import { describe, it, expect } from "vitest";
import { generate, prng } from "@/lib/dummy/generator";
import { runScenario } from "@/lib/dummy/run";
import { OPTION_IDS, DEMO_POLL } from "@/lib/poll";
import { freshStores } from "./helpers";

describe("dummy data generator (T-111)", () => {
  it("is deterministic per seed and marks accounts as dummy", () => {
    const a = generate({ seed: 7, users: 50, options: OPTION_IDS }), b = generate({ seed: 7, users: 50, options: OPTION_IDS });
    expect(a).toEqual(b);
    expect(a.users.every((u) => u.accountId.startsWith("dummy:"))).toBe(true);
    expect(generate({ seed: 8, users: 50, options: OPTION_IDS })).not.toEqual(a);
    expect(prng(1)()).toBeGreaterThanOrEqual(0);
  });
  it("covers edge cases and the real protocol counts exactly the last choice per user", async () => {
    const s = await freshStores();
    const sc = generate({ seed: 3, users: 120, options: OPTION_IDS, revoteRate: 0.3, doubleIssueRate: 0.2, forged: 4, wrongEpoch: 3 });
    const kinds = new Set(sc.actions.map((a) => a.kind));
    expect([...kinds].sort()).toEqual(["double_issue", "forged_token", "revote", "vote", "wrong_epoch"]);
    const st = await runScenario(s, sc);
    expect(st.rejected.bad_token).toBe(4);
    expect(st.rejected.wrong_epoch).toBe(3);
    expect(st.rejected.already_issued).toBeGreaterThan(0);
    await s.ballots.flush();
    expect(await s.ballots.tally(DEMO_POLL.id)).toEqual(st.expectedCounted);
  }, 120000);
});
