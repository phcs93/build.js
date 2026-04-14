Build.Scripts.ByteWriter = class ByteWriter {

    // private attributes
    #bytes = new Uint8Array(1024);
    #index = 0;

    // getters here to protect bytes and index from being modified from the outside
    get bytes() { return this.#bytes.slice(0, this.#index); }
    get index() { return this.#index; }

    // this function ensures that the internal byte array has necessary size
    #ensure(incoming) {

        // if incoming bytes fit in the array -> do nothing
        if (this.#index + incoming <= this.#bytes.length) return;

        // set variable to calculate new size
        let capacity = this.#bytes.length;

        // while capacity can't fit incoming bytes
        while (capacity < this.#index + incoming) {

            // double the capacity
            capacity *= 2;

        }

        // create new buffer array
        const bytes = new Uint8Array(capacity);

        // copy only used bytes from old buffer
        bytes.set(this.#bytes.subarray(0, this.#index), 0);

        // set new buffer
        this.#bytes = bytes;

    }

    // write incoming bytes to internal buffer
    write(bytes) {

        // ensure internal buffer size
        this.#ensure(bytes.length);

        // using .set is incredibly fast and necessary otherwise we would get a stack overflow
        this.#bytes.set(bytes, this.#index); this.#index += bytes.length;

    }

    // type helpers
    int8(v) { this.write([v & 0xFF]); }
    int16(v) { this.write([v & 0xFF, (v >> 8) & 0xFF]); }
    int32(v) { this.write([v & 0xFF, (v >> 8) & 0xFF, (v >> 16) & 0xFF, (v >> 24) & 0xFF]); }
    string(string, length) { this.write([...string.padEnd(length, "\0").slice(0, length)].map(c => c.charCodeAt(0))); }

    // by chatgpt (based on dfwrite from build engine code itself)
    dfwrite(buffer, dasizeof, count) {

        if (!buffer || count <= 0) return;

        let ptr;
        if (buffer instanceof Uint8Array) ptr = buffer;
        else if (buffer.buffer instanceof ArrayBuffer) ptr = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        else if (buffer instanceof ArrayBuffer) ptr = new Uint8Array(buffer);
        else ptr = Uint8Array.from(buffer);

        if (dasizeof > Build.Scripts.LZW.size) { count *= dasizeof; dasizeof = 1; }

        const diffBuf = new Uint8Array(Build.Scripts.LZW.size);
        let k = 0;

        const compressChunk = () => {
            if (k <= 0) return;
            const comp = Build.Scripts.LZW.compress(diffBuf.subarray(0, k));
            this.int16(comp.length);
            this.write(comp);
            k = 0;
        };

        diffBuf.set(ptr.subarray(0, dasizeof), 0);
        k = dasizeof;

        if (k > Build.Scripts.LZW.size - dasizeof) compressChunk();

        for (let i = 1; i < count; i++) {
            const prevBase = (i - 1) * dasizeof;
            const currBase = i * dasizeof;
            for (let j = 0; j < dasizeof; j++) diffBuf[k + j] = (ptr[currBase + j] - ptr[prevBase + j]) & 0xFF;
            k += dasizeof;
            if (k > Build.Scripts.LZW.size - dasizeof) compressChunk();
        }

        compressChunk();

    }

}