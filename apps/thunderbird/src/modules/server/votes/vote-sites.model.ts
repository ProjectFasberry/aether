import { general } from "#/shared/database/general-db";
import { appLogger } from "#/shared/constants/logger";

/**
 * Vote sites and their shared signing secrets.
 *
 * The secret used to live in `VOTIFIEF_SECRET_KEY`; it now sits in `vote_sites`
 * so a site can be rotated or added without a deploy. The first boot imports the
 * old env value into the default site.
 */
const ENV_SECRET = "VOTIFIEF_SECRET_KEY";
const DEFAULT_SLUG = "votifier";

export type VoteSite = {
  id: number;
  slug: string;
  secret: string;
  enabled: boolean;
};

export const voteSites = {
  async ensure(): Promise<void> {
    const existing = await general
      .selectFrom("vote_sites")
      .select("id")
      .limit(1)
      .executeTakeFirst();

    if (existing) return;

    const secret = Bun.env[ENV_SECRET]?.trim();
    if (!secret) return;

    try {
      await general
        .insertInto("vote_sites")
        .values({ slug: DEFAULT_SLUG, secret, enabled: true })
        .execute();
    } catch {
      // Another replica inserted the default site first; nothing to do.
      return;
    }

    appLogger.info(`Vote site "${DEFAULT_SLUG}" imported from ${ENV_SECRET}`);
  },

  async getDefault(): Promise<VoteSite | null> {
    const row = await general
      .selectFrom("vote_sites")
      .select(["id", "slug", "secret", "enabled"])
      .where("enabled", "=", true)
      .orderBy("id")
      .limit(1)
      .executeTakeFirst();

    return row ?? null;
  },
};
