#!/usr/bin/env bash
# Usage: gate-verify.sh name result [name result ...]. Fails unless every result is success/skipped.
set -euo pipefail
failed=0
while [[ $# -ge 2 ]]; do
  if [[ "$2" == "success" || "$2" == "skipped" ]]; then echo "  ✓ $1 ($2)"; else echo "::error::Required check failed: $1 ($2)"; failed=1; fi
  shift 2
done
[[ $failed -eq 0 ]] && echo "✅ CI gate passed" || exit 1
