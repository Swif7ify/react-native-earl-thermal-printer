import { Buffer } from "buffer";

export default class BufferHelper {
  buffers: Buffer[];
  size: number;

  constructor() {
    this.buffers = [];
    this.size = 0;
  }

  get length() {
    return this.size;
  }

  concat = (buffer: Buffer): BufferHelper => {
    this.buffers.push(buffer);
    this.size += buffer.length;
    return this;
  };

  empty = (): BufferHelper => {
    this.buffers = [];
    this.size = 0;
    return this;
  };

  toBuffer = (): Buffer => Buffer.concat(this.buffers, this.size);

  toString = (encoding: string): string =>
    this.toBuffer().toString(encoding as any);

  load = (stream: any, callback: any) => {
    stream.on("data", (trunk: Buffer) => {
      this.concat(trunk);
    });
    stream.on("end", () => {
      callback(null, this.toBuffer());
    });
    stream.once("error", callback);
  };
}
