Build.Scripts.ByteReader = class ByteReader {

    constructor(bytes) {
        this.bytes = new Uint8Array(bytes);
        this.index = 0;
    }

    shift(n) { return this.bytes[this.index++] << n; }
    int8() { return (this.shift(0) << 24) >> 24; }
    int16() { return this.shift(0) | this.shift(8); }
    int32() { return this.shift(0) | this.shift(8) | this.shift(16) | this.shift(24); }
    uint8() { return this.int8() & 0xFF; }
    uint16() { return this.int16() & 0xFFFF; }
    uint32() { return this.int32() & 0xFFFFFFFF; }

    string(length) { return new Array(length).fill(0).map(() => String.fromCharCode(this.bytes[this.index++])).join("").replace(/\x00/g, ""); }

    read(length) { return this.bytes.slice(this.index, this.index += length); }

    // by chatgpt (based on kdfread from build engine code itself)
    kdfread(dasizeof, count) {

        const LZW = (() => { try { return require("../scripts/LZW.js"); } catch {} } )() ?? LZW;

        if (dasizeof > LZW.size) {
            count = count * dasizeof;
            dasizeof = 1;
        }

        const totalSize = dasizeof * count;
        const out = new Uint8Array(totalSize);

        let leng = this.uint16();
        let comp = this.read(leng);
        let lzw = LZW.uncompress(comp);
        let k = 0;
        let kgoal = lzw.length;

        out.set(lzw.subarray(0, dasizeof), 0);
        k += dasizeof;

        for (let i = 1; i < count; i++) {
            if (k >= kgoal) {
                leng = this.uint16();
                comp = this.read(leng);
                lzw = LZW.uncompress(comp);
                k = 0;
                kgoal = lzw.length;
            }

            const prevBase = (i - 1) * dasizeof;
            const currBase = i * dasizeof;

            for (let j = 0; j < dasizeof; j++) {
                out[currBase + j] =
                    (out[prevBase + j] + lzw[k + j]) & 0xFF;
            }

            k += dasizeof;
        }

        return out;

    }

}