function ByteWriter (length) {

    this.bytes = new Uint8Array(length);
    this.index = 0;

    this.write = bytes => {
        this.bytes.set(bytes, this.index);
        this.index += bytes.length;
    };

    this.int8 = v => this.write(v & 0xFF);
    this.int16 = v => this.write([v & 0xFF, (v >> 8) & 0xFF]);
    this.int32 = v => this.write([v & 0xFF, (v >> 8) & 0xFF, (v >> 16) & 0xFF, (v >> 24) & 0xFF]);

    this.writeString = string => this.write([...Array.from(string, c => c.charCodeAt(0))]);

}

try { module.exports = ByteWriter; } catch {}