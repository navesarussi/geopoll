import { describe, expect, it } from "vitest";
import { DICTS, localAlias } from "@geopoll/i18n";

describe("#71 i18n", () => {
  it("en is complete and contains no Hebrew", () => {
    const he = Object.keys(DICTS.he), en = DICTS.en as Record<string, string>;
    for (const k of he) {
      expect(en[k], k).toBeTruthy();
      expect(/[\u0590-\u05FF]/.test(en[k]), k).toBe(false);
    }
  });
  it("re-renders server aliases in the UI locale", () => {
    expect(localAlias(DICTS.en, "אנונימי/ת 1234")).toBe("Anonymous 1234");
    expect(localAlias(DICTS.en, "משתמש/ת 5678")).toBe("User 5678");
    expect(localAlias(DICTS.en, "Dana")).toBe("Dana");
  });
});
