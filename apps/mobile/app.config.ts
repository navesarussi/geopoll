import type { ExpoConfig, ConfigContext } from "expo/config";
/**
 * Brand/bundle id are NOT final (name pending, lawyer C5). Override per build via env:
 * GEOPOLL_APP_NAME, GEOPOLL_BUNDLE_ID (iOS bundle id + Android package). Defaults: "GeoPoll", app.geopoll.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const id = process.env.GEOPOLL_BUNDLE_ID || "app.geopoll";
  return {
    ...(config as ExpoConfig),
    name: process.env.GEOPOLL_APP_NAME || config.name || "GeoPoll",
    ios: { ...config.ios, bundleIdentifier: id },
    android: { ...config.android, package: id },
  };
};
