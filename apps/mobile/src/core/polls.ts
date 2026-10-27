import type { PollDef } from "@geopoll/config";
import type { Http } from "./types";

export type LivePoll = PollDef & { status: "open" | "closed" | "scheduled"; blackout: boolean };

const valid = (p: unknown): p is LivePoll => {
  const x = p as LivePoll;
  return !!x && typeof x.id === "string" && typeof x.question?.he === "string" && Array.isArray(x.options) && x.options.length >= 2
    && x.options.every((o) => typeof o?.id === "string" && typeof o?.label?.he === "string")
    && ["open", "closed", "scheduled"].includes(x.status);
};

/** GET /api/polls (definitions + effective status + §16ה flag). Fails SOFT to the compiled-in config polls (status unknown → open). */
export async function fetchPolls(http: Http, fallback: PollDef[]): Promise<{ polls: LivePoll[]; live: boolean }> {
  try {
    const r = await http("/api/polls");
    const list = (r.json as { polls?: unknown[] } | null)?.polls;
    if (r.status === 200 && Array.isArray(list)) {
      const ok = list.filter(valid);
      if (ok.length) return { polls: ok, live: true };
    }
  } catch { /* offline */ }
  return { polls: fallback.map((p) => ({ ...p, status: "open", blackout: false })), live: false };
}

/** Which results view to show. Regression (bug-learnings 2026-10-27): during §16ה the API returns published:false+blackout:true,
 *  and the app used to show "results once there are k participants" — misleading. Blackout must win. */
export const resultsState = (res: { published: boolean; blackout?: boolean } | null) =>
  !res ? "loading" : res.blackout ? "blackout" : !res.published ? "belowK" : "published";
