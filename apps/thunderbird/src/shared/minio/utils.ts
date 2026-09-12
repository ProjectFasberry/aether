import { nodeToWebStream } from "#/helpers/streams";
import { logger } from "@repo/shared/utils/logger";
import { BUCKETS } from "#/shared/minio/client";
import type { Client } from "minio";
import { extname } from "node:path";

export const textSets: Record<string, Set<string>> = {};
export const fileBlobs: Record<string, File> = {};

type FileProcessor = (filename: string, content: string | Uint8Array) => void;
type FileEntry = { key: string, value: FileProcessor };

export const INTERNAl_FILES: FileEntry[] = [
  {
    key: "unsafe_passwords.txt",
    value: (filename, content) => {
      if (typeof content === "string") {
        textSets[filename] = new Set(
          content
            .split("\n")
            .map(l => l.trim())
            .filter(l => l && l !== "****")
        );
      } else {
        fileBlobs[filename] = new File([content], filename);
      }
    }
  }
]

export async function loadInternalFiles(client: Client, entries: FileEntry[]) {
  for (const { key: filename, value: callback } of entries) {
    const stream = await client.getObject(BUCKETS.INTERNAL_FILES, filename);
    const webStream = nodeToWebStream(stream);

    const ext = extname(filename).toLowerCase();
    let content: string | Uint8Array;

    if ([".txt", ".json", ".csv"].includes(ext)) {
      content = await Bun.readableStreamToText(webStream);
    } else {
      const buffer = await Bun.readableStreamToArrayBuffer(webStream);
      content = new Uint8Array(buffer);
    }

    callback(filename, content);

    logger
      .child({ name: "minio" })
      .info(`Loaded ${filename} (${ext || "no extension"}) — type: ${typeof content}`);
  }
}
