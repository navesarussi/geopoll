#!/usr/bin/env bash
# Vercel "Ignored Build Step" (apps/web root): exit 0 = SKIP, exit 1 = BUILD.
# Saves Hobby-plan deploy quota. Pattern from KupaPay, adapted for GeoPoll.
# Vercel setting: Project → Git → Ignored Build Step → `bash scripts/vercel-should-build.sh`
set -uo pipefail
REF="${VERCEL_GIT_COMMIT_REF:-}"
MSG="${VERCEL_GIT_COMMIT_MESSAGE:-}"
if echo "$MSG" | grep -qiE '\[(skip ci|ci skip|skip deploy)\]'; then echo "skip: [skip] in commit message"; exit 0; fi
# Hobby quota: only production (main) builds. Previews opt-in via GEOPOLL_PREVIEW_BUILDS=1 env in Vercel.
if [[ "$REF" != "main" && "${GEOPOLL_PREVIEW_BUILDS:-0}" != "1" ]]; then echo "skip: ref=${REF:-unknown} is not main"; exit 0; fi
PREV="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [[ -z "$PREV" ]] || ! git cat-file -e "$PREV" 2>/dev/null; then echo "build: no previous SHA to diff"; exit 1; fi
ROOT="$(git rev-parse --show-toplevel)"
CHANGED="$(git -C "$ROOT" diff --name-only "$PREV" HEAD -- apps/web packages/config packages/design-tokens packages/i18n packages/shared-types packages/crypto)"
if [[ -z "$CHANGED" ]]; then echo "skip: no app-relevant changes since $PREV"; exit 0; fi
echo "build: changes:"; echo "$CHANGED" | head -20; exit 1
