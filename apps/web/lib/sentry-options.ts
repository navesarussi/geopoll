/** Shared privacy-first Sentry options (ADR-0026). No-op when NEXT_PUBLIC_SENTRY_DSN is unset. */
import { scrubBreadcrumb, scrubEvent } from "./sentry-scrub";
export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,       // no IP, cookies, headers, user
  tracesSampleRate: 0,         // errors only
  maxBreadcrumbs: 30,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeSend: (e: any) => scrubEvent(e),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeBreadcrumb: (b: any) => scrubBreadcrumb(b),
};
