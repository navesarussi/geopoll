# Error reporting & privacy (Sentry)

See ADR-0026. Summary for reviewers and the privacy policy:

| Collected | Not collected |
|---|---|
| Exception type, scrubbed message, stack trace (file/line), app version/build, OS + device model, release/environment | IP address, user id/email/name, cookies, headers, request/response bodies, vote/choice/option, tokens, nullifiers, signatures, screenshots, session replay, performance traces, console logs, network breadcrumbs |

- Off unless a DSN is configured. Code: `apps/mobile/src/native/sentry.ts`, `apps/mobile/src/core/scrub.ts`, `apps/web/lib/sentry-*.ts`, `apps/web/instrumentation*.ts`.
- Scrubber copies must stay identical (mobile/web); tests in `apps/mobile/tests/scrub.test.ts`.
- Server-side settings to enable in Sentry (project → Security & Privacy): Data Scrubber on, Use Default Scrubbers on, Prevent Storing of IP Addresses on.
- Secrets: `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` (EAS env / GitHub), `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` (Vercel). A DSN is public-by-design but still kept out of the repo.
