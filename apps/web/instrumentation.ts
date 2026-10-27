import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./lib/sentry-options";
export async function register() {
  if (sentryOptions.enabled) Sentry.init({ ...sentryOptions, integrations: (d) => d.filter((i) => i.name !== "RequestData") });
}
// Request bodies/headers are never attached: RequestData integration removed + beforeSend deletes event.request.
export const onRequestError = Sentry.captureRequestError;
