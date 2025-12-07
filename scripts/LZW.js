function compress(data) {
    const uncompleng = data.length;

    const lzwbuf1 = new Uint8Array(65536);
    const lzwbuf2 = new Int32Array(65536);
    const lzwbuf3 = new Int32Array(65536);

    const outbuf = new Uint8Array(uncompleng + 4096);

    // init
    for (let i = 255; i >= 0; i--) {
        lzwbuf1[i] = i;
        lzwbuf3[i] = (i + 1) & 255;
        lzwbuf2[i] = -1;
    }

    let addrcnt = 256;
    let bytecnt1 = 0;
    let bitcnt = 32; // header ocupa 4 bytes = 32 bits
    let numbits = 8;
    let oneupnumbits = 1 << 8;

    function writeCode(code) {
        const bytePos = bitcnt >> 3;
        const shift = bitcnt & 7;

        let v =
            outbuf[bytePos] |
            (outbuf[bytePos + 1] << 8) |
            (outbuf[bytePos + 2] << 16) |
            (outbuf[bytePos + 3] << 24);

        v |= (code << shift);

        outbuf[bytePos]     = v & 0xFF;
        outbuf[bytePos + 1] = (v >>> 8) & 0xFF;
        outbuf[bytePos + 2] = (v >>> 16) & 0xFF;
        outbuf[bytePos + 3] = (v >>> 24) & 0xFF;

        bitcnt += numbits;

        if ((code & ((oneupnumbits >> 1) - 1)) > ((addrcnt - 1) & ((oneupnumbits >> 1) - 1)))
            bitcnt--;
    }

    while (bytecnt1 < uncompleng && bitcnt < (uncompleng << 3)) {
        let addr = data[bytecnt1];

        while (true) {
            bytecnt1++;
            if (bytecnt1 === uncompleng) break;

            if (lzwbuf2[addr] < 0) {
                lzwbuf2[addr] = addrcnt;
                break;
            }

            let newaddr = lzwbuf2[addr];

            while (lzwbuf1[newaddr] !== data[bytecnt1]) {
                const zx = lzwbuf3[newaddr];
                if (zx < 0) {
                    lzwbuf3[newaddr] = addrcnt;
                    break;
                }
                newaddr = zx;
            }

            if (lzwbuf3[newaddr] === addrcnt) break;

            addr = newaddr;
        }

        lzwbuf1[addrcnt] = (bytecnt1 < uncompleng) ? data[bytecnt1] : 0;
        lzwbuf2[addrcnt] = -1;
        lzwbuf3[addrcnt] = -1;

        writeCode(addr);

        addrcnt++;
        if (addrcnt > oneupnumbits) {
            numbits++;
            oneupnumbits <<= 1;
        }
    }

    writeCode(data[uncompleng - 1]);

    // escreve header
    const dv = new DataView(outbuf.buffer);
    dv.setUint16(0, uncompleng, true);  // tamanho descomprimido

    const finalLen = (bitcnt + 7) >> 3;

    if (finalLen < uncompleng) {
        dv.setUint16(2, addrcnt, true); // strtot
        return outbuf.slice(0, finalLen);
    }

    // fallback: sem compressão
    dv.setUint16(2, 0, true);

    const out = new Uint8Array(uncompleng + 4);
    out.set(outbuf.slice(0, 4));
    out.set(data, 4);

    return out;
}

function uncompress(data) {
    const uncompleng = data[0] | (data[1] << 8);
    const strtot      = data[2] | (data[3] << 8);

    // Se não comprimido
    if (strtot === 0) {
        return data.slice(4, 4 + uncompleng);
    }

    const lzwbuf1 = new Uint8Array(65536);
    const lzwbuf2 = new Int16Array(65536);
    const lzwbuf3 = new Int16Array(65536);

    for (let i = 0; i < 256; i++) {
        lzwbuf2[i] = i;
        lzwbuf3[i] = i;
    }

    let out = new Uint8Array(uncompleng);
    let outbytecnt = 0;

    let currstr = 256;
    let bitcnt = 32;

    let numbits = 8;
    let oneupnumbits = 1 << 8;

    function readCode() {
        const bytePos = bitcnt >> 3;
        const bitOff  = bitcnt & 7;

        const v =
            data[bytePos] |
            (data[bytePos + 1] << 8) |
            (data[bytePos + 2] << 16) |
            (data[bytePos + 3] << 24);

        let dat = (v >>> bitOff) & (oneupnumbits - 1);

        bitcnt += numbits;

        if ((dat & ((oneupnumbits >> 1) - 1)) > ((currstr - 1) & ((oneupnumbits >> 1) - 1))) {
            dat &= ((oneupnumbits >> 1) - 1);
            bitcnt--;
        }

        return dat;
    }

    while (currstr < strtot) {
        let dat = readCode();

        lzwbuf3[currstr] = dat;

        let stackLen = 0;
        let tmp = dat;

        while (tmp >= 256) {
            lzwbuf1[stackLen++] = lzwbuf2[tmp];
            tmp = lzwbuf3[tmp];
        }

        out[outbytecnt++] = tmp;

        for (let i = stackLen - 1; i >= 0; i--) {
            out[outbytecnt++] = lzwbuf1[i];
        }

        lzwbuf2[currstr - 1] = tmp;
        lzwbuf2[currstr] = tmp;

        currstr++;

        if (currstr > oneupnumbits) {
            numbits++;
            oneupnumbits <<= 1;
        }
    }

    return out;
}

try { module.exports = { compress, uncompress }; } catch {}