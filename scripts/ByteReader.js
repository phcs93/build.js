function ByteReader (bytes) {

    this.bytes = new Uint8Array(bytes);
    this.index = 0;

    const shift = n => this.bytes[this.index++] << n;

    this.int8 = () => (shift(0) << 24) >> 24;
    this.int16 = () => shift(0)|shift(8);
    this.int32 = () => shift(0)|shift(8)|shift(16)|shift(24);

    this.uint8 = () => this.int8() & 0xFF;
    this.uint16 = () => this.int16() & 0xFFFF;
    this.uint32 = () => this.int32() & 0xFFFFFFFF;

    this.string = length => new Array(length).fill(0).map(() => String.fromCharCode(this.bytes[this.index++])).join("").replace(/\x00/g, "");

    this.read = length => this.bytes.slice(this.index, this.index += length);

    // by chatgpt
    this.kdfread = (dasizeof, count) => {

        const LWZ = (() => { try { return require("../scripts/LZW.js"); } catch {} } )() ?? LWZ;

        const LZWSIZE = 16384;

        if (dasizeof > LZWSIZE) {
            count = count * dasizeof;
            dasizeof = 1;
        }

        const totalSize = dasizeof * count;
        const out = new Uint8Array(totalSize);

        let leng = this.uint16();
        let comp = this.read(leng);
        let lzw = LWZ.uncompress(comp);
        let k = 0;
        let kgoal = lzw.length;

        out.set(lzw.subarray(0, dasizeof), 0);
        k += dasizeof;

        for (let i = 1; i < count; i++) {

            if (k >= kgoal) {
                leng = this.uint16();
                comp = this.read(leng);
                lzw = LWZ.uncompress(comp);
                k = 0;
                kgoal = lzw.length;
            }

            const prevBase = (i - 1) * dasizeof;
            const currBase = i * dasizeof;

            for (let j = 0; j < dasizeof; j++) {
                out[currBase + j] = (out[prevBase + j] + lzw[k + j]) & 0xFF;
            }

            k += dasizeof;

        }

        return out;

    }

}

try { module.exports = ByteReader; } catch {}