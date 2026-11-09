import { validatePermission } from "#/lib/validators";
import { permissionsService } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import { buildRouteSummary } from "#/utils";
import Elysia, { t } from "elysia";
import { sql, type Kysely } from "kysely";

/**
 * The generated `DB` type predates the 0005 migration; the new columns are
 * additive, so this route keeps a local, untyped table surface until the
 * schema is regenerated.
 */
const db = general;

const SEVERITIES = ["info", "warning", "danger"] as const;

const querySchema = t.Object({
  limit: t.Optional(
    t.Transform(t.Number({ maximum: 100, default: 50 }))
      .Decode((value) => value ?? 50)
      .Encode((value) => value),
  ),
  endCursor: t.Optional(t.String({ maxLength: 512 })),
  initiator: t.Optional(t.String({ minLength: 1, maxLength: 32 })),
  event: t.Optional(t.String({ minLength: 1, maxLength: 128 })),
  severity: t.Optional(t.Union([t.Literal("info"), t.Literal("warning"), t.Literal("danger")])),
  from: t.Optional(t.String({ maxLength: 64 })),
  to: t.Optional(t.String({ maxLength: 64 })),
});

type Cursor = { created_at: string; id: number };

function encodeCursor(row: { created_at: Date | string; id: number }): string {
  const payload: Cursor = {
    created_at: new Date(row.created_at).toISOString(),
    id: Number(row.id),
  };

  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeCursor(value: string): Cursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<Cursor>;

    if (typeof parsed.created_at !== "string" || Number.isNaN(Date.parse(parsed.created_at))) return null;
    if (typeof parsed.id !== "number" || !Number.isInteger(parsed.id)) return null;

    return parsed as Cursor;
  } catch {
    return null;
  }
}

function parseDate(value: string | undefined): Date | null | undefined {
  if (!value) return undefined;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const historyList = new Elysia()
  .use(validatePermission(permissionsService.get("HISTORY.READ")))
  .get("/list", async ({ query, status }) => {
    const {
      limit = 50,
      endCursor,
      initiator,
      event,
      severity,
      from,
      to,
    } = query as {
      limit?: number; endCursor?: string; initiator?: string; event?: string;
      severity?: typeof SEVERITIES[number]; from?: string; to?: string;
    };

    const fromDate = parseDate(from);
    const toDate = parseDate(to);

    if (fromDate === null || toDate === null) {
      return status(400, { error: "INVALID_DATE" });
    }

    const cursor = endCursor ? decodeCursor(endCursor) : null;
    if (endCursor && !cursor) {
      return status(400, { error: "INVALID_CURSOR" });
    }

    let request = db
      .selectFrom("admin_activity_log")
      .selectAll()
      .orderBy("created_at", "desc")
      .orderBy("id", "desc")
      .limit((limit ?? 50) + 1);

    if (initiator) request = request.where("initiator", "=", initiator);
    if (event) request = request.where("event", "=", event);
    if (severity) request = request.where("severity", "=", severity);
    if (fromDate) request = request.where("created_at", ">=", fromDate);
    if (toDate) request = request.where("created_at", "<=", toDate);

    if (cursor) {
      const createdAt = new Date(cursor.created_at);

      request = request.where(
        sql<boolean>`(
          "created_at" < ${createdAt}
          or ("created_at" = ${createdAt} and "id" < ${cursor.id})
        )`,
      );
    }

    const rows = await request.execute();
    const hasNextPage = rows.length > (limit ?? 50);
    if (hasNextPage) rows.pop();

    // The panel client unwraps the outer `data`, so the page (rows + meta)
    // travels inside it, like the other paginated private routes.
    return {
      data: {
        data: rows,
        meta: {
          hasNextPage,
          endCursor: rows.length > 0
            ? encodeCursor(rows[rows.length - 1] as { created_at: Date | string; id: number })
            : undefined,
        },
      },
    };
  }, {
    query: querySchema,
    detail: {
      summary: buildRouteSummary("Get history list"),
    },
  });
