import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { wrapError } from "@repo/shared/lib/helpers";
import { entryVersions, readContentManifest } from "#/modules/content/manifest.model";

const resourcePackOptionSchema = t.Object({
	name: t.String(),
	versions: t.Array(t.String()),
});

/**
 * Packs the launcher can install, as `<name>` values of the `servers.resource_pack`
 * column. The panel uses this instead of a free-text field so an operator cannot
 * point a server at a pack that was never published.
 */
export const serverResourcePacks = new Elysia()
	.use(validatePermission("servers.read"))
	.get(
		"/resource-packs",
		async ({ status }) => {
			try {
				const manifest = await readContentManifest();
				const byName = new Map<string, Set<string>>();

				for (const file of manifest.files) {
					if (!file.path.startsWith("resourcepacks/")) continue;

					const name = file.path.slice("resourcepacks/".length);
					if (!name || name.includes("/")) continue;

					const versions = byName.get(name) ?? new Set<string>();
					for (const version of entryVersions(file)) versions.add(version);
					byName.set(name, versions);
				}

				const data = [...byName.entries()]
					.map(([name, versions]) => ({ name, versions: [...versions].sort() }))
					.sort((a, b) => a.name.localeCompare(b.name));

				return { data };
			} catch {
				return status(503, wrapError("Content manifest is unavailable, try again"));
			}
		},
		{
			response: {
				200: withData(t.Array(resourcePackOptionSchema)),
				503: withError(t.String()),
			},
			detail: {
				summary: buildRouteSummary("List resource packs published in the content manifest"),
			},
		},
	);
