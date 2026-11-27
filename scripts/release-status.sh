#!/bin/sh
# After pushing a release tag: waits for the GitHub workflows of its commit (at most 30 minutes), then prints
# their results, the latest GitHub release and the version's image tags on ghcr.io. Public APIs, no token.
#
#   scripts/release-status.sh vX.Y.Z
#
# Exit code 1 if a workflow failed, the release is not the latest or an image tag is missing.
set -eu
cd "$(dirname "$0")/.."
TAG=${1:?usage: scripts/release-status.sh vX.Y.Z}
VERSION=${TAG#v}
REPO=$(git remote get-url origin | sed -E 's#^(git@github\.com:|https://github\.com/)##; s#\.git$##')
IMAGE=$(echo "$REPO" | tr '[:upper:]' '[:lower:]')
SHA=$(git rev-list -n1 "$TAG")
API="https://api.github.com/repos/$REPO"

# One line per run: "head_branch" "status" "conclusion"
runs() {
  curl -fsS "$API/actions/runs?head_sha=$SHA&per_page=20" \
    | grep -o '"head_branch": "[^"]*"\|"status": "[^"]*"\|"conclusion": [^,]*' | paste -d' ' - - - || true
}
# Done when the tag has its runs (image + release) and nothing is queued or running
for i in $(seq 60); do
  r=$(runs)
  tagged=$(echo "$r" | grep -c "\"$TAG\"" || true)
  if [ "$tagged" -ge 2 ] && ! echo "$r" | grep -q '"status": "\(queued\|in_progress\|waiting\|pending\|requested\)"'; then break; fi
  sleep 30
done
echo "Workflows of $SHA:"
echo "$r" | sed 's/^/  /'
fail=0
echo "$r" | grep -v '"conclusion": "success"' | grep -q . && fail=1

latest=$(curl -fsS "$API/releases/latest" | grep -o '"tag_name": "[^"]*"' | cut -d'"' -f4)
echo "Latest release: $latest"
[ "$latest" = "$TAG" ] || fail=1

token=$(curl -fsS "https://ghcr.io/token?scope=repository:$IMAGE:pull" | sed 's/.*"token":"\([^"]*\)".*/\1/')
tags=$(curl -fsS -H "Authorization: Bearer $token" "https://ghcr.io/v2/$IMAGE/tags/list")
for t in "$VERSION" "${VERSION%.*}" latest; do
  if echo "$tags" | grep -q "\"$t\""; then echo "Image ghcr.io/$IMAGE:$t ok"; else echo "Image ghcr.io/$IMAGE:$t MISSING"; fail=1; fi
done
exit $fail
