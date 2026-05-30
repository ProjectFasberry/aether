import * as p from "@clack/prompts";
import { getDatabasesList } from "./utils";

const portOpts = {
  port: () =>
    p.text({
      message: "Enter port for database",
      placeholder: "5000",
      validate: (value) => {
        if (!value) return "Please enter a value";
        const num = parseInt(value);
        if (Number.isNaN(num)) return "Please enter a valid number";
        if (num < 1 || num > 65535) return "Port must be between 1 and 65535";
        return undefined;
      },
      defaultValue: "5000",
      initialValue: "5000",
    }),
};

const baseOpts = {
  target: () =>
    p.select({
      message: "Select database",
      options: getDatabasesList().map((k) => ({ value: k, label: k })),
    }),
  mode: () =>
    p.select({
      message: "Select mode",
      options: [
        { value: "dev", label: "Development" },
        { value: "prod", label: "Production" },
      ],
    }),
};

export { baseOpts, portOpts };
