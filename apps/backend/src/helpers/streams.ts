import type { Readable } from "node:stream";

export function nodeToWebStream(nodeStream: Readable): ReadableStream<Uint8Array> {
	const reader = nodeStream[Symbol.asyncIterator]();

	return new ReadableStream({
		async pull(controller) {
			const { done, value } = await reader.next();

			if (done) {
				controller.close();
			} else {
				controller.enqueue(value);
			}
		},
		cancel() {
			reader.return?.();
		},
	});
}

export async function blobToUint8Array(blob: globalThis.Blob | Blob): Promise<Uint8Array> {
	const buffer = await blob.arrayBuffer();
	return new Uint8Array(buffer);
}
