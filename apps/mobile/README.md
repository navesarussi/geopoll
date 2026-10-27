# apps/mobile – GeoPoll native app (Expo SDK 58, React Native, TypeScript)

ADR-0025 (accepted). Trust zone: **client**. Consumes `packages/config`, `packages/design-tokens`, `packages/i18n` (he default/RTL, en).

## What it does (MVP for TestFlight)
| Feature | Where | Native value (Apple 4.2) |
| --- | --- | --- |
| Ballot-token wallet (RFC 9474 blind RSA, same protocol as web) | `src/core/token.ts` | Token kept in iOS Keychain / Android Keystore via `expo-secure-store` (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`, no backup) |
| Biometric lock (Face ID / fingerprint), re-locks on background | `src/native/platform.ts`, `App.tsx` | `expo-local-authentication` |
| Offline vote queue (encrypted at rest, last choice per poll, auto-flush on reconnect) | `src/core/vote.ts` | NetInfo + secure storage |
| Push-ready (permission + Expo push token on explicit opt-in only; not sent to a server yet) | `enablePush()` | `expo-notifications` |
| Google sign-in via the existing web backend (system auth session + PKCE-style handoff) | `signIn()`, `apps/web/lib/mobile-auth.ts` | `ASWebAuthenticationSession` |
| Secret ballot → relay with **no** auth/cookies; clear success / revote / queued / error messages | `castOrQueue()` | – |
| "Was my vote counted?" via device-side nullifier (never shows the choice) | `deviceNullifier()` | – |
| Results (k-threshold, rounded), public positions with profile / anonymous toggle + consent | `App.tsx` | – |
| Force update via `GET /api/version` (fails open offline) | `src/core/version.ts` | – |

No ads, no analytics/tracking SDKs, AD_ID permission blocked, `NSPrivacyTracking=false`.

## Run
```bash
cd apps/web && npm ci        # tests use the real web issuer
cd ../mobile && npm ci
npm run typecheck && npm test
npx expo export --platform ios   # bundle check (what CI runs)
```
Native modules (`react-native-quick-crypto`, secure store) need a **dev build**, not Expo Go:
`eas build --profile development` (needs `EXPO_TOKEN`) or `npx expo run:ios` on a Mac.

## Known limits (honest)
- `react-native-quick-crypto` provides WebCrypto (RSA-PSS verify, SHA-256) for blindrsa-ts. Tested in Node only; **must be verified on a real device** in the first dev build.
- The custom-scheme redirect `geopoll://auth` could be observed by another app on Android; the handoff code is useless without the in-memory verifier. Universal/App Links are a later hardening step.
- Vote ingest goes through the same-operator beta relay (see ADR / relay.ts limits) until OHTTP.
