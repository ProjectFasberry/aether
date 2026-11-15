import { skinsService } from "#/shared/services/skins";
import { minioService } from "#/shared/services/minio";
import { undash } from "./profile.model";
import { signTextureValue, signaturePublicKey } from "./sign";

export { signaturePublicKey };

/**
 * `textures` property for the Yggdrasil profile.
 *
 * The client verifies texture signatures against `signaturePublickey` from our
 * API metadata, so the property must be signed by us: Mojang signatures (what
 * SkinsRestorer may still carry for old rows) do not pass that check. The skin
 * itself points at the URL stored in the skins database, which is our `skins`
 * bucket for every upload since the MineSkin removal.
 */

const SLIM_VARIANTS = new Set(["SLIM", "slim"]);

type TexturesProperty = {
  name: "textures";
  value: string;
  signature: string;
};

const isHttpUrl = (value: string | null | undefined): value is string =>
  Boolean(value) && typeof value === "string" && /^https?:\/\//i.test(value);

/**
 * Current skin of a player. The history is cached with a TTL and warmed on a
 * miss, so a cold or evicted key is rebuilt from the skins database instead of
 * silently serving the default skin.
 */
async function currentSkin(nickname: string) {
  const cached = await skinsService.skin.getSkinsPayload(nickname, minioService.getInstance);

  return cached?.[0] ?? skinsService.skin.getFallbackSkin();
}

export const texturesService = {
  /**
   * Builds and signs the `textures` property for an account. Returns `null` when
   * the account has no usable skin, so the client falls back to the default one.
   */
  async property(nickname: string, uuid: string): Promise<TexturesProperty | null> {
    const skin = await currentSkin(nickname);

    if (!skin || !isHttpUrl(skin.skin_url)) return null;

    const slim = SLIM_VARIANTS.has(skin.skin_variant ?? "");
    const { value, signature } = signTextureValue({
      url: skin.skin_url,
      variant: slim ? "SLIM" : "CLASSIC",
      profileId: undash(uuid),
      profileName: nickname,
    });

    return { name: "textures", value, signature };
  },
};
