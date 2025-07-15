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

}

try { module.exports = ByteReader; } catch {}