#!/bin/sh

set -e

export INFISICAL_TOKEN=$(infisical login \
  --method=universal-auth \
  --client-id="$INFISICAL_CLIENT_ID" \
  --client-secret="$INFISICAL_CLIENT_SECRET" \
  --plain --silent)

if [ -z "$INFISICAL_TOKEN" ]; then
    echo "Error: Failed to obtain Infisical token."
    exit 1
fi

exec infisical run \
  --projectId "$INFISICAL_PROJECT_ID" \
  --env "$STAGE" \
  --path /backend \
  -- bun run ./dist/index.js