import { describe, expect, it } from "bun:test";
import { parseCachedEntry, pickSkinVariant } from "@repo/core/modules/skins/index";

describe("pickSkinVariant", () => {
  it("uses the only known variant", () => {
    expect(pickSkinVariant([null, "SLIM"])).toBe("SLIM");
  });

  it("prefers the variant the player already wears", () => {
    expect(pickSkinVariant(["CLASSIC", "SLIM"], "SLIM")).toBe("SLIM");
  });

  it("falls back to a stable alphabetical pick for an ambiguous signature", () => {
    expect(pickSkinVariant(["SLIM", "CLASSIC"])).toBe("CLASSIC");
  });

  it("keeps the preferred variant when the asset has no variant row", () => {
    expect(pickSkinVariant([null], "SLIM")).toBe("SLIM");
  });

  it("defaults to classic", () => {
    expect(pickSkinVariant([])).toBe("CLASSIC");
  });
});

describe("parseCachedEntry", () => {
  const data = [{
    skin_identifier: "sr-steve-abcd",
    skin_variant: "SLIM",
    timestamp: 1,
    skin_url: "https://textures.test/skin.png",
    skin_head_url: "https://volume.test/avatars/steve.png",
  }];

  it("reads the current envelope", () => {
    expect(parseCachedEntry(JSON.stringify({ updatedAt: 123, data }))).toEqual({ updatedAt: 123, data });
  });

  it("reads a legacy array as stale", () => {
    expect(parseCachedEntry(JSON.stringify(data))).toEqual({ updatedAt: 0, data });
  });

  it("ignores missing and malformed entries", () => {
    expect(parseCachedEntry(null)).toBeNull();
    expect(parseCachedEntry("not json")).toBeNull();
  });
});
