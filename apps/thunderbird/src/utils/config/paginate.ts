export const getDirection = (
  asc: boolean | undefined | null,
  defaultDirection: "asc" | "desc" = "desc"
): "asc" | "desc" => {
  if (typeof asc !== 'boolean') {
    return defaultDirection;
  }

  return asc ? "asc" : "desc";
}