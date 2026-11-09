import { getDeepValue, hasKeyDeep } from "#/helpers/object";
import { updateState, getServiceState, type ServiceState } from "#/shared/constants";
import { persistServiceState } from "#/shared/services/service-state";
import { general } from "#/shared/database/general-db";
import { type Static, t } from "elysia";

export const updateOptionsSchema = t.Object({
	value: t.Boolean(),
});

export const optionSchema = t.Object({
	name: t.String(),
	value: t.Boolean(),
	title: t.String(),
});

type Option = Static<typeof optionSchema>;

export async function updateOptions(
	name: string,
	{ value }: Static<typeof updateOptionsSchema>,
): Promise<Static<typeof updateOptionsSchema>> {
	const serviceState = getServiceState();

	if (hasKeyDeep(serviceState, name)) {
		updateState(name, value);
		await persistServiceState();
		const updatedState = getServiceState();
		return { value: getDeepValue(updatedState, name) as boolean };
	}

	const query = await general
		.updateTable("options")
		.set({ value })
		.where("name", "=", name)
		.returning("value")
		.executeTakeFirstOrThrow();

	return query;
}

export async function getDynamicOptions(): Promise<Option[]> {
  const query = await general
    .selectFrom("options")
    .select(["name", "value", "title"])
    .execute();

	return query;
}

type DescriptionMap<T> = {
  [K in keyof T]: T[K] extends boolean
  ? string : T[K] extends object ? DescriptionMap<T[K]>
  : never;
};

function get(state: Record<string, unknown>, descriptions: Record<string, unknown>, path = ""): Option[] {
	return Object.entries(state).flatMap(([key, value]): Option[] => {
		const currentPath = path ? `${path}.${key}` : key;

		if (typeof value === "boolean") {
			const title = descriptions[key];

			return [
				{
					name: currentPath,
					value,
					title: typeof title === "string" ? title : "No description",
				},
			];
		}

		return get(
			value as Record<string, unknown>,
			(descriptions[key] ?? {}) as Record<string, unknown>,
			currentPath,
		);
	});
}

const DESCRIPTION_MAP: DescriptionMap<ServiceState> = {
	logging: {
		validators: "Логирование валидаторов",
		globalError: "Логирование глобальных ошибок",
		requests: "Логирование запросов",
	},
};

function getStaticOptions(): Option[] {
	return get(getServiceState(), DESCRIPTION_MAP);
}

export async function getOptions(): Promise<Option[]> {
	const dynamicData = await getDynamicOptions();
	const staticData = getStaticOptions();
	const data = [...dynamicData, ...staticData];
	return data;
}
