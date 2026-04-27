Build.Scripts.BitWriter = class BitWriter {

    constructor() {
        this.value = 0 >>> 0;
        this.index = 0;
    }

    uint(bits, value) {
        const mask = (1 << bits) - 1;
        this.value = (this.value & ~(mask << this.index)) | ((value & mask) << this.index);
        this.index += bits;
    }

    int(bits, value) {
        this.uint(bits, value);
    }

}