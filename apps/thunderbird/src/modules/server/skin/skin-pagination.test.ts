import { describe, expect, it } from "bun:test";
import { isAllowedHost, paginateSkins, skinHeadKey } from "@repo/core/modules/skins/index";

describe("paginateSkins", () => {
  const data = Array.from({ length: 5 }, (_, index) => index);

  it("returns everything by default", () => {
    expect(paginateSkins(data)).toEqual({ data, nextCursor: null });
  });

  it("slices by cursor and limit", () => {
    expect(paginateSkins(data, "1", "2")).toEqual({ data: [1, 2], nextCursor: "3" });
  });

  it("clamps the limit", () => {
    expect(paginateSkins(data, "0", "999").data).toHaveLength(5);
  });

  it("ignores an invalid cursor", () => {
    expect(paginateSkins(data, "nope", "2").data).toEqual([0, 1]);
  });
});

describe("skinHeadKey", () => {
  it("is stable and content-addressed", () => {
    expect(skinHeadKey("abc")).toBe(skinHeadKey("abc"));
    expect(skinHeadKey("abc")).not.toBe(skinHeadKey("abd"));
  });
});

describe("isAllowedHost", () => {
  it("allows exact and subdomain hosts", () => {
    expect(isAllowedHost("https://textures.minecraft.net/x", ["textures.minecraft.net"])).toBe(true);
    expect(isAllowedHost("https://a.textures.minecraft.net/x", ["textures.minecraft.net"])).toBe(true);
  });

  it("rejects other hosts and malformed URLs", () => {
    expect(isAllowedHost("https://evil.test/x", ["textures.minecraft.net"])).toBe(false);
    expect(isAllowedHost("not a url", ["textures.minecraft.net"])).toBe(false);
  });
});
