# Bug learnings

Every bug that reaches a user gets an entry: symptom, root cause (marked **verified** or **suspected**), and the automated guard
added so the same class of bug is caught before release. Newest first. Agents: add an entry in the same PR as the fix.

| # | Date | Area | Symptom |
|---|------|------|---------|
| 1 | 2026-10-27 | mobile/iOS | TestFlight build 5 crashed on launch |

## 1. TestFlight build 5 crashes on launch (iOS)

- **Symptom:** GeoPoll Beta 0.1.0 (5) closed immediately on Nave's iPhone; crash dialog shown. No crash report was shared.
- **Root cause:** **suspected, not verified.** The JS module graph runs at launch and calls native code (`react-native-quick-crypto` `install()`, which
  depends on `react-native-nitro-modules`; `expo-notifications` after the push entitlement was stripped). A throw or missing native module
  there kills the app before any UI. Update this entry once the iOS smoke run or a crash log confirms it.
- **Mitigation:** PR #104: lazy `require("./App")` + ErrorBoundary + FatalScreen + guarded `install()`.
- **Guards added:**
  1. `apps/mobile/tests/module-graph.test.ts`: evaluates `App.tsx` and `index.ts` with native modules mocked (catches JS module-load throws).
  2. `.github/workflows/ios-smoke.yml`: Release build for the iOS Simulator, launch, 25s watch; fails on dead process, new crash report or
     error-boundary log. `Mobile EAS` iOS submit `needs` it.
  3. `Mobile EAS` runs only manually from `main` (no more ops/** builds).
  4. `iOS crash logs` workflow (manual) pulls TestFlight crash submissions via the ASC API.
- **Lesson:** never submit to TestFlight without a Release-config launch on a simulator.
