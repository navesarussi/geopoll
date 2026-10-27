import type { GlobalConfig } from "./schema";
/** Global defaults (country-agnostic). Country files override. */
export const base: GlobalConfig = {
  jurisdiction: {
    code: "ZZ", timeZone: "UTC", defaultLocale: "en", locales: ["en"],
    eligibility: { votingAge: 18, teenTrackMinAge: 13 },
    thresholds: { kNational: 50, kSmallLocality: 100, smallLocalityPopulation: 10000 },
    publication: { batchIntervalSeconds: 3600, snapshotIntervalSeconds: 86400, roundingPercent: 1, buckets: [100000, 10000, 1000, 500, 100, 50] },
    epoch: "calendar-month-utc",
    blackout: { appliesTo: [], startRule: "end-of-friday-before", endsAtLocal: "22:00", freezeVoting: false },
    elections: [],
  },
  features: { inclusionCheck: true, publicPositions: true, govIdTier: false, demoLogin: false, publicIdentityDefault: "profile", teenDefaultAnonymous: true },
  services: { relayUrl: "/api/relay" },
  polls: [],
};
