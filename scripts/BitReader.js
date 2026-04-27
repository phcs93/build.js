Build.Scripts.BitReader = class BitReader {

    constructor(number, bits = 32) {
        const mask = bits === 32 ? 0xFFFFFFFF : (1 << bits) - 1
        this.value = number & mask;
        this.index = 0;
    }

    uint(bits) {
        const mask = bits === 32 ? 0xFFFFFFFF : (1 << bits) - 1;
        const val = (this.value >>> this.index) & mask;
        this.index += bits;
        return val;
    }

    int(bits) {
        const val = this.uint(bits);
        const shift = 32 - bits;
        return (val << shift) >> shift;
    }

}