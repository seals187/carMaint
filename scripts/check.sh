#!/bin/sh
# Runs all checks (syntax, unit tests, UI text and frontend rules): node --test.
# Uses Node 22+ if installed, otherwise node:22-alpine in Docker. Extra arguments go to node --test.
set -e
cd "$(dirname "$0")/.."
major=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
if [ "$major" -ge 22 ]; then
  exec node --test "$@"
fi
# Git Bash on Windows: Docker needs a Windows path and no MSYS path conversion
dir=$(pwd -W 2>/dev/null || pwd)
MSYS_NO_PATHCONV=1 exec docker run --rm -v "$dir":/app -w /app node:22-alpine node --test "$@"
