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
