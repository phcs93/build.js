// reference: https://github.com/camoto-project/gamearchivejs/blob/master/formats/arc-rff-blood-common.js
Build.Models.Storage.RFF = class RFF extends Build.Models.Storage {

    // sizes
    static HeaderSize = 32;
    static FileHeaderSize = 48;

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

    // create empty rff object
    constructor() {
        super();
        this.Signature = "RFF\x1A";
        this.Version = 0;
        this.Padding1 = new Uint8Array(2).fill(0);
        this.Offset = 0;
        this.Files = [];
        this.Padding2 = new Uint8Array(16).fill(0);        
    }

    // transform byte array into rff object
    static Unserialize (bytes) {

        // create empty rff object
        const rff = new RFF();

        // create byte reader
        const reader = new Build.Scripts.ByteReader(bytes);

        // read RFF\x1a signature
        rff.Signature = reader.string(4);

        // read version
        // 0x0200 - shareware 0.99 (CD version) - FAT is not encrypted
        // 0x0300 - registered 1.00 - FAT is encrypted
        // 0x0301 - patches for registered and later shareware releases - FAT is encrypted
        rff.Version = reader.uint16();

        // unused
        rff.Padding1 = reader.read(2);

        // read fat offset (file headers offset)
        rff.Offset = reader.uint32();

        // read number of files
        rff.Files = new Array(reader.uint32());

        // unused
        rff.Padding2 = reader.read(16);

        // decrypt chunk of file headers bytes (these are located AFTER the file contents)
        const fileHeadersBytes = RFF.decrypt(reader.bytes.slice(rff.Offset, rff.Offset + rff.Files.length * RFF.FileHeaderSize), {
            seed: rff.Offset & 0xFF,
            offset: 0,
            limit: 0
        });

        // create file header reader
        const fileHeaderReader = new Build.Scripts.ByteReader(fileHeadersBytes);

        // read files headers
        for (let i = 0; i < rff.Files.length; i++) {
            rff.Files[i] = {
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
            rff.Files[i].name += `.${rff.Files[i].type}`;
        }

        // read files contents
        for (let i = 0; i < rff.Files.length; i++) {
            const bytes = reader.bytes.slice(rff.Files[i].offset, rff.Files[i].offset + rff.Files[i].size);
            rff.Files[i].bytes = (rff.Files[i].flags & 16) ? RFF.decrypt(bytes, { seed: 0, offset: 0, limit: 256 }) : bytes;
        }

        // return filled rff object
        return rff;

    }

    // transform rff object into byte array
    static Serialize (rff) {

        // file content size offsets (initialize pointing to after the rff header)
        let offset = RFF.HeaderSize;

        // encrypt file contents before performing any calculations
        for (let i = 0; i < rff.Files.length; i++) {
            rff.Files[i].flags |= 16;
            rff.Files[i].bytes = (rff.Files[i].flags & 16) ? RFF.encrypt(rff.Files[i].bytes, { seed: 0, offset: 0, limit: 256 }) : rff.Files[i].bytes;
            rff.Files[i].size = rff.Files[i].bytes.length;
            rff.Files[i].offset = offset;
            offset += rff.Files[i].size;
        }

        // create byte writer
        const writer = new Build.Scripts.ByteWriter(
            RFF.HeaderSize + 
            rff.Files.reduce((sum, f) => sum += f.size , 0) + 
            rff.Files.length * RFF.FileHeaderSize
        );

        // write RFF\x1A signature
        writer.string(rff.Signature, 4);

        // write version
        // 0x0200 - shareware 0.99 (CD version) - FAT is not encrypted
        // 0x0300 - registered 1.00 - FAT is encrypted
        // 0x0301 - patches for registered and later shareware releases - FAT is encrypted
        writer.int16(rff.Version);

        // unused
        writer.write(rff.Padding1);

        // write fat offset (file headers offset)
        writer.int32(RFF.HeaderSize + rff.Files.reduce((sum, f) => sum += f.size , 0));

        // write number of files
        writer.int32(rff.Files.length);

        // unused
        writer.write(rff.Padding2);                

        // write file contents
        for (let i = 0; i < rff.Files.length; i++) {            
            writer.write(rff.Files[i].bytes);
            //const bytes = rff.Files[i].flags & 16 ? encrypt(rff.Files[i].bytes, { seed: 0, offset: 0, limit: 256 }) : rff.Files[i].bytes;
            //writer.write(bytes);
            //rff.Files[i].offset = offset;
            // this needs to be calculated here because of the encryption
            //offset += bytes.length;
        }

        // create file header writer
        const fileHeaderWriter = new Build.Scripts.ByteWriter(rff.Files.length * RFF.FileHeaderSize);

        // write files headers
        for (let i = 0; i < rff.Files.length; i++) {
            fileHeaderWriter.write(rff.Files[i].cache || new Uint8Array(16).fill(0)); // unused
            fileHeaderWriter.int32(rff.Files[i].offset);
            fileHeaderWriter.int32(rff.Files[i].size);
            fileHeaderWriter.int32(rff.Files[i].packedSize); // packed size
            fileHeaderWriter.int32(rff.Files[i].time || RFF.toUnixTime(new Date())); // last modified
            fileHeaderWriter.int8(rff.Files[i].flags);
            fileHeaderWriter.string(rff.Files[i].name.split(".")[1], 3); // extension
            fileHeaderWriter.string(rff.Files[i].name.split(".")[0], 8); // name
            fileHeaderWriter.int32(rff.Files[i].id || 0);
        }

        // encrypt chunks of file headers
        writer.write(RFF.encrypt(fileHeaderWriter.bytes, {
            seed: offset & 0xFF,
            offset: 0,
            limit: 0
        }));

        // return bytes
        return writer.bytes;

    }

}