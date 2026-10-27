// Brand/bundle id are NOT final (name pending, lawyer C5). Override per build via env:
// GEOPOLL_APP_NAME, GEOPOLL_BUNDLE_ID (iOS bundle id + Android package). Defaults: "GeoPoll Beta", app.geopoll.beta (working name).
// Plain JS (not TS): eas-cli reads this file without transpiling.
module.exports = ({ config }) => {
  const id = process.env.GEOPOLL_BUNDLE_ID || "app.geopoll.beta";
  return {
    ...config,
    plugins: [...(config.plugins || []), "./plugins/no-push"],
    name: process.env.GEOPOLL_APP_NAME || "GeoPoll Beta",
    ios: { ...config.ios, bundleIdentifier: id },
    android: { ...config.android, package: id },
  };
};
