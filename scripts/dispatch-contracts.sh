#!/bin/sh
# Ask the api-contracts repo to regenerate its Bruno collections after a deploy.
# Usage: CONTRACTS_TOKEN=<pat> ./scripts/dispatch-contracts.sh [prod|staging]
set -eu

ENV_NAME=${1:-prod}
TOKEN=${CONTRACTS_TOKEN:?CONTRACTS_TOKEN is required}
REPO=${CONTRACTS_REPO:-ProjectFasberry/api-contracts}

status=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$REPO/dispatches" \
  -d "{\"event_type\":\"api-updated\",\"client_payload\":{\"env\":\"$ENV_NAME\"}}")

if [ "$status" = "204" ]; then
  echo "contracts sync dispatched: $ENV_NAME"
else
  echo "contracts sync failed: HTTP $status" >&2
  exit 1
fi
