// Brand/bundle id are NOT final (name pending, lawyer C5). Override per build via env:
// GEOPOLL_APP_NAME, GEOPOLL_BUNDLE_ID (iOS bundle id + Android package). Defaults: "GeoPoll Beta", app.geopoll.beta (working name).
// Plain JS (not TS): eas-cli reads this file without transpiling.
module.exports = ({ config }) => {
  const id = process.env.GEOPOLL_BUNDLE_ID || "app.geopoll.beta";
  return {
    ...config,
    plugins: [
      ...(config.plugins || []),
      "./plugins/no-push",
      // Sentry (ADR-0026). Native SDK starts in AppDelegate before JS (useNativeInit) so launch/native crashes are captured.
      // dSYM + source-map upload only when SENTRY_AUTH_TOKEN is set (EAS env secret); otherwise uploads are disabled.
      ["@sentry/react-native/expo", {
        organization: process.env.SENTRY_ORG || "kupay-hb",
        project: process.env.SENTRY_PROJECT || "geopoll-mobile",
        url: process.env.SENTRY_URL || "https://de.sentry.io/",
        useNativeInit: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
        disableAutoUpload: !process.env.SENTRY_AUTH_TOKEN,
        options: process.env.EXPO_PUBLIC_SENTRY_DSN ? {
          dsn: process.env.EXPO_PUBLIC_SENTRY_DSN, sendDefaultPii: false, attachScreenshot: false, attachViewHierarchy: false,
          tracesSampleRate: 0, maxBreadcrumbs: 30,
        } : undefined,
      }],
    ],
    name: process.env.GEOPOLL_APP_NAME || "GeoPoll Beta",
    ios: { ...config.ios, bundleIdentifier: id },
    android: { ...config.android, package: id },
  };
};
