ByteReader = (() => { try { return require("../../scripts/ByteReader.js"); } catch {} } )() ?? ByteReader;
ByteWriter = (() => { try { return require("../../scripts/ByteWriter.js"); } catch {} } )() ?? ByteWriter;

// reference: https://github.com/camoto-project/gamearchivejs/blob/master/formats/arc-rff-blood-common.js
class RFF {

    // sizes
    static headerSize = 32;
    static fileHeaderSize = 48;

    // reference: https://github.com/camoto-project/gamecompjs/blob/master/formats/enc-xor-blood.js
    static decrypt = (bytes, options) => {

        const output = Uint8Array.from(bytes);
        const offset = parseInt(options.offset || 0);
        const seed = parseInt(options.seed || 0);
        const limit = options.limit === undefined ? 256 : parseInt(options.limit);
        const length = limit === 0 ? bytes.length : Math.min(limit, bytes.length);

        for (let i = 0; i < length; i++) {
            output[i] ^= seed + ((i + offset) >> 1);
        }

        return output;

    };

    // we can use the same algorithm since the encryption is symmetrical
    static encrypt = (bytes, options) => RFF.decrypt(bytes, options);

    // util
    static toUnixTime = d => d.valueOf() / 1000 - new Date().getTimezoneOffset() * 60;

    constructor (bytes) {

        // create byte reader
        const reader = new ByteReader(bytes);

        // read RFF\x1a signature
        this.Signature = reader.string(4);

        // read version
        // 0x0200 - shareware 0.99 (CD version) - FAT is not encrypted
        // 0x0300 - registered 1.00 - FAT is encrypted
        // 0x0301 - patches for registered and later shareware releases - FAT is encrypted
        this.Version = reader.uint16();

        // unused
        this.Padding1 = reader.read(2);

        // read fat offset (file headers offset)
        this.Offset = reader.uint32();

        // read number of files
        this.Files = new Array(reader.uint32());

        // unused
        this.Padding2 = reader.read(16);

        // decrypt chunk of file headers bytes (these are located AFTER the file contents)
        const fileHeadersBytes = RFF.decrypt(reader.bytes.slice(this.Offset, this.Offset + this.Files.length * RFF.fileHeaderSize), {
            seed: this.Offset & 0xFF,
            offset: 0,
            limit: 0
        });

        // create file header reader
        const fileHeaderReader = new ByteReader(fileHeadersBytes);

        // read files headers
        for (let i = 0; i < this.Files.length; i++) {
            this.Files[i] = {
                cache: fileHeaderReader.read(16),
                offset: fileHeaderReader.uint32(),
                size: fileHeaderReader.uint32(),
                packedSize: fileHeaderReader.uint32(),
                time: fileHeaderReader.uint32(),
                flags: fileHeaderReader.uint8(),
                type: fileHeaderReader.string(3),
                name: fileHeaderReader.string(8),
                id: fileHeaderReader.uint32(),
                bytes: []
            };
            // just for better readability -> this needs to be undone when writing back
            this.Files[i].name += `.${this.Files[i].type}`;
        }

        // read files contents
        for (let i = 0; i < this.Files.length; i++) {
            const bytes = reader.bytes.slice(this.Files[i].offset, this.Files[i].offset + this.Files[i].size);
            this.Files[i].bytes = (this.Files[i].flags & 16) ? RFF.decrypt(bytes, { seed: 0, offset: 0, limit: 256 }) : bytes;
        }

    }

    // serialize function
    Serialize = () => {

        // file content size offsets (initialize pointing to after the rff header)
        let offset = RFF.headerSize;

        // encrypt file contents before performing any calculations
        for (let i = 0; i < this.Files.length; i++) {
            this.Files[i].flags |= 16;
            this.Files[i].bytes = (this.Files[i].flags & 16) ? RFF.encrypt(this.Files[i].bytes, { seed: 0, offset: 0, limit: 256 }) : this.Files[i].bytes;
            this.Files[i].size = this.Files[i].bytes.length;
            this.Files[i].offset = offset;
            offset += this.Files[i].size;
        }

        // create byte writer
        const writer = new ByteWriter(RFF.headerSize + this.Files.reduce((sum, f) => sum += f.size , 0) + this.Files.length * RFF.fileHeaderSize);

        // write RFF\x1A signature
        writer.string(this.Signature, 4);

        // write version
        // 0x0200 - shareware 0.99 (CD version) - FAT is not encrypted
        // 0x0300 - registered 1.00 - FAT is encrypted
        // 0x0301 - patches for registered and later shareware releases - FAT is encrypted
        writer.int16(this.Version);

        // unused
        writer.write(this.Padding1);

        // write fat offset (file headers offset)
        writer.int32(RFF.headerSize + this.Files.reduce((sum, f) => sum += f.size , 0));

        // write number of files
        writer.int32(this.Files.length);

        // unused
        writer.write(this.Padding2);                

        // write file contents
        for (let i = 0; i < this.Files.length; i++) {            
            writer.write(this.Files[i].bytes);
            //const bytes = this.Files[i].flags & 16 ? encrypt(this.Files[i].bytes, { seed: 0, offset: 0, limit: 256 }) : this.Files[i].bytes;
            //writer.write(bytes);
            //this.Files[i].offset = offset;
            // this needs to be calculated here because of the encryption
            //offset += bytes.length;
        }

        // create file header writer
        const fileHeaderWriter = new ByteWriter(this.Files.length * RFF.fileHeaderSize);

        // write files headers
        for (let i = 0; i < this.Files.length; i++) {
            fileHeaderWriter.write(this.Files[i].cache || new Uint8Array(16).fill(0)); // unused
            fileHeaderWriter.int32(this.Files[i].offset);
            fileHeaderWriter.int32(this.Files[i].size);
            fileHeaderWriter.int32(this.Files[i].packedSize); // packed size
            fileHeaderWriter.int32(this.Files[i].time || RFF.toUnixTime(new Date())); // last modified
            fileHeaderWriter.int8(this.Files[i].flags);
            fileHeaderWriter.string(this.Files[i].name.split(".")[1], 3); // extension
            fileHeaderWriter.string(this.Files[i].name.split(".")[0], 8); // name
            fileHeaderWriter.int32(this.Files[i].id || 0);
        }

        // encrypt chunks of file headers
        writer.write(RFF.encrypt(fileHeaderWriter.bytes, {
            seed: offset & 0xFF,
            offset: 0,
            limit: 0
        }));

        return writer.bytes;

    }

}

try { module.exports = RFF; } catch {}