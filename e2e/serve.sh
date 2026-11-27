#!/bin/sh
# Runs the working tree with fresh data for a look or an ad-hoc browser script: pb_public, pb_hooks and
# pb_migrations are mounted, so file edits show after a reload (hooks and migrations after a restart).
#
#   e2e/serve.sh [NAME] [PORT]    default NAME cm-dev; PORT also publishes it on localhost
#
# The container runs on the Docker network cmnet (admin / test1234); the URL inside it is printed.
# Puppeteer on that network: docker run --rm --network cmnet -v <dir>:/s ghcr.io/puppeteer/puppeteer:latest ...
# (copy the script to /home/pptruser and run it there). Stop: docker rm -f NAME
set -eu
cd "$(dirname "$0")/.."
NAME=${1:-cm-dev}
PORT=${2:-}
IMAGE=carmaint:serve
export MSYS_NO_PATHCONV=1 # Git Bash on Windows
dir=$(pwd -W 2>/dev/null || pwd)

docker image inspect $IMAGE >/dev/null 2>&1 || docker build -q -t $IMAGE . >/dev/null
docker network create cmnet >/dev/null 2>&1 || true
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" --network cmnet ${PORT:+-p "$PORT":8090} \
  -e ADMIN_USERNAME=admin -e ADMIN_PASSWORD=test1234 \
  -v "$dir/pb_public:/pb/pb_public:ro" -v "$dir/pb_hooks:/pb/pb_hooks:ro" -v "$dir/pb_migrations:/pb/pb_migrations:ro" \
  $IMAGE >/dev/null
docker run --rm --network cmnet node:22-alpine sh -c \
  "for i in \$(seq 60); do wget -qO- http://$NAME:8090/api/health >/dev/null 2>&1 && exit 0; sleep 1; done; exit 1" \
  || { docker logs "$NAME" | tail -20; exit 1; }
echo "http://$NAME:8090${PORT:+ (and http://localhost:$PORT)}"
