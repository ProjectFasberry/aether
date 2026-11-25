import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { randomUUID } from "node:crypto";
import { callServerCommand } from "#/shared/nats/command";
import { createAdminActivityLog } from "../private.model";

const actionBody = t.Object({
  target: t.String({ minLength: 1, maxLength: 16 }),
  action: t.UnionEnum(["kick", "ban", "exempt"]),
  server: t.Optional(t.String({ maxLength: 32 })),
  reason: t.Optional(t.String({ maxLength: 200 })),
});

export const grimActions = new Elysia()
  .use(validatePermission("anticheat.act"))
  .post(
    "/action",
    async ({ body }) => {
      const reason = body.reason?.trim() || "anticheat";
      const meta = {
        recipient: body.target,
        fallbackServer: body.server?.toLowerCase(),
        // Wait for the backend reply, so a rejected command is not reported as success.
        commandId: randomUUID(),
      };

      if (body.action === "exempt") {
        await callServerCommand({
          parent: "lp",
          value: `user ${body.target} permission set grim.exempt true`,
          meta,
        });
      } else {
        await callServerCommand({
          parent: body.action,
          value: `${body.target} ${reason}`,
          meta,
        });
      }

      return { data: { ok: true } };
    },
    {
      body: actionBody,
      response: { 200: withData(t.Object({ ok: t.Boolean() })) },
      afterResponse: ({ nickname: initiator, permission, body }) => {
        if (!initiator) return;

        void createAdminActivityLog({
          event: permission ?? "anticheat.act",
          initiator,
          severity: body.action === "kick" ? "warning" : "info",
          metadata: {
            action: body.action,
            target: body.target,
            server: body.server ?? null,
            reason: body.reason ?? null,
          },
        });
      },
      detail: { summary: buildRouteSummary("Kick, ban or exempt a flagged player") },
    },
  );
