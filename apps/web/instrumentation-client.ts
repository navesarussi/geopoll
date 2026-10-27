import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./lib/sentry-options";
// No Session Replay, no feedback widget, no tracing.
if (sentryOptions.enabled) Sentry.init({ ...sentryOptions, replaysSessionSampleRate: 0, replaysOnErrorSampleRate: 0 });
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
