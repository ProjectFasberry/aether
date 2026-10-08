import * as p from "@clack/prompts";

export const commonPrompts = <T>({ databases, scoped }: { databases: Record<string, T>, scoped: boolean }) => {
  const results: {  mode: () => Promise<symbol | "dev" | "prod">, target?: () => Promise<symbol | T> } = {
    mode: () => p.select({
      message: "Select environment",
      options: [
        { value: "dev", label: "Development" },
        { value: "prod", label: "Production" },
      ],
    })
  }

  if (!scoped) {
    results["target"] = () => {
      const options = Object
        .entries(databases)
        .map(([name, value]) => ({ value, label: name }));

      return p.select({
        message: "Select database",
        // @ts-expect-error
        options,
      })
    }
  }

  return results
};
