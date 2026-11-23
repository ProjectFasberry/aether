import Elysia, { t } from "elysia";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { defineOptionalSession, getUserRole, resolveNickname } from "#/lib/define";
import { getPermissions } from "#/modules/user/me.model";

const accessSchema = t.Object({
  nickname: t.Nullable(t.String()),
  canEdit: t.Boolean(),
  canPublish: t.Boolean(),
});

/**
 * Who may edit the landing, answered from the session cookie.
 *
 * The site forwards the incoming cookie header here, exactly like the wiki: the
 * token never reaches the browser-side code and the permission stays server-side.
 */
export const siteAccess = new Elysia()
  .use(defineOptionalSession())
  .get(
    "/access",
    async ({ session, request }) => {
      const nickname = await resolveNickname(request, session);

      if (!nickname) return { data: { nickname: null, canEdit: false, canPublish: false } };

      const role = await getUserRole(nickname);
      if (!role) return { data: { nickname, canEdit: false, canPublish: false } };

      const permissions = await getPermissions(nickname, role.id);

      return {
        data: {
          nickname,
          canEdit: permissions.has("content.update"),
          canPublish: permissions.has("content.publish"),
        },
      };
    },
    {
      response: {
        200: withData(accessSchema),
      },
      detail: {
        summary: buildRouteSummary("Who may edit site content"),
      },
    },
  );
