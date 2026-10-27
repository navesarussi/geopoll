/** Lighthouse CI — ADVISORY (job is continue-on-error). Targets per ADR-0015 performance budget (assumption). */
module.exports = {
  ci: {
    collect: {
      url: ["http://127.0.0.1:3000/", "http://127.0.0.1:3000/?lang=en"],
      numberOfRuns: 1,
      settings: { preset: "desktop", onlyCategories: ["performance", "accessibility", "best-practices", "seo"] },
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.85 }],
        "categories:accessibility": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.9 }],
      },
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci" },
  },
};
