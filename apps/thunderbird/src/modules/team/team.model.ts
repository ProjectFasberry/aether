import { t } from "elysia";
import { general } from "#/shared/database/general-db";

export const TEAM_ROLES = ["builder", "developer", "designer", "moderator", "content", "other"] as const;
export const TEAM_STATUSES = ["new", "reviewed", "invited", "rejected"] as const;

export type TeamRole = (typeof TEAM_ROLES)[number];
export type TeamStatus = (typeof TEAM_STATUSES)[number];

export const teamRoleSchema = t.UnionEnum([...TEAM_ROLES]);
export const teamStatusSchema = t.UnionEnum([...TEAM_STATUSES]);

export const teamApplySchema = t.Object({
  roles: t.Array(teamRoleSchema, { minItems: 1, maxItems: TEAM_ROLES.length }),
  about: t.String({ minLength: 40, maxLength: 2000 }),
  telegram: t.String({ minLength: 2, maxLength: 64 }),
  email: t.Optional(t.String({ format: "email", maxLength: 128 })),
  portfolio: t.Optional(t.String({ maxLength: 2000 })),
});

export type TeamApplyPayload = typeof teamApplySchema.static;

export const teamApplicationSchema = t.Object({
  id: t.Number(),
  nickname: t.String(),
  uuid: t.Union([t.String(), t.Null()]),
  roles: t.Array(t.String()),
  about: t.String(),
  telegram: t.String(),
  email: t.Union([t.String(), t.Null()]),
  portfolio: t.Union([t.String(), t.Null()]),
  status: teamStatusSchema,
  createdAt: t.String(),
});

/** Nickname renames keep the uuid stable; the panel keys history by it. */
async function resolveUuid(nickname: string): Promise<string | null> {
  const row = await general
    .selectFrom("players")
    .select("uuid")
    .where("nickname", "=", nickname)
    .executeTakeFirst();

  return row?.uuid ?? null;
}

export async function createApplication(nickname: string, payload: TeamApplyPayload) {
  const uuid = await resolveUuid(nickname);

  const row = await general
    .insertInto("team_applications")
    .values({
      nickname,
      uuid,
      roles: payload.roles,
      about: payload.about.trim(),
      telegram: payload.telegram.trim(),
      email: payload.email?.trim() || null,
      portfolio: payload.portfolio?.trim() || null,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  return row;
}

export async function listApplications({ status, limit }: { status?: TeamStatus, limit?: number }) {
  const query = general
    .selectFrom("team_applications")
    .selectAll()
    .orderBy("created_at", "desc")
    .limit(Math.min(Math.max(limit ?? 100, 1), 200));

  const rows = status
    ? await query.where("status", "=", status).execute()
    : await query.execute();

  return rows.map((row) => ({
    id: row.id,
    nickname: row.nickname,
    uuid: row.uuid,
    roles: row.roles,
    about: row.about,
    telegram: row.telegram,
    email: row.email,
    portfolio: row.portfolio,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

export async function setApplicationStatus(id: number, status: TeamStatus) {
  const row = await general
    .updateTable("team_applications")
    .set({ status, updated_at: new Date().toISOString() })
    .where("id", "=", id)
    .returning(["id", "status"])
    .executeTakeFirst();

  return row ?? null;
}
