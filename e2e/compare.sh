#!/bin/sh
# Before/after check for changes that touch behaviour: builds two versions, runs the browser
# walk-through (ui.js) and the API status check (api.mjs) against each, and diffs the output.
# Every difference should be one you meant; "ERRORS: none" means no page or console errors.
#
#   e2e/compare.sh [BASE_REF] [NEW_REF]    default: main against the working tree
#
# Output and screenshots: $E2E_OUT (default: a new temp folder, printed at the end).
# Needs Docker only. Containers run on their own network and are removed afterwards.
set -eu
cd "$(dirname "$0")/.."
BASE_REF=${1:-main}
NEW_REF=${2:-}
OUT=${E2E_OUT:-$(mktemp -d)}
NET=carmaint-e2e
ENV="-e ADMIN_USERNAME=admin -e ADMIN_PASSWORD=test1234 -e DEMO_USERNAME=demo -e DEMO_PASSWORD=demodemo -e DEMO_DISABLED=password,backup,notify"
export MSYS_NO_PATHCONV=1 # Git Bash on Windows
winpath() { (cd "$1" && (pwd -W 2>/dev/null || pwd)); }

build() { # tag, ref (empty: working tree)
  if [ -n "$2" ]; then git archive "$2" | docker build -q -t "$1" - >/dev/null
  else docker build -q -t "$1" . >/dev/null; fi
}

run() { # name
  docker rm -f "cm-e2e-$1" >/dev/null 2>&1 || true
  docker run -d --name "cm-e2e-$1" --network $NET $ENV "carmaint:e2e-$1" >/dev/null
  url="http://cm-e2e-$1:8090"
  docker run --rm --network $NET node:22-alpine sh -c "until wget -qO- $url/api/health >/dev/null 2>&1; do sleep 1; done"
  mkdir -p "$OUT/$1" && chmod 777 "$OUT/$1" # the browser runs as another user
  docker run --rm --network $NET -e BASE="$url" -e OUT=/out $ENV \
    -v "$(winpath e2e)":/e2e:ro -v "$(winpath "$OUT/$1")":/out -w /home/pptruser \
    ghcr.io/puppeteer/puppeteer:latest sh -c "cp /e2e/ui.js . && node ui.js" > "$OUT/$1.txt" 2>&1 || true
  docker run --rm --network $NET -e BASE="$url" $ENV -v "$(winpath e2e)":/e2e:ro \
    node:22-alpine node /e2e/api.mjs >> "$OUT/$1.txt" 2>&1 || true
  docker rm -f "cm-e2e-$1" >/dev/null
}

trap 'docker rm -f cm-e2e-base cm-e2e-new >/dev/null 2>&1; docker network rm $NET >/dev/null 2>&1' EXIT
docker network create $NET >/dev/null 2>&1 || true
echo "Building $BASE_REF and ${NEW_REF:-the working tree} ..."
build carmaint:e2e-base "$BASE_REF"
build carmaint:e2e-new "$NEW_REF"
run base
run new
echo "Output: $OUT (base.txt, new.txt, base/shots, new/shots)"
diff "$OUT/base.txt" "$OUT/new.txt" && echo "No differences."
