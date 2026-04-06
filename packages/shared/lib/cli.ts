import path from "path";
import { readFileSync } from "fs";
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

export function loadEnv(filePath: string) {
	const data = readFileSync(path.resolve(filePath), "utf-8");
	for (const line of data.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const i = trimmed.indexOf("=");
		if (i === -1) continue;
		const key = trimmed.slice(0, i).trim();
		const val = trimmed.slice(i + 1).trim();
		process.env[key] = val;
	}
}
