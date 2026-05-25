import { bisquite } from "#/shared/database/bisquite-db"
import { reputation } from "#/shared/database/reputation-db"
import { safeJsonParse } from "#/utils/config/transforms";

type Skill = {
  line: string;
  xp: number;
  lastXP: number;
  knowledge: number;
  multiplier: number;
  freshness: number;
  rfreshness: number;
  lastLevel: number;
  last: number;
  storage: Record<string, unknown>;
  adaptations: Record<string, unknown>;
  multipliers: unknown[];
};

export type SkillsData = {
  skillLines: {
    discovery: Skill,
    agility: Skill,
    rift: Skill,
    architect: Skill,
    seaborne: Skill,
    stealth: Skill,
    axes: Skill,
    herbalism: Skill,
    hunter: Skill,
    pickaxe: Skill,
    swords: Skill,
    ranged: Skill,
    tragoul: Skill,
    excavation: Skill,
    unarmed: Skill
  };
  stats: {
    move: number,
    "minutes.online": number,
    "move.sprint": number,
    "move.sneak": number,
    "blocks.placed": number,
    "blocks.placed.value": number,
    "move.swim": number,
    "move.fly": number,
    "blocks.broken": number,
    "axes.blocks.broken": number,
    "axes.blocks.value": number,
    "food.eaten": number,
    "harvest.blocks": number,
    "killed.kills": number,
    "pickaxe.blocks.broken": number,
    "pickaxe.blocks.value": number,
    "sword.hits": number,
    "sword.damage": number,
    "ranged.shotsfired": number,
    "ranged.shotsfired.arrow": number,
    "ranged.distance": number,
    "ranged.distance.arrow": number,
    "ranged.damage": number,
    "ranged.damage.arrow": number,
    "trag.hitsrecieved": number,
    "trag.damage": number,
    "excavation.blocks.broken": number,
    "excavation.blocks.value": number,
    "axes.damage": number,
    "axes.swings": number,
    "unarmed.hist": number,
    "unarmed.damage": number,
  }
  last: "none",
  advancements: Array<string>,
  seenMobs: {
    seen: Array<string>
  },
  seenFoods: {
    seen: Array<string>
  },
  seenItems: {
    seen: Array<string>
  },
  seenRecipes: {
    seen: Array<string>
  },
  seenWorlds: {
    seen: Array<string>
  },
  seenPeople: {
    seen: Array<string>
  },
  seenEnvironments: {
    seen: Array<string>
  },
  seenPotionEffects: {
    seen: Array<string>
  },
  seenBlocks: {
    seen: Array<string>
  },
  multipliers: unknown[],
  wisdom: number,
  multiplier: number,
  lastLogin: number,
  masterXp: number,
  lastMasterXp: number
};

type PlayerGameInfo = {
  reputation: number,
  meta: string | null,
  displayName: string | null,
  totalPlaytime: number
}

export async function getSkills(nickname: string): Promise<SkillsData | null> {
  const query = await bisquite
    // @ts-expect-error
    .selectFrom("ADAPT_DATA")
    // @ts-expect-error
    .innerJoin("Players", "Players.UUID", "ADAPT_DATA.UUID")
    .select([
      "ADAPT_DATA.DATA"
    ])
    .where("Players.Name", "=", nickname)
    .executeTakeFirst()

  if (!query) return null;

  const result = safeJsonParse<SkillsData>(query.DATA)
  if (!result.ok) return null

  return result.value
}

export async function getPlayerGameInfo(nickname: string): Promise<PlayerGameInfo> {
  const main = await bisquite
    .selectFrom("cmi_users")
    .leftJoin("playerpoints_username_cache", "cmi_users.username", "playerpoints_username_cache.username")
    .leftJoin("playerpoints_points", "playerpoints_points.uuid", "playerpoints_username_cache.uuid")
    .select([
      "cmi_users.Balance",
      "cmi_users.UserMeta",
      "playerpoints_points.points",
      "cmi_users.player_uuid",
      "cmi_users.TotalPlayTime",
      "cmi_users.DisplayName"
    ])
    .where("cmi_users.username", "=", nickname)
    .executeTakeFirst()

  if (!main) {
    const s = {
      meta: null,
      reputation: 0,
      displayName: null,
      totalPlaytime: 0
    }

    return s
  }

  const result = await reputation
    .selectFrom("reputation")
    .select("reputation")
    .where("reputation.uuid", "=", main.player_uuid)
    .executeTakeFirst()

  return {
    meta: main.UserMeta,
    reputation: result?.reputation ? result.reputation : 0,
    displayName: main.DisplayName,
    totalPlaytime: main.TotalPlayTime ?? 0
  }
}