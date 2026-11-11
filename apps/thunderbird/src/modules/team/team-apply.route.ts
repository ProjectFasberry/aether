import Elysia, { t } from "elysia";
import { buildRouteSummary } from "#/lib/routes";
import { withData, withError } from "#/shared/schemas";
import { botValidator } from "#/lib/validators";
import { defineRequiredUser } from "#/lib/define";
import { ipPlugin } from "#/lib/plugins/index";
import { allowRequest } from "#/shared/services/rate-limit";
import { createApplication, teamApplySchema } from "./team.model";
import { notifyTeamApplication } from "#/shared/notify/team";

/** Two applications per player and five per address per day. */
const LIMIT_PER_PLAYER = 2;
const LIMIT_PER_IP = 5;
const WINDOW_SECONDS = 24 * 60 * 60;

export const teamApply = new Elysia()
  .use(defineRequiredUser())
  .use(botValidator())
  .use(ipPlugin())
  .post("/apply", async ({ nickname, body, ip, status }) => {
    const [byPlayer, byIp] = await Promise.all([
      allowRequest("team:apply:player", nickname, LIMIT_PER_PLAYER, WINDOW_SECONDS),
      allowRequest("team:apply:ip", ip, LIMIT_PER_IP, WINDOW_SECONDS),
    ]);

    if (!byPlayer || !byIp) throw status(429, { error: "RATE_LIMITED" });

    const application = await createApplication(nickname, body);

    void notifyTeamApplication({
      id: application.id,
      nickname,
      roles: body.roles,
      telegram: body.telegram,
      email: body.email,
      about: body.about,
    });

    return { data: { id: application.id } };
  }, {
    body: teamApplySchema,
    response: {
      200: withData(t.Object({ id: t.Number() })),
      400: withError(),
      401: withError(),
      429: withError(),
    },
    detail: {
      summary: buildRouteSummary("Apply to the project team"),
    },
  });
