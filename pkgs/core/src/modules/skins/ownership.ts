/** Ownership rules for custom skins (`sr_custom_skins.name`). */

export type SkinOwner = {
  owner_uuid: string,
  is_public: number | boolean,
}

/**
 * Uploads name skins `sr-<nickname>-<suffix>`; returns `null` for names that do
 * not follow the convention (legacy rows, the `default` skin).
 */
export const parseSkinName = (skinName: string): string | null => {
  const match = /^sr-(.+)-[A-Za-z0-9_-]{4}$/.exec(skinName)
  return match?.[1] ?? null
}

/**
 * A player may wear their own skins and explicitly public ones. Until the
 * ownership backfill has run, a name that embeds the player's nickname is
 * accepted so existing uploads keep working.
 */
export const canUseSkin = ({
  skinName, nickname, uuid, owner,
}: {
  skinName: string,
  nickname: string,
  uuid: string,
  owner: SkinOwner | null,
}): boolean => {
  if (owner) return owner.owner_uuid === uuid || Boolean(owner.is_public)

  return parseSkinName(skinName)?.toLowerCase() === nickname.toLowerCase()
}
