#!/usr/bin/env bash
# Shinon gate check: ensures CHANGELOG.md has been modified (staged or unstaged)
# Exits 0 if changed, 1 if unchanged.

set -euo pipefail

if git diff --exit-code HEAD -- CHANGELOG.md; then
  echo "❌ CHANGELOG.md has not been modified. Please add an entry before committing."
  exit 1
else
  echo "✅ CHANGELOG.md modified."
  exit 0
fi