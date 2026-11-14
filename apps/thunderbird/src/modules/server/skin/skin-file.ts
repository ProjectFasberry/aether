/** Byte-level validation for uploaded skins. */

export class InvalidSkinFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSkinFileError";
  }
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const SKIN_SIZES = new Set(["64x64", "64x32"]);

/**
 * Validates the actual bytes: the client-provided MIME type is not trusted and
 * MineSkin rejects malformed files only after the job is queued.
 */
export async function assertValidSkinFile(file: Blob): Promise<void> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new InvalidSkinFileError("The file is not a PNG");
  }

  // IHDR is the first chunk; width and height are big-endian at 16..24.
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  if (!SKIN_SIZES.has(`${width}x${height}`)) {
    throw new InvalidSkinFileError(`Unsupported skin size: ${width}x${height}`);
  }
}
