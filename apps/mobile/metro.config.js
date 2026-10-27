// Monorepo: let Metro see packages/* (dependency-free TS sources, ADR-0022). Aliases mirror tsconfig paths.
// getSentryExpoConfig = Expo defaults + Debug IDs so uploaded source maps match bundles (readable stacks).
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const config = getSentryExpoConfig(__dirname);
config.watchFolders = [path.join(root, "packages")];
config.resolver.nodeModulesPaths = [path.join(__dirname, "node_modules")];
config.resolver.extraNodeModules = {
  "@geopoll/config": path.join(root, "packages/config/src"),
  "@geopoll/design-tokens": path.join(root, "packages/design-tokens/src"),
  "@geopoll/i18n": path.join(root, "packages/i18n/src"),
};
module.exports = config;
