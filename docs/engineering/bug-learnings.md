# Bug learnings

Every bug that reaches a user gets an entry: symptom, root cause (marked **verified** or **suspected**), and the automated guard
added so the same class of bug is caught before release. Newest first. Agents: add an entry in the same PR as the fix.

| # | Date | Area | Symptom |
|---|------|------|---------|
| 2 | 2026-10-27 | mobile/iOS | Release simulator stuck on launch spinner |
| 1 | 2026-10-27 | mobile/iOS | TestFlight build 5 crashed on launch |

## 2. Launch spinner never ends (iOS Release simulator)

- **Symptom:** after the #1 fix the smoke screenshot showed only the loading spinner after 25s.
- **Root cause:** **suspected**: App waited on `checkVersion` (no timeout) and on `secureKV.get` with no catch; any throw/hang there
  (e.g. Keychain unavailable in an unsigned simulator build, or a stalled network) kept the spinner forever.
- **Fix:** 6s fail-open timeout on the version check; secure-store errors default to unlocked; startup errors logged.
- **Guard:** Maestro flow `apps/mobile/.maestro/launch.yaml` in the iOS smoke job must reach the tab bar (`testID=tab-polls`) and tap a tab.

## 1. TestFlight build 5 crashes on launch (iOS)

- **Symptom:** GeoPoll Beta 0.1.0 (5) closed immediately on Nave's iPhone; crash dialog shown. No crash report was shared.
- **Root cause:** **verified** by the new iOS smoke test (Release simulator build, crash report `.ips`): dyld aborted at launch,
  before any JS ran: `Symbol not found: ExpoModulesCore.EventEmitter.eventRuntime(for:)`, referenced from `ExpoFileSystem.framework`.
  The lockfile had `expo@58.0.19` → `expo-modules-core@58.0.26`, but `expo-file-system@58.0.12` needs an API added in
  `expo-modules-core@58.0.27`. `npx expo install --check` already flagged `expo` (~58.0.20) and `expo-dev-client` (~58.0.16) as outdated.
  So the JS error boundary from #104 could never help: it was a native link error. **Fix:** upgrade to expo 58.0.20 / expo-dev-client 58.0.16.
- **Mitigation:** PR #104: lazy `require("./App")` + ErrorBoundary + FatalScreen + guarded `install()`.
- **Guards added:**
  1. `apps/mobile/tests/module-graph.test.ts`: evaluates `App.tsx` and `index.ts` with native modules mocked (catches JS module-load throws).
  2. `.github/workflows/ios-smoke.yml`: Release build for the iOS Simulator, launch, 25s watch; fails on dead process, new crash report or
     error-boundary log. `Mobile EAS` iOS submit `needs` it.
  3. `npx expo install --check` + `scripts/ci/expo-native-deps.mjs` (single expo-modules-core, all expo-* ranges satisfied, SDK-expected
     versions, `expo` on the newest SDK patch; verified to fail on the build-5 lockfile) in CI and the smoke job: fails when native packages drift from the SDK's expected versions.
  4. `Mobile EAS` runs only manually from `main` (no more ops/** builds).
  5. `iOS crash logs` workflow (manual) pulls TestFlight crash submissions via the ASC API.
- **Lesson:** JS tests cannot catch native link errors. Never submit to TestFlight without a Release-config simulator launch,
  and keep Expo packages exactly on the SDK's expected versions (`expo install --check`).
