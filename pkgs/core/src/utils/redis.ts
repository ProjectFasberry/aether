type BuildRedisKey = {
  name: string,
  target: "external" | "internal"
}

export const buildRedisKey = ({
  name, target,
}: BuildRedisKey) => {
  const root = `cache:${target}`
  return `${root}:${name}`
}

/** Process-wide logging switches live in the internal cache namespace. */
export const SERVICE_STATE_KEY = buildRedisKey({
  target: "internal",
  name: "service-state",
});
export const SERVICE_STATE_CHANNEL = buildRedisKey({
  target: "internal",
  name: "service-state:changed",
});
/** Pre-namespace key kept for a one-release migration. */
export const LEGACY_SERVICE_STATE_KEY = "service:state";
