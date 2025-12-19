class ByteWriter {
    
    constructor(length) {
        this.bytes = new Uint8Array(length);
        this.index = 0;
    }

    // using .set is incredibly fast and necessary otherwise we would get a stack overflow
    write(bytes) { this.bytes.set(bytes, this.index); this.index += bytes.length; }
    int8(v) { this.write([v & 0xFF]); }
    int16(v) { this.write([v & 0xFF, (v >> 8) & 0xFF]); }
    int32(v) { this.write([v & 0xFF, (v >> 8) & 0xFF, (v >> 16) & 0xFF, (v >> 24) & 0xFF]); }
    string(string, length) { this.write([...string.padEnd(length, "\0").slice(0, length)].map(c => c.charCodeAt(0))); }

    // by chatgpt (based on dfread from build engine code itself)
    dfwrite(buffer, dasizeof, count) {

        if (!buffer || count <= 0) return;

        let ptr;
        if (buffer instanceof Uint8Array) ptr = buffer;
        else if (buffer.buffer instanceof ArrayBuffer) ptr = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        else if (buffer instanceof ArrayBuffer) ptr = new Uint8Array(buffer);
        else ptr = Uint8Array.from(buffer);

        const LZW = (() => { try { return require("../scripts/LZW.js"); } catch {} })() ?? LZW;

        if (dasizeof > LZW.size) { count *= dasizeof; dasizeof = 1; }

        const diffBuf = new Uint8Array(LZW.size);
        let k = 0;

        const compressChunk = () => {
            if (k <= 0) return;
            const comp = LZW.compress(diffBuf.subarray(0, k));
            this.int16(comp.length);
            this.write(comp);
            k = 0;
        };

        diffBuf.set(ptr.subarray(0, dasizeof), 0);
        k = dasizeof;

        if (k > LZW.size - dasizeof) compressChunk();

        for (let i = 1; i < count; i++) {
            const prevBase = (i - 1) * dasizeof;
            const currBase = i * dasizeof;
            for (let j = 0; j < dasizeof; j++) diffBuf[k + j] = (ptr[currBase + j] - ptr[prevBase + j]) & 0xFF;
            k += dasizeof;
            if (k > LZW.size - dasizeof) compressChunk();
        }

        compressChunk();

    }

}

try { module.exports = ByteWriter; } catch {}