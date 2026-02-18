import { Buffer } from "buffer";
export default class BufferHelper {
    constructor() {
        this.concat = (buffer) => {
            this.buffers.push(buffer);
            this.size += buffer.length;
            return this;
        };
        this.empty = () => {
            this.buffers = [];
            this.size = 0;
            return this;
        };
        this.toBuffer = () => Buffer.concat(this.buffers, this.size);
        this.toString = (encoding) => this.toBuffer().toString(encoding);
        this.load = (stream, callback) => {
            stream.on("data", (trunk) => {
                this.concat(trunk);
            });
            stream.on("end", () => {
                callback(null, this.toBuffer());
            });
            stream.once("error", callback);
        };
        this.buffers = [];
        this.size = 0;
    }
    get length() {
        return this.size;
    }
}
//# sourceMappingURL=buffer-helper.js.map