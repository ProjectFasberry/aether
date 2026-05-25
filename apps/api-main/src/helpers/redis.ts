export const getRedisKey = (
  target: "external" | "internal",
  name: string
) => {
  const root = `cache:${target}`
  return `${root}:${name}`
}
