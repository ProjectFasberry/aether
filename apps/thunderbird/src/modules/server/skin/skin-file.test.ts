import { describe, expect, it } from "bun:test";
import { assertValidSkinFile, InvalidSkinFileError } from "./skin-file";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** The validator only needs the signature and the IHDR dimensions. */
const fakePng = (width: number, height: number) => {
  const buffer = Buffer.alloc(24);
  Buffer.from(PNG_SIGNATURE).copy(buffer, 0);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);

  return new Blob([buffer]);
};

describe("assertValidSkinFile", () => {
  it("accepts 64x64 and legacy 64x32 skins", async () => {
    await expect(assertValidSkinFile(fakePng(64, 64))).resolves.toBeUndefined();
    await expect(assertValidSkinFile(fakePng(64, 32))).resolves.toBeUndefined();
  });

  it("rejects a PNG with unsupported dimensions", async () => {
    await expect(assertValidSkinFile(fakePng(32, 32))).rejects.toBeInstanceOf(InvalidSkinFileError);
  });

  it("rejects a non-PNG payload regardless of its MIME type", async () => {
    await expect(assertValidSkinFile(new Blob(["not a png"]))).rejects.toBeInstanceOf(InvalidSkinFileError);
  });
});
