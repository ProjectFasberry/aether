import { DateTime } from "#/helpers/typebox";
import { general } from "#/shared/database/general-db";
import type { Tasks } from "@gen/db/general";
import { type Static, t } from "elysia";
import type { Selectable } from "kysely";

const EDITABLE_FIELDS = [
	"title",
	"description",
	"action_type",
	"action_value",
	"reward_currency",
	"reward_value",
	"expires",
] as const;

export const taskPanelSchema = t.Object({
	id: t.Number(),
	title: t.String(),
	description: t.String(),
	action_type: t.String(),
	action_value: t.Nullable(t.String()),
	reward_currency: t.String(),
	reward_value: t.Number(),
	created_at: DateTime,
	expires: t.Nullable(DateTime),
});

const expiresSchema = t.Optional(
	t.Nullable(t.Union([t.String({ format: "date-time" }), t.Date()])),
);

export const createTaskSchema = t.Object({
	title: t.String({ minLength: 1 }),
	description: t.String({ minLength: 1 }),
	/** The client action a player performs to complete the task. */
	action_type: t.UnionEnum(["link"]),
	action_value: t.Optional(t.Nullable(t.String())),
	reward_currency: t.UnionEnum(["BELKOIN", "CHARISM"]),
	reward_value: t.Number({ minimum: 1 }),
	expires: expiresSchema,
});

export const editTaskSchema = t.Array(
	t.Object({
		field: t.UnionEnum(EDITABLE_FIELDS),
		value: t.Union([t.String(), t.Number(), t.Null()]),
	}),
);

const toDate = (value: unknown): Date | null => {
	if (value === null || value === undefined || value === "") return null;

	const date = value instanceof Date ? value : new Date(String(value));
	return Number.isNaN(date.getTime()) ? null : date;
};

const toUpdates = (values: Static<typeof editTaskSchema>): Partial<Selectable<Tasks>> => {
	const updates: Partial<Selectable<Tasks>> = {};

	for (const { field, value } of values) {
		if (field === "expires") {
			updates.expires = toDate(value);
			continue;
		}

		if (field === "reward_value") {
			updates.reward_value = Number(value);
			continue;
		}

		if (field === "action_value") {
			const text = value === null ? "" : String(value).trim();
			updates.action_value = text || null;
			continue;
		}

		if (field === "action_type" || field === "reward_currency") {
			updates[field] = String(value);
			continue;
		}

		updates[field] = String(value);
	}

	return updates;
};

export const tasksAdmin = {
	async list(): Promise<Static<typeof taskPanelSchema>[]> {
		return await general
			.selectFrom("tasks")
			.select([
				"id",
				"title",
				"description",
				"action_type",
				"action_value",
				"reward_currency",
				"reward_value",
				"created_at",
				"expires",
			])
			.orderBy("created_at", "desc")
			.limit(100)
			.execute();
	},
	async create(
		values: Static<typeof createTaskSchema>,
	): Promise<Static<typeof taskPanelSchema>> {
		const query = await general
			.insertInto("tasks")
			.values({
				title: values.title.trim(),
				description: values.description.trim(),
				action_type: values.action_type,
				action_value: values.action_value?.trim() || null,
				reward_currency: values.reward_currency,
				reward_value: values.reward_value,
				expires: toDate(values.expires),
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		return query;
	},
	async edit(
		id: number,
		values: Static<typeof editTaskSchema>,
	): Promise<Static<typeof taskPanelSchema>> {
		return await general
			.updateTable("tasks")
			.set(toUpdates(values))
			.where("id", "=", id)
			.returningAll()
			.executeTakeFirstOrThrow();
	},
	async delete(id: number): Promise<{ id: number } | null> {
		const query = await general
			.deleteFrom("tasks")
			.where("id", "=", id)
			.returning(["id"])
			.executeTakeFirst();

		return query ?? null;
	},
} as const;
