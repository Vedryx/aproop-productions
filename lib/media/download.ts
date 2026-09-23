import { Readable } from "node:stream";

export function downloadBody(stream: Readable & { abort(): Promise<void> }) {
  // Destroying a Node stream alone does not close GridFS's Mongo cursor.
  stream.once("close", () => {
    if (!stream.readableEnded) void stream.abort().catch(() => {});
  });
  return Readable.toWeb(stream, {
    strategy: { highWaterMark: 64 * 1024, size: (chunk: Uint8Array) => chunk.byteLength },
  }) as ReadableStream<Uint8Array>;
}
