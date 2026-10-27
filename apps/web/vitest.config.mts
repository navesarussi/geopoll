import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: { alias: {
    "@geopoll/config": path.resolve(__dirname, "../../packages/config/src/index.ts"),
    "@geopoll/design-tokens": path.resolve(__dirname, "../../packages/design-tokens/src/index.ts"),
    "@geopoll/i18n": path.resolve(__dirname, "../../packages/i18n/src/index.ts"),
    "@": path.resolve(__dirname),
  } },
  test: {
    testTimeout: 30000,
    coverage: { provider: "v8", reporter: ["text-summary", "json-summary"], include: ["lib/**", "db/**", "../../packages/config/src/**", "../../packages/i18n/src/**"] },
  },
});
