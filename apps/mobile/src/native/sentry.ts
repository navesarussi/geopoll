/** Crash/error reporting (ADR-0026). No-op unless EXPO_PUBLIC_SENTRY_DSN is set at build time. Privacy-first config. */
import * as Sentry from "@sentry/react-native";
import { scrubBreadcrumb, scrubEvent } from "../core/scrub";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
export const sentryEnabled = !!dsn;
try {
  if (dsn) Sentry.init({
    dsn,
    sendDefaultPii: false,          // no IP, no user
    tracesSampleRate: 0,            // errors/crashes only, no performance tracing
    attachScreenshot: false,        // screens may show a ballot
    attachViewHierarchy: false,
    enableCaptureFailedRequests: false,
    maxBreadcrumbs: 30,
    beforeSend: (e) => scrubEvent(e),
    beforeBreadcrumb: (b) => scrubBreadcrumb(b),
  });
} catch (e) { console.warn("sentry init failed", e); }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const wrap = (C: React.ComponentType<any>) => (dsn ? Sentry.wrap(C) : C);
export const report = (e: unknown) => { if (dsn) Sentry.captureException(e); };
