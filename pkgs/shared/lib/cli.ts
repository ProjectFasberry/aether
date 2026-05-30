import * as p from "@clack/prompts";
import type { Databases } from "../constants/dbs";

export const commonPrompts = ({ databases }: { databases: Databases }) => ({
	target: () => {
		const options = Object.entries(databases).map(([name, value]) => ({ value, label: name }));

		return p.select({
			message: "Select database",
			options,
		});
	},
	mode: () =>
		p.select({
			message: "Select environment",
			options: [
				{ value: "dev", label: "Development" },
				{ value: "prod", label: "Production" },
			],
		}),
});
