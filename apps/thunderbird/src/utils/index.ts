export * from "@repo/shared/lib/utils";

export const buildRouteSummary = (describe: string, { tags }: { tags?: string[] } = {}) => {
  const tagString = tags ? ` [${tags.join(", ")}]` : "";
  return `${describe}${tagString}`;
};
