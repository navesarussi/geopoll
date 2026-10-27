# TestFlight checklist – GeoPoll iOS (apps/mobile)

> Working name **GeoPoll Beta**, bundle id **app.geopoll.beta** (override: `GEOPOLL_APP_NAME` / `GEOPOLL_BUNDLE_ID`, `app.config.ts`).
> Pipeline: `.github/workflows/mobile-eas.yml` (dispatch on main or push `ops/**`): eas init → iOS production build (free tier) → `eas submit` to TestFlight.
> Required secrets: `EXPO_TOKEN` ✅, `ASC_API_KEY_ID`, `ASC_API_ISSUER_ID`, `ASC_API_KEY_P8`, `APPLE_TEAM_ID`, `ASC_APP_ID`.

Status 2026-10-27: code ready in `apps/mobile` (CI: typecheck, tests, iOS bundle). **No EAS build has been run** – there is no `EXPO_TOKEN` for GeoPoll in the repo secrets, and KupaPay tokens are deliberately not reused.

## A. Nave must provide (owner-only)
1. **Expo robot token for GeoPoll** – expo.dev → account `saussilberg` → Access tokens → create a robot (e.g. `geopoll-ci`) → add as GitHub secret `EXPO_TOKEN` in `navesarussi/geopoll`. Free tier only (~30 builds/month); no paid plan.
2. **App Store Connect app record** – My Apps → + New App → iOS, name "GeoPoll" (see name risk below), primary language Hebrew, Bundle ID `app.geopoll.beta` (register it under Identifiers first), SKU `geopoll-ios`. Then send me the **Apple ID (ascAppId)** of the app and the **Team ID**.
3. **ASC API key** – Users and Access → Integrations → App Store Connect API → new key, role *App Manager*. Add as secrets `ASC_API_KEY_ID`, `ASC_API_ISSUER_ID`, `ASC_API_KEY_P8` (contents of the .p8). Never paste in chat.
4. **TestFlight internal testers** – add your Apple IDs as internal testers (no Beta App Review needed for internal).
5. Decide the store **name** (see C).

## B. I do after A (engineering, free tier)
- [ ] `eas init` → writes `extra.eas.projectId` (enables real push tokens).
- [ ] Fill `ascAppId` / `appleTeamId` in `apps/mobile/eas.json`.
- [ ] `eas build --profile development --platform ios` → verify on device: quick-crypto blind signature, Face ID, secure store, sign-in redirect, offline queue.
- [ ] `eas build --profile production --platform ios` → `eas submit --platform ios` → TestFlight.
- [ ] Set `GEOPOLL_MIN_SUPPORTED_VERSION` / `GEOPOLL_LATEST_VERSION` and `storeUrls.ios` in config once the listing exists.
- [ ] Workflow `mobile-release.yml` (workflow_dispatch, on main) using `EXPO_TOKEN` + ASC secrets.

## C. Before external TestFlight / App Review
- [ ] **Name/brand risk:** "GeoPoll" is already used by Mobile Accord (geopoll.com, Play app `com.mobileaccord.geopoll`). Lawyer question C5. May need a different store name.
- [ ] Real app icon + splash (current ones are Expo defaults).
- [ ] App Privacy labels matching `app.json` privacy manifest: User ID, Name, User Content – linked, app functionality, **no tracking**. KYC (T2) data is NOT collected by the app yet.
- [ ] Privacy policy URL (`/privacy` is a draft – lawyer B5).
- [ ] Demo account for App Review (Google sign-in) or a review-only demo login.
- [ ] Export compliance: `usesNonExemptEncryption=false` (standard crypto only) – confirm.
- [ ] Age rating; political content; moderation contact (lawyer B2/B3).
- [ ] 4.2 native value list for review notes: secure token wallet, biometric lock, offline queue, notifications.

## D. Android (later)
Play Console app `app.geopoll`, service account JSON as `PLAY_SERVICE_ACCOUNT_JSON`, internal track.

## E. Known TODOs after first TestFlight build (2026-10-27)
- **Push capability:** EAS could not enable Push Notifications on App ID `app.geopoll.beta` via the ASC API (capability patch rejected), so `apps/mobile/plugins/no-push.js` strips `aps-environment`. To enable push: developer.apple.com → Identifiers → app.geopoll.beta → enable *Push Notifications* → rerun the workflow with `GEOPOLL_IOS_PUSH=1` (and regenerate the profile), then delete the plugin.
- `EXPO_NO_CAPABILITY_SYNC=1` is set in `mobile-eas.yml` for the same reason.
- iOS credentials (distribution cert, AppStore profile) are EAS-managed; set up once via the expect step in `mobile-eas.yml`.
