#!/bin/sh
#
# Pull-based rollout for the app stacks on the deploy host.
#
# Runs from a systemd timer: pulls the image of every configured service and
# lets compose recreate the container only when the digest changed. This keeps
# deploys independent of SSH access from the workstation: CI pushes to the
# registry and the host picks it up on the next tick.
#
# Overridable: SERVICES (space separated), STACKS ("name:dir:compose-file ...").
set -eu

SERVICES="${SERVICES:-thunderbird}"
STACKS="${STACKS:-prod:/opt/main/prod:docker-compose.prod.yml staging:/opt/main/staging:docker-compose.staging.yml}"

log() {
  echo "[pull-update] $*"
}

for entry in $STACKS; do
  stack="${entry%%:*}"
  rest="${entry#*:}"
  dir="${rest%%:*}"
  file="${rest#*:}"

  if [ ! -d "$dir" ] || [ ! -f "$dir/$file" ]; then
    continue
  fi

  cd "$dir"

  for service in $SERVICES; do
    container="${stack}-app-${service}"

    before=$(docker inspect -f '{{.Image}}' "$container" 2>/dev/null || true)

    if ! docker compose -f "$file" pull --quiet "$service"; then
      log "$container: pull failed"
      continue
    fi

    docker compose -f "$file" up -d --no-deps "$service"

    after=$(docker inspect -f '{{.Image}}' "$container" 2>/dev/null || true)

    if [ "$before" = "$after" ]; then
      [ "${VERBOSE:-0}" = "1" ] && log "$container: unchanged"
    else
      log "$container: updated ${before:-none} -> ${after:-none}"
    fi
  done
done
