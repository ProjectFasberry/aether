#!/usr/bin/env bash
#
# Build and roll out thunderbird to production.
#
# The image is not built from this checkout: the source is mirrored into the
# unversioned build tree on the deploy host (it is not a git clone) and built
# there with the repo Dockerfile. The npm token for private packages is read
# from the local .env and handed to BuildKit as a secret over ssh stdin, so it
# is never written to disk, never lands in argv and never ends up in a layer.
#
# Usage:
#   scripts/deploy/thunderbird.sh                     # sync, build, push, roll out (prod)
#   STAGE=staging scripts/deploy/thunderbird.sh       # same for the staging stack
#   scripts/deploy/thunderbird.sh --sync-only         # only mirror the source
#   scripts/deploy/thunderbird.sh --no-rollout        # sync, build, push, stop
#
# Overridable: STAGE, DEPLOY_HOST, BUILD_TREE, COMPOSE_DIR, COMPOSE_FILE,
# REGISTRY_HOST, IMAGE_NAME.
set -euo pipefail

STAGE="${STAGE:-prod}"
HOST="${DEPLOY_HOST:-i-m}"
TREE="${BUILD_TREE:-/home/rus/build/aether}"
COMPOSE_DIR="${COMPOSE_DIR:-/opt/main/${STAGE}}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.${STAGE}.yml}"
REGISTRY_HOST="${REGISTRY_HOST:-registry.fasberry.fun}"
IMAGE_NAME="${IMAGE_NAME:-thunderbird}"
IMAGE="${REGISTRY_HOST}/${STAGE}/${IMAGE_NAME}:latest"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

sync_only=false
rollout=true

for arg in "$@"; do
  case "$arg" in
    --sync-only) sync_only=true ;;
    --no-rollout) rollout=false ;;
    -h|--help) sed -n '2,20p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown argument: $arg" >&2; exit 2 ;;
  esac
done

echo "==> mirroring $ROOT -> $HOST:$TREE"
# --delete keeps the tree a true mirror: files removed here are removed there.
# Excluded paths stay untouched (they are either secrets or build output).
rsync -az --delete --itemize-changes \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='.npmrc' \
  --exclude='*.log' \
  ./ "$HOST:$TREE/"

if [ "$sync_only" = true ]; then
  echo "==> sync only, done"
  exit 0
fi

token="$(sed -n 's/^NODE_AUTH_TOKEN=//p' .env | head -n1 | tr -d "\"'" | tr -d '\r')"
if [ -z "$token" ]; then
  echo "NODE_AUTH_TOKEN is missing in $ROOT/.env" >&2
  exit 1
fi

echo "==> building and pushing $IMAGE"
# The token travels on stdin and only lives in this remote shell's environment.
printf '%s' "$token" | ssh "$HOST" "
  IFS= read -r token
  cd '$TREE'
  NODE_AUTH_TOKEN=\"\$token\" docker buildx build \
    --push \
    --platform linux/amd64 \
    --build-arg STAGE='$STAGE' \
    --secret id=npm_token,env=NODE_AUTH_TOKEN \
    -t '$IMAGE' \
    -f apps/thunderbird/Dockerfile .
"

if [ "$rollout" = false ]; then
  echo "==> build only, done"
  exit 0
fi

echo "==> rolling out"
ssh "$HOST" "cd '$COMPOSE_DIR' \
  && docker compose -f '$COMPOSE_FILE' pull '$IMAGE_NAME' \
  && docker compose -f '$COMPOSE_FILE' up -d '$IMAGE_NAME'"

echo "==> verify"
ssh "$HOST" "docker inspect -f '{{.Created}} {{.State.Status}} {{.Image}}' '${STAGE}-app-${IMAGE_NAME}'"

if [ "$STAGE" = "prod" ]; then
  curl -fsS -o /dev/null -w 'api status: %{http_code}\n' https://api.fasberry.fun/server/status || true
fi
