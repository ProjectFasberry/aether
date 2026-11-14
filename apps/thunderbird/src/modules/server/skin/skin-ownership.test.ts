import { describe, expect, it } from "bun:test";
import { canUseSkin, parseSkinName } from "@repo/core/modules/skins/ownership";

describe("parseSkinName", () => {
  it("extracts the nickname", () => {
    expect(parseSkinName("sr-Steve-a1B2")).toBe("Steve");
    expect(parseSkinName("sr-notch_x-9z8Y")).toBe("notch_x");
  });

  it("rejects names outside the upload convention", () => {
    expect(parseSkinName("default")).toBeNull();
    expect(parseSkinName("sr-Steve")).toBeNull();
    expect(parseSkinName("skin-Steve-a1B2")).toBeNull();
  });
});

describe("canUseSkin", () => {
  const base = { skinName: "sr-Steve-a1B2", nickname: "Steve", uuid: "uuid-steve" };

  it("allows the owner", () => {
    expect(canUseSkin({ ...base, owner: { owner_uuid: "uuid-steve", is_public: 0 } })).toBe(true);
  });

  it("rejects another player's private skin", () => {
    expect(canUseSkin({ ...base, owner: { owner_uuid: "uuid-alex", is_public: 0 } })).toBe(false);
  });

  it("allows a public skin", () => {
    expect(canUseSkin({ ...base, owner: { owner_uuid: "uuid-alex", is_public: 1 } })).toBe(true);
  });

  it("falls back to the nickname in the name before the backfill", () => {
    expect(canUseSkin({ ...base, owner: null })).toBe(true);
    expect(canUseSkin({ ...base, nickname: "Alex", owner: null })).toBe(false);
  });
});
